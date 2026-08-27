import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { Resend } from 'resend';

const MAX_REPORT_CHARACTERS = 200_000;
const MAX_VISUAL_BYTES = 4 * 1024 * 1024;
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
      { error: 'This ReproKit origin is not allowed.' },
      { status: 403, headers },
    );
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REPROKIT_REPORT_FROM;
  const to = process.env.REPROKIT_REPORT_TO;
  if (!apiKey || !from || !to) {
    return Response.json(
      { error: 'Report email is not configured on the ReproKit server.' },
      { status: 503, headers },
    );
  }

  try {
    const form = await request.formData();
    const report = form.get('report');
    const subject = form.get('subject');
    const sessionId = form.get('sessionId');
    const visual = form.get('visual');
    if (
      typeof report !== 'string' ||
      report.length === 0 ||
      report.length > MAX_REPORT_CHARACTERS ||
      typeof subject !== 'string' ||
      subject.length === 0 ||
      subject.length > 200 ||
      typeof sessionId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(sessionId)
    ) {
      return Response.json({ error: 'The report payload is invalid.' }, { status: 400, headers });
    }
    if (visual instanceof File && visual.size > MAX_VISUAL_BYTES) {
      return Response.json(
        { error: 'The visual attachment is too large to email.' },
        { status: 413, headers },
      );
    }
    if (
      visual instanceof File &&
      visual.size > 0 &&
      !['image/png', 'video/webm'].includes(visual.type)
    ) {
      return Response.json(
        { error: 'The visual attachment type is not supported.' },
        { status: 415, headers },
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
        filename: 'reprokit-report.md',
        content: Buffer.from(report, 'utf8'),
      },
    ];
    if (visual instanceof File && visual.size > 0) {
      attachments.push({
        filename: visual.type === 'image/png' ? 'screenshot.png' : 'recording.webm',
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
    const { data, error } = await sendEmail(
      {
        from,
        to: recipients,
        subject: `[ReproKit] ${subject}`,
        text: report,
        attachments,
      },
      {
        idempotencyKey: `reprokit-${sessionId}-${createHash('sha256').update(report).digest('hex').slice(0, 16)}`,
      },
    );
    if (error || !data) {
      return Response.json(
        { error: 'Resend rejected the report email.' },
        { status: 502, headers },
      );
    }
    return Response.json({ ok: true, id: data.id }, { headers });
  } catch {
    return Response.json(
      { error: 'The report email could not be sent.' },
      { status: 500, headers },
    );
  }
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
  const configured = process.env.REPROKIT_EXTENSION_ORIGIN;
  if (configured) return origin === configured;
  return /^chrome-extension:\/\/[a-p]{32}$/.test(origin);
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
