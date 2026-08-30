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

  it('explains how to recover when the local email server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(
      sendReportEmail({
        sessionId: '00000000-0000-4000-8000-000000000000',
        subject: 'Checkout fails',
        markdown: '# Checkout fails',
      }),
    ).rejects.toThrow('Start it with `pnpm dev:web`');
  });

  it('preserves the selected frame filename for email delivery', async () => {
    const frame = new Blob(['selected-frame'], { type: 'image/png' });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(frame))
      .mockResolvedValueOnce(
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
      visualUrl: 'blob:selected-frame',
      visualFilename: 'selected-frame.png',
    });

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    const visual = (init.body as FormData).get('visual');
    expect(visual).toBeInstanceOf(File);
    expect((visual as File).name).toBe('selected-frame.png');
  });

  it('posts every prepared ZIP visual under the same filenames', async () => {
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
      visuals: [
        {
          blob: new Blob(['captured-video'], { type: 'video/webm' }),
          filename: 'recording.webm',
        },
        {
          blob: new Blob(['first-frame'], { type: 'image/png' }),
          filename: 'selected-frame-01.png',
        },
        {
          blob: new Blob(['second-frame'], { type: 'image/png' }),
          filename: 'selected-frame-02.png',
        },
      ],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const visuals = (init.body as FormData).getAll('visual') as File[];
    expect(visuals.map((visual) => visual.name)).toEqual([
      'recording.webm',
      'selected-frame-01.png',
      'selected-frame-02.png',
    ]);
  });

  it('adds an explicitly consented diagnosis report to the email payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await sendReportEmail({
      sessionId: '00000000-0000-4000-8000-000000000000',
      subject: 'Extension issue: Review page freezes',
      markdown: '# Review page freezes\n\nThe controls stop responding.\n',
      diagnosis: '# BugReceipt diagnosis report\n\n- Browser: Chrome 140',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.body as FormData).get('diagnosis')).toBe(
      '# BugReceipt diagnosis report\n\n- Browser: Chrome 140',
    );
  });

  it('does not silently omit files when the complete email exceeds the size limit', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sendReportEmail({
        sessionId: '00000000-0000-4000-8000-000000000000',
        subject: 'Checkout fails',
        markdown: '# Checkout fails',
        visuals: [
          {
            blob: new Blob([new Uint8Array(4 * 1024 * 1024)], { type: 'video/webm' }),
            filename: 'recording.webm',
          },
        ],
      }),
    ).rejects.toThrow('must total 4 MB or less');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
