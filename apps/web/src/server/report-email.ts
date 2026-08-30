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
  html: string;
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
      html: renderReportEmailHtml({
        subject,
        report,
        attachmentFilenames: attachments.map((attachment) => attachment.filename),
      }),
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
    html: message.html,
    attachments: message.attachments.map((attachment) => ({
      filename: attachment.filename,
      contentHash: createHash('sha256').update(attachment.content).digest('hex'),
    })),
  });
  const payloadHash = createHash('sha256').update(payload).digest('hex').slice(0, 32);
  return `bugreceipt-${sessionId}-${payloadHash}`;
}

type ReportEmailTemplateInput = {
  subject: string;
  report: string;
  attachmentFilenames: string[];
};

export function renderReportEmailHtml({
  subject,
  report,
  attachmentFilenames,
}: ReportEmailTemplateInput): string {
  const attachmentCount = attachmentFilenames.length;
  const attachmentLabel = `${attachmentCount} ${attachmentCount === 1 ? 'file' : 'files'} attached`;
  const attachmentRows = attachmentFilenames
    .map(
      (filename) => `
        <tr>
          <td style="padding: 12px 0; border-top: 1px solid #d7e2e6; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 14px; line-height: 20px; color: #102332;">
            <span style="display: inline-block; width: 8px; height: 8px; margin-right: 10px; background: ${attachmentColor(filename)};"></span>
            <strong>${escapeHtml(filename)}</strong>
            <span style="color: #61737d;">&nbsp;&middot;&nbsp;${attachmentDescription(filename)}</span>
          </td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #eef3f5; color: #102332;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      A reviewed BugReceipt evidence report with ${escapeHtml(attachmentLabel)}.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background: #eef3f5;">
      <tr>
        <td align="center" style="padding: 32px 12px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 640px; background: #f8fbfc; border: 1px solid #bacbd2;">
            <tr>
              <td style="padding: 22px 28px; background: #102332;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td valign="middle">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="28" valign="middle" style="width: 28px; padding-right: 11px;">
                            <table role="presentation" width="24" cellspacing="0" cellpadding="0" border="0">
                              <tr><td width="24" height="4" style="width: 24px; height: 4px; background: #f8fbfc; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                              <tr><td height="3" style="height: 3px; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                              <tr><td width="18" height="4" style="width: 18px; height: 4px; background: #ff5c3a; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                              <tr><td height="3" style="height: 3px; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                              <tr><td width="12" height="4" style="width: 12px; height: 4px; background: #1f9fae; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                            </table>
                          </td>
                          <td style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 20px; line-height: 24px; font-weight: 700; color: #ffffff;">BugReceipt</td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" valign="middle" style="font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 16px; letter-spacing: 1px; text-transform: uppercase; color: #9fdce2;">Evidence report</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="height: 4px; background: #ff5c3a; font-size: 0; line-height: 0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding: 36px 36px 12px;">
                <h1 style="margin: 0; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 30px; line-height: 37px; font-weight: 700; letter-spacing: -0.5px; color: #102332;">${escapeHtml(subject)}</h1>
                <p style="margin: 14px 0 0; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #61737d;">A browser issue was captured, reviewed, and explicitly shared with you.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 36px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #e7f4f5; border-top: 1px solid #a8d2d7; border-bottom: 1px solid #a8d2d7;">
                  <tr>
                    <td style="padding: 13px 16px; font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 17px; letter-spacing: 0.7px; text-transform: uppercase; color: #176f79;">Reviewed evidence</td>
                    <td align="right" style="padding: 13px 16px; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 13px; line-height: 17px; font-weight: 700; color: #102332;">${escapeHtml(attachmentLabel)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 36px 8px;">
                ${renderReportMarkdown(report)}
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 36px 36px;">
                <h2 style="margin: 0 0 12px; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 18px; line-height: 24px; font-weight: 700; color: #102332;">Report files</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${attachmentRows}
                </table>
                <p style="margin: 14px 0 0; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 19px; color: #61737d;">Download the attachments to keep the Markdown report and its visual evidence together.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 22px 36px; background: #102332; border-top: 1px solid #1f9fae;">
                <p style="margin: 0; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 12px; line-height: 19px; color: #c5d3d8;">Captured locally with BugReceipt. Evidence leaves extension-owned storage only after an explicit share action.</p>
                <p style="margin: 8px 0 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; line-height: 16px; letter-spacing: 0.6px; text-transform: uppercase; color: #9fdce2;">Privacy-filtered browser evidence</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderReportMarkdown(markdown: string): string {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const output: string[] = [];
  let codeLines: string[] | null = null;
  let skippedTitle = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^```/.test(line)) {
      if (codeLines === null) {
        codeLines = [];
      } else {
        output.push(renderCodeBlock(codeLines));
        codeLines = null;
      }
      continue;
    }
    if (codeLines !== null) {
      codeLines.push(rawLine);
      continue;
    }
    if (!skippedTitle && /^#\s+/.test(line)) {
      skippedTitle = true;
      continue;
    }
    const section = line.match(/^##\s+(.+)$/);
    if (section) {
      output.push(
        `<h2 style="margin: 28px 0 10px; padding-top: 20px; border-top: 1px solid #bacbd2; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 18px; line-height: 25px; font-weight: 700; color: #102332;">${renderInlineMarkdown(section[1])}</h2>`,
      );
      continue;
    }
    const orderedItem = line.match(/^(\d+)\.\s+(.+)$/);
    if (orderedItem) {
      output.push(renderListItem(orderedItem[2], orderedItem[1]));
      continue;
    }
    const unorderedItem = line.match(/^[-*]\s+(.+)$/);
    if (unorderedItem) {
      output.push(renderListItem(unorderedItem[1]));
      continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      const filename = attachmentName(image[2]);
      output.push(renderAttachmentReference(image[1] || 'Captured visual', filename));
      continue;
    }
    const attachmentLink = line.match(/^\[([^\]]+)\]\((\.\/[^)]+)\)$/);
    if (attachmentLink) {
      output.push(
        renderAttachmentReference(
          attachmentLink[1] || 'Attached evidence',
          attachmentName(attachmentLink[2]),
        ),
      );
      continue;
    }
    if (/^---+$/.test(line) || line.trim() === '') continue;

    const italic = line.match(/^_([^_].*)_$/);
    output.push(
      `<p style="margin: 8px 0; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 14px; line-height: 22px; color: ${italic ? '#61737d' : '#243b49'};${italic ? ' font-style: italic;' : ''}">${renderInlineMarkdown(italic?.[1] ?? line)}</p>`,
    );
  }
  if (codeLines !== null) output.push(renderCodeBlock(codeLines));
  return output.join('\n');
}

function renderListItem(content: string, index?: string): string {
  const marker = index
    ? `<span style="display: inline-block; min-width: 24px; padding: 2px 4px; background: #102332; color: #ffffff; font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 16px; text-align: center;">${escapeHtml(index)}</span>`
    : '<span style="display: inline-block; width: 7px; height: 7px; background: #1f9fae;"></span>';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 7px 0;"><tr><td width="36" valign="top" style="width: 36px; padding-top: 2px;">${marker}</td><td style="font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 14px; line-height: 22px; color: #243b49;">${renderInlineMarkdown(content)}</td></tr></table>`;
}

function renderCodeBlock(lines: string[]): string {
  return `<pre style="margin: 10px 0 16px; padding: 16px; overflow-wrap: anywhere; white-space: pre-wrap; word-break: break-word; background: #102332; color: #d9e8ec; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 19px;">${escapeHtml(lines.join('\n') || 'No evidence captured.')}</pre>`;
}

function renderAttachmentReference(label: string, filename: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 12px 0; background: #eef3f5; border: 1px solid #bacbd2;"><tr><td style="padding: 13px 15px; font-family: 'Trebuchet MS', Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #243b49;"><strong>${escapeHtml(label)}</strong><br><span style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #176f79;">${escapeHtml(filename)}</span></td></tr></table>`;
}

function renderInlineMarkdown(value: string): string {
  const tokens = value.split(/(`[^`]+`|https?:\/\/[^\s<]+)/g);
  return tokens
    .map((token) => {
      if (/^`[^`]+`$/.test(token)) {
        return `<code style="padding: 2px 4px; background: #e7eef0; color: #102332; font-family: 'Courier New', Courier, monospace; font-size: 12px;">${escapeHtml(token.slice(1, -1))}</code>`;
      }
      if (/^https?:\/\//.test(token)) {
        const safeUrl = escapeHtml(token);
        return `<a href="${safeUrl}" style="color: #176f79; text-decoration: underline; text-underline-offset: 2px;">${safeUrl}</a>`;
      }
      return escapeHtml(token);
    })
    .join('');
}

function attachmentName(path: string): string {
  const segments = path.replace(/^\.\//, '').split('/');
  return segments.at(-1) || 'attachment';
}

function attachmentColor(filename: string): string {
  if (/\.(?:png|webp|jpe?g)$/i.test(filename)) return '#1f9fae';
  if (/\.webm$/i.test(filename)) return '#ff5c3a';
  return '#61737d';
}

function attachmentDescription(filename: string): string {
  if (filename === 'issue.md') return 'complete Markdown report';
  if (filename === 'diagnosis.md') return 'extension diagnosis';
  if (/\.webm$/i.test(filename)) return 'screen recording';
  if (/\.(?:png|webp|jpe?g)$/i.test(filename)) return 'visual evidence';
  return 'report attachment';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
