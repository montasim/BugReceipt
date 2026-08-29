import {
  describeCaptureEnvironment,
  type CaptureSession,
  type EvidenceTextAnnotation,
} from '@bugreceipt/capture-model';

export function getIssueValidationErrors(session: CaptureSession): string[] {
  const errors: string[] = [];
  if (!session.summary.trim()) errors.push('Add an issue title.');
  if (session.steps.some((step) => !step.text.trim())) {
    errors.push('Fill in or remove every reproduction step.');
  }
  return errors;
}

export function renderGitHubIssue(
  session: CaptureSession,
  textAnnotations: readonly EvidenceTextAnnotation[] = [],
): string {
  const environment = describeCaptureEnvironment(session.environment);
  const eventIds = new Set([
    ...session.diagnostics.map((event) => event.id),
    ...session.network.map((event) => event.id),
  ]);
  const activeTextAnnotations = textAnnotations.filter((annotation) =>
    eventIds.has(annotation.eventId),
  );
  const steps = session.steps.length
    ? session.steps.map((step, index) => `${index + 1}. ${step.text}`).join('\n')
    : '_No reproduction steps provided._';
  const consoleMessages = session.diagnostics.length
    ? session.diagnostics
        .map(
          (event) =>
            `[${event.occurredAt}] ${event.level.toUpperCase()} ${annotateText(event.message, 'console', event.id, 'message', activeTextAnnotations)}`,
        )
        .join('\n')
    : 'No captured console messages.';
  const network = session.network.length
    ? session.network
        .map((event) => {
          const method = annotateText(
            event.method,
            'network',
            event.id,
            'method',
            activeTextAnnotations,
          );
          const statusValue = String(event.status ?? 'FAILED');
          const status = annotateText(
            statusValue,
            'network',
            event.id,
            'status',
            activeTextAnnotations,
          );
          const url = annotateText(event.url, 'network', event.id, 'url', activeTextAnnotations);
          const durationValue = `${Math.round(event.durationMs)} ms`;
          const duration = annotateText(
            durationValue,
            'network',
            event.id,
            'duration',
            activeTextAnnotations,
          );
          const summary = `[${event.occurredAt}] ${method} ${status} ${url} (${duration})`;
          const details = [
            event.requestBody
              ? `Request: ${annotateText(event.requestBody, 'network', event.id, 'requestBody', activeTextAnnotations)}`
              : '',
            event.responseBody
              ? `Response: ${annotateText(event.responseBody, 'network', event.id, 'responseBody', activeTextAnnotations)}`
              : '',
            event.error
              ? `Error: ${annotateText(event.error, 'network', event.id, 'error', activeTextAnnotations)}`
              : '',
          ].filter(Boolean);
          return details.length ? `${summary}\n${details.join('\n')}` : summary;
        })
        .join('\n\n')
    : 'No captured network activity.';
  const textAnnotationLegend = activeTextAnnotations.length
    ? '\n_Annotated selections are wrapped in ⟦double brackets⟧._\n'
    : '';
  const selectedFrameEvidence = session.page?.selectedFrame
    ? `\n## Selected video frame\n\n![Frame captured at ${formatVideoTime(session.page.selectedFrame.videoTimeMs)}](./selected-frame.png)\n\n_Captured from the screen recording at ${formatVideoTime(session.page.selectedFrame.videoTimeMs)}._\n`
    : '';
  const recordingEvidence = session.page?.recording
    ? `\n## Screen recording\n\n[Open the screen recording](./recording.webm)\n\n_Keep \`recording.webm\` beside this report. Upload it with the issue when publishing._\n`
    : '';
  const fallbackScreenshotEvidence =
    !session.page?.recording && session.page?.screenshotBlobId
      ? `\n## Screenshot\n\n![Captured screenshot](./screenshot.png)\n\n_Keep \`screenshot.png\` beside this report. Upload it with the issue when publishing._\n`
      : '';
  const visualEvidence = `${selectedFrameEvidence}${recordingEvidence}${fallbackScreenshotEvidence}`;

  return `# ${session.summary || 'Bug report'}

## Steps to reproduce

${steps}

## Expected behavior

${session.expectedBehavior || '_Not provided._'}

## Actual behavior

${session.actualBehavior || '_Not provided._'}

## Environment

- Page: ${session.page?.url || session.origin}
- Started: ${session.startedAt}
- Operating system: ${environment.operatingSystem}
- Browser: ${environment.browser}
- Platform: ${environment.platform}
- User agent: ${environment.userAgent}
- BugReceipt: ${session.environment?.reproKitVersion || 'Unknown'}

## Console messages
${textAnnotationLegend}

\`\`\`text
${consoleMessages.replaceAll('```', '` ` `')}
\`\`\`

## Network activity

\`\`\`text
${network.replaceAll('```', '` ` `')}
\`\`\`
${visualEvidence}

---
Captured locally with BugReceipt. Review this report before publishing.
`;
}

function annotateText(
  value: string,
  source: EvidenceTextAnnotation['source'],
  eventId: string,
  field: EvidenceTextAnnotation['field'],
  annotations: readonly EvidenceTextAnnotation[],
): string {
  const matches = annotations
    .filter(
      (annotation) =>
        annotation.source === source &&
        annotation.eventId === eventId &&
        annotation.field === field &&
        annotation.start >= 0 &&
        annotation.end <= value.length &&
        annotation.end > annotation.start,
    )
    .sort((left, right) => left.start - right.start);
  if (!matches.length) return value;

  const output: string[] = [];
  let cursor = 0;
  for (const annotation of matches) {
    if (annotation.start < cursor) continue;
    output.push(value.slice(cursor, annotation.start));
    output.push(`⟦${value.slice(annotation.start, annotation.end)}⟧`);
    cursor = annotation.end;
  }
  output.push(value.slice(cursor));
  return output.join('');
}

function formatVideoTime(timeMs: number): string {
  const minutes = Math.floor(timeMs / 60_000);
  const seconds = Math.floor((timeMs % 60_000) / 1_000);
  const milliseconds = timeMs % 1_000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}
