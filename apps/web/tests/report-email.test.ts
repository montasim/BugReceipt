import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleReportEmailRequest } from '../src/server/report-email';

const originalEnvironment = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  BUGRECEIPT_REPORT_FROM: process.env.BUGRECEIPT_REPORT_FROM,
  BUGRECEIPT_REPORT_TO: process.env.BUGRECEIPT_REPORT_TO,
  BUGRECEIPT_EXTENSION_ORIGIN: process.env.BUGRECEIPT_EXTENSION_ORIGIN,
};
const extensionOrigin = 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-key';
  process.env.BUGRECEIPT_REPORT_FROM = 'BugReceipt <reports@example.com>';
  process.env.BUGRECEIPT_REPORT_TO = 'maintainer@example.com';
  process.env.BUGRECEIPT_EXTENSION_ORIGIN = extensionOrigin;
});

afterEach(() => {
  restoreEnvironment();
});

describe('report email endpoint', () => {
  it('rejects delivery when the server is not configured', async () => {
    delete process.env.RESEND_API_KEY;

    const response = await handleReportEmailRequest(reportRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Report email is not configured on the BugReceipt server.',
    });
  });

  it('rejects the example Resend key before contacting the provider', async () => {
    process.env.RESEND_API_KEY = 're_replace_me';
    const sendEmail = vi.fn();

    const response = await handleReportEmailRequest(reportRequest(), { sendEmail });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Replace the RESEND_API_KEY placeholder with a valid Resend API key.',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('delivers a valid report through the configured email provider', async () => {
    const sendEmail = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null });

    const response = await handleReportEmailRequest(reportRequest(), { sendEmail });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, id: 'email-1' });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'BugReceipt <reports@example.com>',
        to: ['maintainer@example.com'],
        subject: '[BugReceipt] Checkout fails',
        text: '# Checkout fails',
      }),
      expect.objectContaining({ idempotencyKey: expect.stringMatching(/^bugreceipt-/) }),
    );
  });

  it('surfaces the provider rejection reason instead of a generic Resend error', async () => {
    const sendEmail = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'You can only send testing emails to your own email address.',
        name: 'validation_error',
      },
    });

    const response = await handleReportEmailRequest(reportRequest(), { sendEmail });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: 'You can only send testing emails to your own email address.',
    });
  });

  it('uses a different idempotency key when the visual payload changes', async () => {
    const sendEmail = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 'email-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'email-2' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });

    await handleReportEmailRequest(reportRequestWithVisual('first-frame', '198.51.100.10'), {
      sendEmail,
    });
    await handleReportEmailRequest(reportRequestWithVisual('second-frame', '198.51.100.10'), {
      sendEmail,
    });
    await handleReportEmailRequest(reportRequestWithVisual('first-frame', '198.51.100.10'), {
      sendEmail,
    });

    const firstKey = sendEmail.mock.calls[0]?.[1].idempotencyKey;
    const secondKey = sendEmail.mock.calls[1]?.[1].idempotencyKey;
    const repeatedFirstKey = sendEmail.mock.calls[2]?.[1].idempotencyKey;
    expect(firstKey).not.toBe(secondKey);
    expect(repeatedFirstKey).toBe(firstKey);
  });

  it('rejects requests from an unconfigured extension origin', async () => {
    const response = await handleReportEmailRequest(
      reportRequest('chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
    );

    expect(response.status).toBe(403);
  });

  it('allows a valid unpacked extension origin when local config still has a placeholder', async () => {
    process.env.BUGRECEIPT_EXTENSION_ORIGIN = 'chrome-extension://extension-id';
    const sendEmail = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null });

    const response = await handleReportEmailRequest(reportRequest(), { sendEmail });

    expect(response.status).toBe(200);
  });

  it('keeps a selected video frame under its Markdown-linked filename', async () => {
    const sendEmail = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const form = new FormData();
    form.set('sessionId', '00000000-0000-4000-8000-000000000000');
    form.set('subject', 'Checkout fails');
    form.set('report', '# Checkout fails');
    form.set('visual', new File(['selected-frame'], 'selected-frame.png', { type: 'image/png' }));
    const request = new Request('https://bugreceipt.example/api/reports', {
      method: 'POST',
      headers: { Origin: extensionOrigin },
      body: form,
    });

    const response = await handleReportEmailRequest(request, { sendEmail });

    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({ filename: 'issue.md' }),
          expect.objectContaining({ filename: 'selected-frame.png' }),
        ]),
      }),
      expect.any(Object),
    );
  });

  it('delivers the complete ZIP file set under the same filenames', async () => {
    const sendEmail = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const form = new FormData();
    form.set('sessionId', '00000000-0000-4000-8000-000000000000');
    form.set('subject', 'Checkout fails');
    form.set('report', '# Checkout fails');
    form.append('visual', new File(['captured-video'], 'recording.webm', { type: 'video/webm' }));
    form.append(
      'visual',
      new File(['first-frame'], 'selected-frame-01.png', { type: 'image/png' }),
    );
    form.append(
      'visual',
      new File(['second-frame'], 'selected-frame-02.png', { type: 'image/png' }),
    );
    const request = new Request('https://bugreceipt.example/api/reports', {
      method: 'POST',
      headers: { Origin: extensionOrigin, 'X-Forwarded-For': '198.51.100.21' },
      body: form,
    });

    const response = await handleReportEmailRequest(request, { sendEmail });

    expect(response.status).toBe(200);
    const attachments = sendEmail.mock.calls[0]?.[0].attachments ?? [];
    expect(attachments.map((attachment: { filename: string }) => attachment.filename)).toEqual([
      'issue.md',
      'recording.webm',
      'selected-frame-01.png',
      'selected-frame-02.png',
    ]);
  });

  it('attaches an explicitly included extension diagnosis as diagnosis.md', async () => {
    const sendEmail = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const form = new FormData();
    form.set('sessionId', '00000000-0000-4000-8000-000000000000');
    form.set('subject', 'Extension issue: Review page freezes');
    form.set('report', '# Review page freezes\n\nThe controls stop responding.');
    form.set('diagnosis', '# BugReceipt diagnosis report\n\n- Browser: Chrome 140');
    const request = new Request('https://bugreceipt.example/api/reports', {
      method: 'POST',
      headers: { Origin: extensionOrigin, 'X-Forwarded-For': '198.51.100.23' },
      body: form,
    });

    const response = await handleReportEmailRequest(request, { sendEmail });

    expect(response.status).toBe(200);
    const attachments = sendEmail.mock.calls[0]?.[0].attachments ?? [];
    expect(attachments.map((attachment: { filename: string }) => attachment.filename)).toEqual([
      'issue.md',
      'diagnosis.md',
    ]);
    expect(attachments[1]?.content.toString()).toContain('# BugReceipt diagnosis report');
  });

  it('rejects an oversized complete file set instead of sending a partial email', async () => {
    const sendEmail = vi.fn();
    const form = new FormData();
    form.set('sessionId', '00000000-0000-4000-8000-000000000000');
    form.set('subject', 'Checkout fails');
    form.set('report', '# Checkout fails');
    form.append(
      'visual',
      new File([new Uint8Array(4 * 1024 * 1024)], 'recording.webm', { type: 'video/webm' }),
    );
    const request = new Request('https://bugreceipt.example/api/reports', {
      method: 'POST',
      headers: { Origin: extensionOrigin, 'X-Forwarded-For': '198.51.100.22' },
      body: form,
    });

    const response = await handleReportEmailRequest(request, { sendEmail });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error:
        'All report files must total 4 MB or less for email. Download the ZIP instead or remove visual evidence.',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

function reportRequest(origin = extensionOrigin): Request {
  const form = new FormData();
  form.set('sessionId', '00000000-0000-4000-8000-000000000000');
  form.set('subject', 'Checkout fails');
  form.set('report', '# Checkout fails');
  return new Request('https://bugreceipt.example/api/reports', {
    method: 'POST',
    headers: { Origin: origin },
    body: form,
  });
}

function reportRequestWithVisual(content: string, clientAddress: string): Request {
  const form = new FormData();
  form.set('sessionId', '00000000-0000-4000-8000-000000000000');
  form.set('subject', 'Checkout fails');
  form.set('report', '# Checkout fails');
  form.set('visual', new File([content], 'selected-frame.png', { type: 'image/png' }));
  return new Request('https://bugreceipt.example/api/reports', {
    method: 'POST',
    headers: { Origin: extensionOrigin, 'X-Forwarded-For': clientAddress },
    body: form,
  });
}

function restoreEnvironment() {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
