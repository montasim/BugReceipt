import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { Resend } from 'resend';

const MAX_REPORT_CHARACTERS = 200_000;
const MAX_DIAGNOSIS_CHARACTERS = 120_000;
const MAX_EMAIL_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_VISUAL_FILES = 21;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1_000;
const RATE_LIMIT_REQUESTS = 5;
const requestsByClient = new Map<string, number[]>();

type EmailMessage = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  attachments: Array<{ filename: string; content: Buffer }>;
};

type SendEmail = (
  message: EmailMessage,
  options: { idempotencyKey: string },
) => Promise<{ data: { id: string } | null; error: unknown }>;

type ReportEmailDependencies = {
  sendEmail?: SendEmail;
};

export async function handleReportEmailRequest(
  request: Request,
  dependencies: ReportEmailDependencies = {},
): Promise<Response> {
  const headers = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!isAllowedOrigin(request.headers.get('origin'))) {
    return Response.json(
      { error: 'This BugReceipt origin is not allowed.' },
      { status: 403, headers },
    );
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BUGRECEIPT_REPORT_FROM;
  const to = process.env.BUGRECEIPT_REPORT_TO;
  if (!apiKey || !from || !to) {
    return Response.json(
      { error: 'Report email is not configured on the BugReceipt server.' },
      { status: 503, headers },
    );
  }
  if (/^re_(?:replace_me|x+)$/i.test(apiKey)) {
    return Response.json(
      { error: 'Replace the RESEND_API_KEY placeholder with a valid Resend API key.' },
      { status: 503, headers },
    );
  }

  try {
    const form = await request.formData();
    const report = form.get('report');
    const subject = form.get('subject');
    const sessionId = form.get('sessionId');
    const diagnosis = form.get('diagnosis');
    const visualValues = form.getAll('visual');
    if (
      typeof report !== 'string' ||
      report.length === 0 ||
      report.length > MAX_REPORT_CHARACTERS ||
      typeof subject !== 'string' ||
      subject.length === 0 ||
      subject.length > 200 ||
      typeof sessionId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(sessionId) ||
      (diagnosis !== null &&
        (typeof diagnosis !== 'string' || diagnosis.length > MAX_DIAGNOSIS_CHARACTERS))
    ) {
      return Response.json({ error: 'The report payload is invalid.' }, { status: 400, headers });
    }
    if (visualValues.some((visual) => !(visual instanceof File))) {
      return Response.json(
        { error: 'The visual attachments are invalid.' },
        { status: 400, headers },
      );
    }
    const visuals = visualValues as File[];
    if (visuals.length > MAX_VISUAL_FILES) {
      return Response.json(
        { error: `A report email can include up to ${MAX_VISUAL_FILES} visual files.` },
        { status: 400, headers },
      );
    }
    if (
      visuals.some(
        (visual) => visual.size > 0 && !['image/png', 'video/webm'].includes(visual.type),
      )
    ) {
      return Response.json(
        { error: 'The visual attachment type is not supported.' },
        { status: 415, headers },
      );
    }
    const requestBytes =
      Buffer.byteLength(report, 'utf8') +
      Buffer.byteLength(typeof diagnosis === 'string' ? diagnosis : '', 'utf8') +
      visuals.reduce((total, visual) => total + visual.size, 0);
    if (requestBytes > MAX_EMAIL_REQUEST_BYTES) {
      return Response.json(
        {
          error:
            'All report files must total 4 MB or less for email. Download the ZIP instead or remove visual evidence.',
        },
        { status: 413, headers },
      );
    }
    if (isRateLimited(clientAddress(request))) {
      return Response.json(
        { error: 'Too many reports were sent. Try again later.' },
        { status: 429, headers: { ...headers, 'Retry-After': '3600' } },
      );
    }

    const attachments = [
      {
        filename: 'issue.md',
        content: Buffer.from(report, 'utf8'),
      },
    ];
    if (typeof diagnosis === 'string' && diagnosis.trim()) {
      attachments.push({
        filename: 'diagnosis.md',
        content: Buffer.from(diagnosis, 'utf8'),
      });
    }
    for (const visual of visuals) {
      if (visual.size === 0) continue;
      attachments.push({
        filename: emailVisualFilename(visual),
        content: Buffer.from(await visual.arrayBuffer()),
      });
    }

    const recipients = to
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      return Response.json(
        { error: 'The report recipient is not configured.' },
        { status: 503, headers },
      );
    }
    const sendEmail: SendEmail =
      dependencies.sendEmail ??
      ((message, options) => new Resend(apiKey).emails.send(message, options));
    const message = {
      from,
      to: recipients,
      subject: `[BugReceipt] ${subject}`,
      text: report,
      attachments,
    };
    const { data, error } = await sendEmail(message, {
      idempotencyKey: emailIdempotencyKey(sessionId, message),
    });
    if (error || !data) {
      return Response.json({ error: providerRejectionMessage(error) }, { status: 502, headers });
    }
    return Response.json({ ok: true, id: data.id }, { headers });
  } catch {
    return Response.json(
      { error: 'The report email could not be sent.' },
      { status: 500, headers },
    );
  }
}

function emailVisualFilename(visual: File): string {
  if (visual.type === 'video/webm') return 'recording.webm';
  if (/^selected-frame(?:-\d{2})?\.png$/.test(visual.name)) return visual.name;
  return 'screenshot.png';
}

function emailIdempotencyKey(sessionId: string, message: EmailMessage): string {
  const payload = JSON.stringify({
    from: message.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    attachments: message.attachments.map((attachment) => ({
      filename: attachment.filename,
      contentHash: createHash('sha256').update(attachment.content).digest('hex'),
    })),
  });
  const payloadHash = createHash('sha256').update(payload).digest('hex').slice(0, 32);
  return `bugreceipt-${sessionId}-${payloadHash}`;
}

function providerRejectionMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('message' in error)) {
    return 'Resend rejected the report email.';
  }
  const message = error.message;
  if (typeof message !== 'string' || message.trim().length === 0) {
    return 'Resend rejected the report email.';
  }
  return message.trim().slice(0, 500);
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  return {
    ...(origin && isAllowedOrigin(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const extensionOriginPattern = /^chrome-extension:\/\/[a-p]{32}$/;
  const configured = (process.env.BUGRECEIPT_EXTENSION_ORIGIN || '').trim().replace(/\/+$/, '');
  if (extensionOriginPattern.test(configured)) return origin === configured;
  if (configured && !import.meta.env.DEV) return false;
  return extensionOriginPattern.test(origin);
}

function clientAddress(request: Request): string {
  return (
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function isRateLimited(client: string): boolean {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  const recent = (requestsByClient.get(client) ?? []).filter((time) => time > cutoff);
  if (recent.length >= RATE_LIMIT_REQUESTS) return true;
  recent.push(Date.now());
  requestsByClient.set(client, recent);
  return false;
}
