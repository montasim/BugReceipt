import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleReportEmailRequest } from '../src/server/report-email';

const originalEnvironment = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  REPROKIT_REPORT_FROM: process.env.REPROKIT_REPORT_FROM,
  REPROKIT_REPORT_TO: process.env.REPROKIT_REPORT_TO,
  REPROKIT_EXTENSION_ORIGIN: process.env.REPROKIT_EXTENSION_ORIGIN,
};
const extensionOrigin = 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-key';
  process.env.REPROKIT_REPORT_FROM = 'ReproKit <reports@example.com>';
  process.env.REPROKIT_REPORT_TO = 'maintainer@example.com';
  process.env.REPROKIT_EXTENSION_ORIGIN = extensionOrigin;
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
      error: 'Report email is not configured on the ReproKit server.',
    });
  });

  it('delivers a valid report through the configured email provider', async () => {
    const sendEmail = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null });

    const response = await handleReportEmailRequest(reportRequest(), { sendEmail });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, id: 'email-1' });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'ReproKit <reports@example.com>',
        to: ['maintainer@example.com'],
        subject: '[ReproKit] Checkout fails',
        text: '# Checkout fails',
      }),
      expect.objectContaining({ idempotencyKey: expect.stringMatching(/^reprokit-/) }),
    );
  });

  it('rejects requests from an unconfigured extension origin', async () => {
    const response = await handleReportEmailRequest(
      reportRequest('chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
    );

    expect(response.status).toBe(403);
  });
});

function reportRequest(origin = extensionOrigin): Request {
  const form = new FormData();
  form.set('sessionId', '00000000-0000-4000-8000-000000000000');
  form.set('subject', 'Checkout fails');
  form.set('report', '# Checkout fails');
  return new Request('https://reprokit.example/api/reports', {
    method: 'POST',
    headers: { Origin: origin },
    body: form,
  });
}

function restoreEnvironment() {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
