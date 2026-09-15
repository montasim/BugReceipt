import { afterEach, describe, expect, it, vi } from 'vitest';
import { DebuggerRecorder } from '../src/infrastructure/debugger-recorder';

const root = { tabId: 7 };
function harness() {
  const command = vi.fn().mockResolvedValue({});
  vi.stubGlobal('chrome', {
    debugger: {
      attach: vi.fn().mockResolvedValue(undefined),
      detach: vi.fn().mockResolvedValue(undefined),
      sendCommand: command,
    },
  });
  const diagnostic = vi.fn();
  const network = vi.fn();
  const warning = vi.fn();
  const recorder = new DebuggerRecorder({ diagnostic, network, warning });
  return { recorder, command, diagnostic, network, warning };
}
afterEach(() => vi.unstubAllGlobals());

describe('browser evidence recorder', () => {
  it('records frame console calls and browser-blocked requests across refreshes', async () => {
    const { recorder, diagnostic, network } = harness();
    await recorder.start(7, 'capture');
    await recorder.event(root, 'Runtime.executionContextsCleared', {});
    await recorder.event(root, 'Runtime.consoleAPICalled', {
      type: 'warning',
      timestamp: Date.now(),
      args: [{ value: 'Guest view' }],
      executionContextId: 99,
    });
    await recorder.event(root, 'Network.requestWillBeSent', {
      requestId: 'blocked',
      timestamp: 1,
      wallTime: Date.now() / 1000,
      request: { method: 'GET', url: 'https://third-party.example/beacon.js' },
      type: 'Script',
    });
    await recorder.event(root, 'Network.loadingFailed', {
      requestId: 'blocked',
      timestamp: 1.1,
      errorText: 'net::ERR_BLOCKED_BY_CLIENT',
      blockedReason: 'inspector',
    });
    expect(diagnostic).toHaveBeenCalledWith(
      'capture',
      expect.objectContaining({ level: 'warn', message: 'Guest view' }),
    );
    expect(network).toHaveBeenLastCalledWith(
      'capture',
      expect.objectContaining({
        resourceType: 'script',
        error: expect.stringContaining('ERR_BLOCKED_BY_CLIENT') as unknown,
      }),
    );
  });

  it('enables nested frames and workers before resuming their startup scripts', async () => {
    const { recorder, command } = harness();
    await recorder.start(7, 'capture');
    await recorder.event(root, 'Target.attachedToTarget', {
      sessionId: 'child',
      targetInfo: { type: 'iframe' },
    });
    const child = { tabId: 7, sessionId: 'child' };
    expect(command).toHaveBeenCalledWith(child, 'Runtime.enable', {});
    expect(command).toHaveBeenCalledWith(child, 'Network.enable', expect.any(Object));
    expect(command).toHaveBeenCalledWith(
      child,
      'Target.setAutoAttach',
      expect.objectContaining({ waitForDebuggerOnStart: true, flatten: true }),
    );
    expect(command.mock.calls.at(-1)).toEqual([child, 'Runtime.runIfWaitingForDebugger', {}]);
  });

  it('retains pending requests, separate redirects, and child request IDs', async () => {
    const { recorder, network } = harness();
    await recorder.start(7, 'capture');
    const request = {
      requestId: '1',
      timestamp: 1,
      wallTime: Date.now() / 1000,
      request: { method: 'GET', url: 'https://example.com/a' },
    };
    await recorder.event(root, 'Network.requestWillBeSent', request);
    const first = network.mock.calls.at(-1)?.[1] as { id: string };
    await recorder.event(root, 'Network.requestWillBeSent', {
      ...request,
      timestamp: 2,
      redirectResponse: { status: 302 },
      request: { method: 'GET', url: 'https://example.com/b' },
    });
    const second = network.mock.calls.at(-1)?.[1] as { id: string };
    expect(first.id).not.toBe(second.id);
    expect(network).toHaveBeenCalledWith(
      'capture',
      expect.objectContaining({ id: first.id, status: 302 }),
    );
    await recorder.event({ ...root, sessionId: 'child' }, 'Network.requestWillBeSent', request);
    expect(network.mock.calls.at(-1)?.[1]).not.toMatchObject({ id: second.id });
    await recorder.stop();
    expect(network).toHaveBeenCalledWith(
      'capture',
      expect.objectContaining({
        id: second.id,
        error: expect.stringContaining('still in progress') as unknown,
      }),
    );
  });

  it('ignores a child destroyed by refresh but reports real setup failures and resumes it', async () => {
    const { recorder, command, warning } = harness();
    await recorder.start(7, 'capture');
    command.mockRejectedValueOnce(new Error('Session with given id not found.'));
    await recorder.event(root, 'Target.attachedToTarget', { sessionId: 'old' });
    expect(warning).not.toHaveBeenCalled();
    command.mockRejectedValueOnce(new Error('Network unavailable'));
    await recorder.event(root, 'Target.attachedToTarget', { sessionId: 'new' });
    expect(warning).toHaveBeenCalledOnce();
    expect(command.mock.calls.at(-1)).toEqual([
      { tabId: 7, sessionId: 'new' },
      'Runtime.runIfWaitingForDebugger',
      {},
    ]);
  });

  it('captures console tables, traces, exceptions and native browser messages', async () => {
    const { recorder, diagnostic } = harness();
    await recorder.start(7, 'capture');
    await recorder.event(root, 'Runtime.consoleAPICalled', {
      type: 'table',
      args: [
        {
          description: 'Object',
          preview: {
            properties: [
              { name: 'token', value: 'private' },
              { name: 'name', value: 'example' },
            ],
          },
        },
      ],
    });
    await recorder.event(root, 'Runtime.consoleAPICalled', {
      type: 'trace',
      args: [{ value: 'trace' }],
      stackTrace: {
        callFrames: [
          {
            functionName: 'run',
            url: 'https://example.com/script.js',
            lineNumber: 0,
            columnNumber: 1,
          },
        ],
      },
    });
    await recorder.event(root, 'Runtime.exceptionThrown', {
      exceptionDetails: {
        text: 'Uncaught (in promise)',
        exception: { description: 'Error: rejected' },
      },
    });
    await recorder.event(root, 'Log.entryAdded', {
      entry: { level: 'error', text: 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT' },
    });
    expect(diagnostic).toHaveBeenCalledTimes(4);
    expect(diagnostic).toHaveBeenCalledWith(
      'capture',
      expect.objectContaining({ consoleType: 'table', level: 'log' }),
    );
    expect(diagnostic).toHaveBeenCalledWith(
      'capture',
      expect.objectContaining({ consoleType: 'trace', level: 'log' }),
    );
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('private');
    expect(diagnostic).toHaveBeenCalledWith(
      'capture',
      expect.objectContaining({ kind: 'unhandled-rejection', message: 'Error: rejected' }),
    );
    expect(diagnostic).toHaveBeenCalledWith(
      'capture',
      expect.objectContaining({ stack: 'at run (https://example.com/script.js:1:2)' }),
    );
  });

  it('records WebSocket handshake timing and messages separately', async () => {
    const { recorder, network } = harness();
    await recorder.start(7, 'capture');
    await recorder.event(root, 'Network.webSocketCreated', {
      requestId: 'socket',
      url: 'wss://example.com/socket',
    });
    await recorder.event(root, 'Network.webSocketWillSendHandshakeRequest', {
      requestId: 'socket',
      timestamp: 1000,
      wallTime: Date.now() / 1000,
    });
    await recorder.event(root, 'Network.webSocketHandshakeResponseReceived', {
      requestId: 'socket',
      timestamp: 1001,
      response: { status: 101 },
    });
    expect(network).toHaveBeenLastCalledWith(
      'capture',
      expect.objectContaining({ status: 101, durationMs: 1000 }),
    );
    await recorder.event(root, 'Network.webSocketFrameReceived', {
      requestId: 'socket',
      response: { opcode: 1, payloadData: 'hello' },
    });
    expect(network).toHaveBeenLastCalledWith(
      'capture',
      expect.objectContaining({
        method: 'RECEIVE',
        resourceType: 'websocket-frame',
        responseBody: 'hello',
      }),
    );
  });

  it('reports detach and ignores unrelated tabs and old console history', async () => {
    const { recorder, diagnostic, warning } = harness();
    await recorder.start(7, 'capture');
    await recorder.event({ tabId: 8 }, 'Runtime.consoleAPICalled', {
      args: [{ value: 'other tab' }],
    });
    await recorder.event(root, 'Runtime.consoleAPICalled', {
      timestamp: 1,
      args: [{ value: 'old' }],
    });
    expect(diagnostic).not.toHaveBeenCalled();
    recorder.detached(root, 'canceled_by_user');
    expect(warning).toHaveBeenCalledWith('capture', expect.stringContaining('disconnected'));
  });
});
