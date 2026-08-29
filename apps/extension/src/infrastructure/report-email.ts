const extensionEnvironment = import.meta.env as Record<string, unknown>;
const configuredEndpoint =
  extensionEnvironment['VITE_BUGRECEIPT_REPORT_ENDPOINT'] ??
  extensionEnvironment['VITE_REPROKIT_REPORT_ENDPOINT'];
const REPORT_ENDPOINT =
  typeof configuredEndpoint === 'string' && configuredEndpoint
    ? configuredEndpoint
    : import.meta.env.DEV
      ? 'http://localhost:3000/api/reports'
      : '';
const MAX_EMAIL_VISUAL_BYTES = 4 * 1024 * 1024;

export function isReportEmailConfigured(): boolean {
  return Boolean(REPORT_ENDPOINT);
}

export async function sendReportEmail(input: {
  sessionId: string;
  subject: string;
  markdown: string;
  visualUrl?: string;
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
  let visualAttached = false;
  if (input.visualUrl) {
    const visual = await (await fetch(input.visualUrl)).blob();
    if (visual.size <= MAX_EMAIL_VISUAL_BYTES) {
      const filename =
        input.visualFilename ?? (visual.type === 'image/png' ? 'screenshot.png' : 'recording.webm');
      form.set('visual', new File([visual], filename, { type: visual.type }));
      visualAttached = true;
    }
  }

  const response = await fetch(REPORT_ENDPOINT, { method: 'POST', body: form });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || 'The report email could not be sent.');
  return { visualAttached };
}
