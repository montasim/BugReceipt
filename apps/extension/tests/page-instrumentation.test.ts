import { afterEach, describe, expect, it, vi } from 'vitest';
import { installRecorder, uninstallRecorder } from '../src/infrastructure/page-instrumentation';

afterEach(() => {
  uninstallRecorder();
  vi.restoreAllMocks();
});

describe('page evidence recorder', () => {
  it('buffers startup evidence until a document-start recorder receives its session', async () => {
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
    window.fetch = vi.fn().mockResolvedValue(
      new Response('{"ready":true}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    installRecorder(undefined);
    console.error('startup failed');
    await window.fetch('https://example.com/api/startup');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      postMessage.mock.calls.some(
        ([message]) => (message as { type?: string }).type === 'diagnostic',
      ),
    ).toBe(false);

    installRecorder('00000000-0000-4000-8000-000000000000');

    const diagnostics = postMessage.mock.calls
      .map(
        ([message]) => message as { type?: string; event?: { level?: string; message?: string } },
      )
      .filter((message) => message.type === 'diagnostic');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.event).toMatchObject({ level: 'error', message: 'startup failed' });
    const network = postMessage.mock.calls
      .map(([message]) => message as { type?: string; event?: Record<string, unknown> })
      .find((message) => message.type === 'network');
    expect(network?.event).toMatchObject({
      method: 'GET',
      resourceType: 'fetch',
      status: 200,
      url: 'https://example.com/api/startup',
    });
  });

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

  it('captures a fetch error response body when content-type is missing', async () => {
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
    const fetch = vi.fn().mockResolvedValue(
      new Response(new TextEncoder().encode('{"error":"Invitation could not be created"}'), {
        status: 500,
      }),
    );
    window.fetch = fetch;
    installRecorder('00000000-0000-4000-8000-000000000000');

    await window.fetch('https://example.com/api/invitations', {
      method: 'POST',
      body: '{"email":"fixture@example.com"}',
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
      status: 500,
      resourceType: 'fetch',
      responseBody: '{"error":"Invitation could not be created"}',
    });
  });
});
