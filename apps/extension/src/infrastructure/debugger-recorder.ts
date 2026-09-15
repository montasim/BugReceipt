import type { CaptureSession, NetworkEvent } from '@bugreceipt/capture-model';

type Source = { tabId?: number; sessionId?: string };
type Diagnostic = CaptureSession['diagnostics'][number];
type Sink = {
  diagnostic: (sessionId: string, event: Diagnostic) => void;
  network: (sessionId: string, event: NetworkEvent) => void;
  warning: (sessionId: string, message: string) => void;
};
type RequestState = { event: NetworkEvent; started: number; bytes: number; mime: string };
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const number = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const bounded = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 14)}\n[TRUNCATED]` : value;

function remoteValue(raw: unknown): string {
  const value = object(raw);
  if ('value' in value)
    return typeof value.value === 'string' ? value.value : JSON.stringify(value.value);
  const preview = object(value.preview);
  const properties = array(preview.properties).map((rawProperty) => {
    const property = object(rawProperty);
    const key = text(property.name);
    return `${key}: ${/auth|token|password|secret|cookie|session|api[-_]?key/i.test(key) ? '[REDACTED]' : text(property.value) || text(property.type)}`;
  });
  return properties.length
    ? `${text(value.description)} {${properties.join(', ')}${preview.overflow ? ', …' : ''}}`
    : text(value.unserializableValue) || text(value.description) || text(value.type);
}
function stackTrace(raw: unknown, depth = 0): string {
  if (depth > 5) return '';
  const stack = object(raw);
  return [
    ...array(stack.callFrames).map((rawFrame) => {
      const frame = object(rawFrame);
      return `at ${text(frame.functionName) || '(anonymous)'} (${text(frame.url)}:${number(frame.lineNumber) + 1}:${number(frame.columnNumber) + 1})`;
    }),
    ...(stack.parent ? [stackTrace(stack.parent, depth + 1)] : []),
  ].join('\n');
}

/** One debugger attachment survives document replacement; child sessions cover OOPIFs/workers. */
export class DebuggerRecorder {
  private tabId: number | undefined;
  private sessionId = '';
  private startedAt = 0;
  private requests = new Map<string, RequestState>();
  private bodies = new Set<Promise<void>>();
  private children = new Set<Promise<void>>();
  constructor(private readonly sink: Sink) {}

  private command(
    source: Source,
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<object | undefined> {
    return chrome.debugger.sendCommand(source, method, params);
  }

  async start(tabId: number, sessionId: string): Promise<void> {
    if (this.tabId !== undefined) throw new Error('Browser evidence recording is already active.');
    await chrome.debugger.attach({ tabId }, '1.3');
    this.tabId = tabId;
    this.sessionId = sessionId;
    this.startedAt = Date.now();
    try {
      await this.enable({ tabId });
    } catch (error) {
      await this.stop();
      throw new Error(
        `Browser evidence recording could not start: ${error instanceof Error ? error.message : 'debugger unavailable'}`,
        { cause: error },
      );
    }
  }

  private async enable(source: Source): Promise<void> {
    await this.command(source, 'Runtime.enable');
    await this.command(source, 'Network.enable', {
      maxTotalBufferSize: 2_000_000,
      maxResourceBufferSize: 65_536,
      maxPostDataSize: 16_384,
    });
    // Some worker targets do not implement Log; Runtime still supplies their console/errors.
    await this.command(source, 'Log.enable').catch(() => undefined);
    await this.command(source, 'Target.setAutoAttach', {
      autoAttach: true,
      waitForDebuggerOnStart: true,
      flatten: true,
      filter: [
        { type: 'iframe' },
        { type: 'worker' },
        { type: 'shared_worker' },
        { type: 'service_worker' },
        { exclude: true },
      ],
    });
  }

  async event(source: Source, method: string, raw: unknown): Promise<void> {
    if (this.tabId === undefined || source.tabId !== this.tabId) return;
    const sessionId = this.sessionId;
    const params = object(raw);
    if (method === 'Target.attachedToTarget') {
      const child = { tabId: this.tabId, sessionId: text(params.sessionId) };
      const task = this.enable(child)
        .catch((error: unknown) => {
          // Reload may destroy an old child between auto-attach and domain setup.
          if (
            error instanceof Error &&
            /Session with given id not found|No target with given id/.test(error.message)
          )
            return;
          this.sink.warning(
            sessionId,
            `Some embedded frame or worker evidence could not be enabled: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        })
        .finally(async () => {
          // Never leave the page's worker/frame paused, even if a domain is unsupported.
          await this.command(child, 'Runtime.runIfWaitingForDebugger').catch(() => undefined);
        });
      this.children.add(task);
      await task.finally(() => this.children.delete(task));
      return;
    }
    if (method === 'Target.detachedFromTarget') {
      this.flushRequests(
        `${text(params.sessionId)}:`,
        'Target closed while request was still in progress.',
      );
      return;
    }
    if (
      method === 'Runtime.consoleAPICalled' ||
      method === 'Runtime.exceptionThrown' ||
      method === 'Log.entryAdded'
    ) {
      const entry = method === 'Log.entryAdded' ? object(params.entry) : params;
      const timestamp = number(entry.timestamp, Date.now());
      if (timestamp < this.startedAt) return; // Runtime.enable may replay historical console entries.
      const exception = object(params.exceptionDetails);
      const isException = method === 'Runtime.exceptionThrown';
      const kind = isException
        ? text(exception.text).includes('promise')
          ? 'unhandled-rejection'
          : 'uncaught-error'
        : 'console';
      const rawLevel = isException ? 'error' : text(entry.level) || text(params.type);
      const level = ['error', 'assert'].includes(rawLevel)
        ? 'error'
        : ['warning', 'warn'].includes(rawLevel)
          ? 'warn'
          : rawLevel === 'debug' || rawLevel === 'verbose'
            ? 'debug'
            : rawLevel === 'info'
              ? 'info'
              : 'log';
      const consoleTypeAliases: Record<string, string> = {
        warning: 'warn',
        startGroup: 'group',
        startGroupCollapsed: 'groupCollapsed',
        endGroup: 'groupEnd',
      };
      const rawType = text(params.type);
      const consoleType =
        method === 'Runtime.consoleAPICalled'
          ? (consoleTypeAliases[rawType] ?? rawType) || level
          : level;
      const message = isException
        ? remoteValue(exception.exception) || text(exception.text)
        : method === 'Log.entryAdded'
          ? `${text(entry.text)}${entry.url ? ` (${text(entry.url)})` : ''}`
          : array(params.args).map(remoteValue).join(' ') || `[console.${text(params.type)}]`;
      const stack = stackTrace(isException ? exception.stackTrace : entry.stackTrace);
      this.sink.diagnostic(sessionId, {
        id: crypto.randomUUID(),
        occurredAt: new Date(timestamp).toISOString(),
        kind,
        level,
        consoleType: consoleType.slice(0, 50),
        message: bounded(message, 32_768),
        ...(stack ? { stack: bounded(stack, 32_768) } : {}),
      });
      return;
    }
    const requestId = text(params.requestId);
    if (!requestId) return;
    const key = `${source.sessionId ?? 'root'}:${requestId}`;
    let state = this.requests.get(key);
    if (method === 'Network.requestWillBeSent' || method === 'Network.webSocketCreated') {
      if (state && params.redirectResponse) {
        state.event.status = number(object(params.redirectResponse).status);
        this.publish(state, number(params.timestamp));
      }
      const request = object(params.request);
      state = {
        started: number(params.timestamp),
        bytes: 0,
        mime: '',
        event: {
          id: crypto.randomUUID(),
          occurredAt: new Date(number(params.wallTime, Date.now() / 1000) * 1000).toISOString(),
          method: bounded(text(request.method) || 'GET', 20),
          url: bounded(text(request.url) || text(params.url), 2_048),
          resourceType:
            method === 'Network.webSocketCreated'
              ? 'websocket'
              : text(params.type).toLowerCase() || 'other',
          durationMs: 0,
          ...(request.postData ? { requestBody: bounded(text(request.postData), 16_384) } : {}),
        },
      };
      // Bound in-memory pending requests as well as persisted evidence.
      if (this.requests.size >= 500) {
        const oldest = this.requests.keys().next().value;
        if (oldest) this.requests.delete(oldest);
        this.sink.warning(
          sessionId,
          'Pending request tracking reached its 500-request limit; some completion details are unavailable.',
        );
      }
      this.requests.set(key, state);
      this.publish(state);
      return;
    }
    if (!state) return;
    if (method === 'Network.webSocketWillSendHandshakeRequest') {
      state.started = number(params.timestamp);
      state.event.occurredAt = new Date(
        number(params.wallTime, Date.now() / 1000) * 1000,
      ).toISOString();
      this.publish(state);
      return;
    }
    if (
      method === 'Network.responseReceived' ||
      method === 'Network.webSocketHandshakeResponseReceived'
    ) {
      const response = object(params.response);
      state.event.status = Math.min(599, Math.max(0, number(response.status)));
      state.mime = text(response.mimeType);
      this.publish(state, number(params.timestamp));
    } else if (method === 'Network.dataReceived') {
      state.bytes += number(params.dataLength);
    } else if (method === 'Network.loadingFailed' || method === 'Network.webSocketFrameError') {
      state.event.error = bounded(
        [
          text(params.errorText),
          text(params.blockedReason),
          text(object(params.corsErrorStatus).corsError),
        ]
          .filter(Boolean)
          .join(' · '),
        2_000,
      );
      this.publish(state, number(params.timestamp));
      this.requests.delete(key);
    } else if (method === 'Network.loadingFinished') {
      this.publish(state, number(params.timestamp));
      this.requests.delete(key);
      const completed = state;
      if (
        completed.bytes > 32_768 ||
        !/json|text|xml|javascript|form-urlencoded/.test(completed.mime)
      )
        return;
      const task = this.command(source, 'Network.getResponseBody', { requestId })
        .then((result) => {
          const body = object(result);
          completed.event.responseBody = body.base64Encoded
            ? '[Binary body omitted]'
            : bounded(text(body.body), 32_768);
          this.sink.network(sessionId, { ...completed.event });
        })
        .catch(() => {
          completed.event.responseBody = '[Response body unavailable]';
          this.sink.network(sessionId, { ...completed.event });
        });
      this.bodies.add(task);
      void task.finally(() => this.bodies.delete(task));
    } else if (method === 'Network.webSocketClosed') {
      this.publish(state, number(params.timestamp));
      this.requests.delete(key);
    } else if (
      method === 'Network.webSocketFrameReceived' ||
      method === 'Network.webSocketFrameSent' ||
      method === 'Network.eventSourceMessageReceived'
    ) {
      const frame = object(params.response);
      const payload = params.data ?? frame.payloadData;
      this.sink.network(sessionId, {
        ...state.event,
        id: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        resourceType:
          method === 'Network.eventSourceMessageReceived'
            ? 'eventsource-message'
            : 'websocket-frame',
        method: method.endsWith('Sent') ? 'SEND' : 'RECEIVE',
        responseBody: bounded(text(payload), 32_768),
        durationMs: 0,
      });
    }
  }

  private publish(state: RequestState, timestamp?: number): void {
    if (timestamp !== undefined)
      state.event.durationMs = Math.min(3_600_000, Math.max(0, (timestamp - state.started) * 1000));
    this.sink.network(this.sessionId, { ...state.event });
  }
  private flushRequests(prefix: string, reason: string): void {
    for (const [key, state] of this.requests) {
      if (!key.startsWith(prefix)) continue;
      // Open sockets are expected to remain active when capture stops.
      if (state.event.resourceType !== 'websocket') state.event.error = reason;
      this.publish(state);
      this.requests.delete(key);
    }
  }
  detached(source: Source, reason: string): void {
    if (this.tabId === undefined || source.tabId !== this.tabId) return;
    this.flushRequests('', 'Browser disconnected while request was still in progress.');
    this.sink.warning(
      this.sessionId,
      `Browser evidence recording disconnected (${reason}). Console and network evidence after this point is missing. Start a new capture to reconnect.`,
    );
    this.tabId = undefined;
  }
  async stop(): Promise<void> {
    const tabId = this.tabId;
    await Promise.allSettled([...this.children]);
    this.flushRequests('', 'Capture stopped while request was still in progress.');
    this.tabId = undefined;
    if (tabId !== undefined) await chrome.debugger.detach({ tabId }).catch(() => undefined);
    await Promise.allSettled([...this.bodies]);
  }
}
