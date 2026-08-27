import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendReportEmail } from '../src/infrastructure/report-email';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('report email client', () => {
  it('posts the reviewed Markdown to the configured report endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await sendReportEmail({
      sessionId: '00000000-0000-4000-8000-000000000000',
      subject: 'Checkout fails',
      markdown: '# Checkout fails',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toMatch(/\/api\/reports$/);
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get('subject')).toBe('Checkout fails');
    expect(form.get('report')).toBe('# Checkout fails');
  });

  it('surfaces a server-provided delivery error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Report email is not configured.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(
      sendReportEmail({
        sessionId: '00000000-0000-4000-8000-000000000000',
        subject: 'Checkout fails',
        markdown: '# Checkout fails',
      }),
    ).rejects.toThrow('Report email is not configured.');
  });
});
