import {
  describeCaptureEnvironment,
  getSelectedFrames,
  type CaptureSession,
} from '@bugreceipt/capture-model';

const MAX_DIAGNOSIS_CHARACTERS = 120_000;

export function renderExtensionDiagnosisReport(session: CaptureSession): string {
  const environment = describeCaptureEnvironment(session.environment);
  const selectedFrames = getSelectedFrames(session.page);
  const lines = [
    '# BugReceipt diagnosis report',
    '',
    '> Included with explicit consent from the Report an issue form.',
    '',
    '## Extension and capture',
    '',
    `- BugReceipt version: ${inline(session.environment?.reproKitVersion || 'Unknown')}`,
    `- Capture ID: ${session.id}`,
    `- Capture status: ${inline(session.status)}`,
    `- Started: ${inline(session.startedAt)}`,
    `- Stopped: ${inline(session.stoppedAt || 'Not recorded')}`,
    `- End reason: ${inline(session.endReason || 'Not recorded')}`,
    '',
    '## Page and environment',
    '',
    `- Page title: ${inline(session.page?.title || 'Unavailable')}`,
    `- Page URL: ${inline(session.page?.url || session.origin)}`,
    `- Browser: ${inline(environment.browser)}`,
    `- Operating system: ${inline(environment.operatingSystem)}`,
    `- Platform: ${inline(environment.platform)}`,
    `- User agent: ${inline(environment.userAgent)}`,
    '',
    '## Evidence inventory',
    '',
    `- Reproduction steps: ${session.steps.length}`,
    `- Console events: ${session.diagnostics.length}`,
    `- Network events: ${session.network.length}`,
    `- Selected frames: ${selectedFrames.length}`,
    `- Recording: ${session.page?.recording ? 'Available' : 'Unavailable'}`,
    `- Fallback screenshot: ${session.page?.screenshotBlobId ? 'Available' : 'Unavailable'}`,
    `- Sensitive values redacted locally: ${session.filtering.redactionCount}`,
    `- Events dropped by local filtering: ${session.filtering.droppedEventCount}`,
    '',
    '## Console diagnostics',
    '',
  ];

  if (session.diagnostics.length === 0) {
    lines.push('No console diagnostics were captured.');
  } else {
    for (const event of session.diagnostics) {
      lines.push(
        `- ${inline(event.occurredAt)} · ${inline(event.kind)} · ${inline(event.level)}`,
        `  - Message: ${inline(event.message)}`,
      );
      if (event.stack) lines.push(`  - Stack: ${inline(event.stack)}`);
    }
  }

  lines.push('', '## Network diagnostics', '');
  if (session.network.length === 0) {
    lines.push('No network diagnostics were captured.');
  } else {
    for (const event of session.network) {
      lines.push(
        `- ${inline(event.occurredAt)} · ${inline(event.method)} · ${inline(event.url)}`,
        `  - Result: ${event.status ?? 'Failed'} · ${Math.round(event.durationMs)} ms · ${inline(event.resourceType)}`,
      );
      if (event.error) lines.push(`  - Error: ${inline(event.error)}`);
    }
  }

  lines.push(
    '',
    '> Recordings, screenshots, selected frames, and network request or response bodies are not included in this diagnosis report.',
  );
  return truncateDiagnosis(lines.join('\n'));
}

function inline(value: string): string {
  return value.replaceAll(/\s+/g, ' ').replaceAll('|', '\\|').trim() || 'Unavailable';
}

function truncateDiagnosis(report: string): string {
  if (report.length <= MAX_DIAGNOSIS_CHARACTERS) return report;
  const notice =
    '\n\n> Additional diagnostic entries were truncated locally before email delivery.';
  return `${report.slice(0, MAX_DIAGNOSIS_CHARACTERS - notice.length)}${notice}`;
}
