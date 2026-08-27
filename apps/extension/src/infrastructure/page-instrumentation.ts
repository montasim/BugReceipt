type RecorderState = { restore: () => void };

export function installBridge(sessionId: string): void {
  const scope = globalThis as typeof globalThis & { __reprokitBridgeCleanup?: () => void };
  scope.__reprokitBridgeCleanup?.();
  const listener = (event: MessageEvent<unknown>) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') return;
    const data = event.data as Record<string, unknown>;
    if (data.__reprokit !== true || data.sessionId !== sessionId) return;
    const type =
      data.type === 'diagnostic'
        ? 'diagnostic:append'
        : data.type === 'network'
          ? 'network:append'
          : null;
    if (!type) return;
    void chrome.runtime.sendMessage({ type, sessionId, event: data.event }).catch(() => undefined);
  };
  window.addEventListener('message', listener);
  scope.__reprokitBridgeCleanup = () => window.removeEventListener('message', listener);
}

export function uninstallBridge(): void {
  const scope = globalThis as typeof globalThis & { __reprokitBridgeCleanup?: () => void };
  scope.__reprokitBridgeCleanup?.();
  delete scope.__reprokitBridgeCleanup;
}

export function installRecorder(sessionId: string): void {
  const scope = globalThis as typeof globalThis & { __reprokitRecorder?: RecorderState };
  scope.__reprokitRecorder?.restore();

  const originalConsole = {
    debug: console.debug,
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  // These methods are restored to their exact original identities when capture stops.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalFetch = window.fetch;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalXhrSend = XMLHttpRequest.prototype.send;
  const xhrMetadata = new WeakMap<
    XMLHttpRequest,
    { occurredAt: string; startedAt: number; method: string; url: string; requestBody?: string }
  >();

  const serialize = (value: unknown, depth = 0, seen = new WeakSet<object>()): string => {
    if (depth > 4) return '[Max depth]';
    if (typeof value === 'string') return value.slice(0, 16_384);
    if (value instanceof Error)
      return `${value.name}: ${value.message}\n${value.stack ?? ''}`.slice(0, 32_768);
    if (value === null) return 'null';
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
      return String(value);
    if (typeof value === 'undefined') return 'undefined';
    if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
    if (typeof value === 'symbol') return value.toString();
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const record: Record<string, unknown> = {};
    let count = 0;
    for (const key of Object.keys(value).slice(0, 50)) {
      count += 1;
      if (/authorization|auth|token|password|secret|cookie|session|api[-_]?key/i.test(key)) {
        record[key] = '[REDACTED]';
        continue;
      }
      try {
        record[key] = serialize(Reflect.get(value, key), depth + 1, seen);
      } catch {
        record[key] = '[Unreadable]';
      }
    }
    if (Object.keys(value).length > count) record.__truncated = true;
    try {
      return JSON.stringify(record).slice(0, 32_768);
    } catch {
      return Object.prototype.toString.call(value);
    }
  };

  const serializeBody = (body: unknown): string | undefined => {
    if (body === undefined || body === null) return undefined;
    if (typeof body === 'string') return body.slice(0, 16_384);
    if (body instanceof URLSearchParams) return body.toString().slice(0, 16_384);
    if (body instanceof FormData) {
      const values: Record<string, string> = {};
      for (const [key, value] of [...body.entries()].slice(0, 50)) {
        values[key] =
          value instanceof File
            ? `[File ${value.name}, ${value.size} bytes]`
            : value.slice(0, 2_000);
      }
      return serialize(values).slice(0, 16_384);
    }
    if (body instanceof Blob) return `[Blob ${body.type || 'unknown'}, ${body.size} bytes]`;
    if (body instanceof ArrayBuffer) return `[ArrayBuffer ${body.byteLength} bytes]`;
    if (ArrayBuffer.isView(body)) return `[TypedArray ${body.byteLength} bytes]`;
    return serialize(body).slice(0, 16_384);
  };

  const emitDiagnostic = (
    level: 'debug' | 'log' | 'info' | 'warn' | 'error',
    kind: 'console' | 'uncaught-error' | 'unhandled-rejection',
    message: string,
    stack?: string,
  ) => {
    window.postMessage(
      {
        __reprokit: true,
        sessionId,
        type: 'diagnostic',
        event: {
          occurredAt: new Date().toISOString(),
          kind,
          level,
          message: message.slice(0, 32_768),
          ...(stack ? { stack: stack.slice(0, 32_768) } : {}),
        },
      },
      '*',
    );
  };

  const emitNetwork = (event: {
    occurredAt: string;
    method: string;
    url: string;
    resourceType: string;
    status?: number;
    durationMs: number;
    requestBody?: string;
    responseBody?: string;
    error?: string;
  }) => window.postMessage({ __reprokit: true, sessionId, type: 'network', event }, '*');

  const readResponseBody = async (response: Response): Promise<string | undefined> => {
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    const isText =
      contentType.includes('json') ||
      contentType.includes('text') ||
      contentType.includes('xml') ||
      contentType.includes('javascript') ||
      contentType.includes('form-urlencoded');
    if (!isText) return contentType ? `[${contentType} body omitted]` : undefined;
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > 32_768) return `[Body omitted: ${contentLength} bytes]`;
    if (!response.body) return (await response.text()).slice(0, 32_768);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let output = '';
    while (output.length <= 32_768) {
      const chunk = await reader.read();
      if (chunk.done) break;
      output += decoder.decode(chunk.value, { stream: true });
    }
    if (output.length > 32_768) {
      await reader.cancel();
      return `${output.slice(0, 32_750)}\n[TRUNCATED]`;
    }
    return `${output}${decoder.decode()}`;
  };

  const onError = (event: ErrorEvent) =>
    emitDiagnostic(
      'error',
      'uncaught-error',
      event.message || 'Uncaught error',
      event.error instanceof Error ? event.error.stack : undefined,
    );
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason: unknown = event.reason;
    emitDiagnostic(
      'error',
      'unhandled-rejection',
      serialize(reason),
      reason instanceof Error ? reason.stack : undefined,
    );
  };

  const patchedConsole = {} as Record<keyof typeof originalConsole, (...args: unknown[]) => void>;
  for (const level of ['debug', 'log', 'info', 'warn', 'error'] as const) {
    patchedConsole[level] = (...args: unknown[]) => {
      originalConsole[level].apply(console, args);
      emitDiagnostic(level, 'console', args.map((value) => serialize(value)).join(' '));
    };
    console[level] = patchedConsole[level];
  }

  const patchedFetch: typeof window.fetch = async (...args) => {
    const [input, init] = args;
    const occurredAt = new Date().toISOString();
    const startedAt = performance.now();
    const request = input instanceof Request ? input : undefined;
    const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    const requestBody = serializeBody(init?.body);
    try {
      const response = await originalFetch.apply(window, args);
      void readResponseBody(response.clone())
        .then((responseBody) =>
          emitNetwork({
            occurredAt,
            method,
            url: response.url || url,
            resourceType: 'fetch',
            status: response.status,
            durationMs: Math.max(0, performance.now() - startedAt),
            ...(requestBody ? { requestBody } : {}),
            ...(responseBody ? { responseBody } : {}),
          }),
        )
        .catch((error: unknown) =>
          emitNetwork({
            occurredAt,
            method,
            url: response.url || url,
            resourceType: 'fetch',
            status: response.status,
            durationMs: Math.max(0, performance.now() - startedAt),
            ...(requestBody ? { requestBody } : {}),
            error: serialize(error).slice(0, 2_000),
          }),
        );
      return response;
    } catch (error) {
      emitNetwork({
        occurredAt,
        method,
        url,
        resourceType: 'fetch',
        durationMs: Math.max(0, performance.now() - startedAt),
        ...(requestBody ? { requestBody } : {}),
        error: serialize(error).slice(0, 2_000),
      });
      throw error;
    }
  };
  window.fetch = patchedFetch;

  function patchedOpen(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async = true,
    username?: string | null,
    password?: string | null,
  ) {
    xhrMetadata.set(this, {
      occurredAt: new Date().toISOString(),
      startedAt: performance.now(),
      method: method.toUpperCase(),
      url: String(url),
    });
    return originalXhrOpen.call(this, method, url, async, username, password);
  }
  function patchedSend(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const metadata = xhrMetadata.get(this);
    const requestBody = serializeBody(body);
    if (metadata && requestBody) metadata.requestBody = requestBody;
    this.addEventListener(
      'loadend',
      () => {
        if (!metadata) return;
        let responseBody: string | undefined;
        try {
          if (this.responseType === '' || this.responseType === 'text') {
            responseBody = this.responseText.slice(0, 32_768);
          } else if (this.responseType === 'json') {
            responseBody = serialize(this.response).slice(0, 32_768);
          } else if (this.response) {
            responseBody = `[${this.responseType || 'binary'} body omitted]`;
          }
        } catch {
          responseBody = '[Response body unavailable]';
        }
        emitNetwork({
          occurredAt: metadata.occurredAt,
          method: metadata.method,
          url: this.responseURL || metadata.url,
          resourceType: 'xmlhttprequest',
          status: this.status,
          durationMs: Math.max(0, performance.now() - metadata.startedAt),
          ...(metadata.requestBody ? { requestBody: metadata.requestBody } : {}),
          ...(responseBody ? { responseBody } : {}),
          ...(this.status === 0 ? { error: 'Request failed or was cancelled.' } : {}),
        });
      },
      { once: true },
    );
    return originalXhrSend.call(this, body);
  }
  XMLHttpRequest.prototype.open = patchedOpen;
  XMLHttpRequest.prototype.send = patchedSend;

  const resourceObserver =
    typeof PerformanceObserver === 'undefined'
      ? undefined
      : new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry instanceof PerformanceResourceTiming)) continue;
            if (['fetch', 'xmlhttprequest'].includes(entry.initiatorType)) continue;
            emitNetwork({
              occurredAt: new Date(
                Date.now() - Math.max(0, performance.now() - entry.startTime),
              ).toISOString(),
              method: 'GET',
              url: entry.name,
              resourceType: entry.initiatorType || 'resource',
              ...('responseStatus' in entry && typeof entry.responseStatus === 'number'
                ? { status: entry.responseStatus }
                : {}),
              durationMs: Math.max(0, entry.duration),
            });
          }
        });
  resourceObserver?.observe({ type: 'resource', buffered: false });

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  scope.__reprokitRecorder = {
    restore: () => {
      for (const level of ['debug', 'log', 'info', 'warn', 'error'] as const) {
        if (console[level] === patchedConsole[level]) console[level] = originalConsole[level];
      }
      if (window.fetch === patchedFetch) window.fetch = originalFetch;
      if (XMLHttpRequest.prototype.open === patchedOpen)
        XMLHttpRequest.prototype.open = originalXhrOpen;
      if (XMLHttpRequest.prototype.send === patchedSend)
        XMLHttpRequest.prototype.send = originalXhrSend;
      resourceObserver?.disconnect();
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      delete scope.__reprokitRecorder;
    },
  };
}

export function uninstallRecorder(): void {
  const scope = globalThis as typeof globalThis & { __reprokitRecorder?: RecorderState };
  scope.__reprokitRecorder?.restore();
}
