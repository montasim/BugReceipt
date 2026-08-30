import type { ReportBundleVisual } from './report-bundle';

const extensionEnvironment = import.meta.env as Record<string, unknown>;
const configuredEndpoint = extensionEnvironment['VITE_BUGRECEIPT_REPORT_ENDPOINT'];
const REPORT_ENDPOINT =
  typeof configuredEndpoint === 'string' && configuredEndpoint
    ? configuredEndpoint
    : import.meta.env.DEV
      ? 'http://localhost:3000/api/reports'
      : '';
const MAX_EMAIL_REQUEST_BYTES = 4 * 1024 * 1024;

export function isReportEmailConfigured(): boolean {
  return Boolean(REPORT_ENDPOINT);
}

export async function sendReportEmail(input: {
  sessionId: string;
  subject: string;
  markdown: string;
  diagnosis?: string;
  visuals?: readonly ReportBundleVisual[];
  /** @deprecated Pass prepared visuals so email and local exports share the same files. */
  visualUrl?: string;
  /** @deprecated Pass prepared visuals so email and local exports share the same files. */
  visualFilename?: 'recording.webm' | 'selected-frame.png' | 'screenshot.png';
}): Promise<{ visualAttached: boolean }> {
  if (!REPORT_ENDPOINT) {
    throw new Error(
      'Email delivery is not configured in this extension build. Set VITE_BUGRECEIPT_REPORT_ENDPOINT and rebuild.',
    );
  }
  const form = new FormData();
  form.set('sessionId', input.sessionId);
  form.set('subject', input.subject);
  form.set('report', input.markdown);
  if (input.diagnosis) form.set('diagnosis', input.diagnosis);
  const visuals = [...(input.visuals ?? [])];
  if (visuals.length === 0 && input.visualUrl) {
    const visual = await (await fetch(input.visualUrl)).blob();
    const filename =
      input.visualFilename ?? (visual.type === 'image/png' ? 'screenshot.png' : 'recording.webm');
    visuals.push({ blob: visual, filename });
  }
  const requestBytes =
    new Blob([input.markdown]).size +
    new Blob([input.diagnosis ?? '']).size +
    visuals.reduce((total, visual) => total + visual.blob.size, 0);
  if (requestBytes > MAX_EMAIL_REQUEST_BYTES) {
    throw new Error(
      'All report files must total 4 MB or less for email. Download the ZIP instead or remove visual evidence.',
    );
  }
  for (const visual of visuals) {
    form.append('visual', new File([visual.blob], visual.filename, { type: visual.blob.type }));
  }

  let response: Response;
  try {
    response = await fetch(REPORT_ENDPOINT, { method: 'POST', body: form });
  } catch (cause) {
    throw new Error(
      isLocalReportEndpoint(REPORT_ENDPOINT)
        ? 'The local email server is not running. Start it with `pnpm dev:web`, then try again.'
        : 'BugReceipt could not reach the email service. Check your connection and try again.',
      { cause },
    );
  }
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || 'The report email could not be sent.');
  return { visualAttached: visuals.length > 0 };
}

function isLocalReportEndpoint(endpoint: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(endpoint).hostname);
  } catch {
    return false;
  }
}
