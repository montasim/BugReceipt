import { afterEach, describe, expect, it, vi } from 'vitest';
import { installRecorder, uninstallRecorder } from '../src/infrastructure/page-instrumentation';

afterEach(() => {
  uninstallRecorder();
  vi.restoreAllMocks();
});

describe('page evidence recorder', () => {
  it('captures every console level and redacts sensitive object keys before bridging', () => {
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);

    installRecorder('00000000-0000-4000-8000-000000000000');
    console.log('checkout', { token: 'private' });
    console.info('working');
    console.warn('slow');
    console.debug('details');

    const diagnostics = postMessage.mock.calls
      .map(
        ([message]) => message as { type?: string; event?: { level?: string; message?: string } },
      )
      .filter((message) => message.type === 'diagnostic');
    expect(diagnostics.map((message) => message.event?.level)).toEqual([
      'log',
      'info',
      'warn',
      'debug',
    ]);
    expect(diagnostics[0]?.event?.message).toContain('[REDACTED]');
    expect(diagnostics[0]?.event?.message).not.toContain('private');
  });

  it('captures a fetch request and its bounded text response', async () => {
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
    const fetch = vi.fn().mockResolvedValue(
      new Response('{"ok":true}', {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    window.fetch = fetch;
    installRecorder('00000000-0000-4000-8000-000000000000');

    await window.fetch('https://example.com/api/orders?token=private', {
      method: 'POST',
      body: '{"amount":42}',
    });
    await vi.waitFor(() =>
      expect(
        postMessage.mock.calls.some(
          ([message]) => (message as { type?: string }).type === 'network',
        ),
      ).toBe(true),
    );

    const network = postMessage.mock.calls
      .map(([message]) => message as { type?: string; event?: Record<string, unknown> })
      .find((message) => message.type === 'network');
    expect(network?.event).toMatchObject({
      method: 'POST',
      status: 201,
      resourceType: 'fetch',
      requestBody: '{"amount":42}',
      responseBody: '{"ok":true}',
    });
  });
});
