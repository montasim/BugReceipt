import type { CaptureSession } from '@reprokit/capture-model';

export function getIssueValidationErrors(session: CaptureSession): string[] {
  const errors: string[] = [];
  if (!session.summary.trim()) errors.push('Add an issue title.');
  if (session.steps.some((step) => !step.text.trim())) {
    errors.push('Fill in or remove every reproduction step.');
  }
  return errors;
}

export function renderGitHubIssue(session: CaptureSession): string {
  const steps = session.steps.length
    ? session.steps.map((step, index) => `${index + 1}. ${step.text}`).join('\n')
    : '_No reproduction steps provided._';
  const consoleMessages = session.diagnostics.length
    ? session.diagnostics
        .map((event) => `[${event.occurredAt}] ${event.level.toUpperCase()} ${event.message}`)
        .join('\n')
    : 'No captured console messages.';
  const network = session.network.length
    ? session.network
        .map((event) => {
          const summary = `[${event.occurredAt}] ${event.method} ${event.status ?? 'FAILED'} ${event.url} (${Math.round(event.durationMs)} ms)`;
          const details = [
            event.requestBody ? `Request: ${event.requestBody}` : '',
            event.responseBody ? `Response: ${event.responseBody}` : '',
            event.error ? `Error: ${event.error}` : '',
          ].filter(Boolean);
          return details.length ? `${summary}\n${details.join('\n')}` : summary;
        })
        .join('\n\n')
    : 'No captured network activity.';
  const visualEvidence = session.page?.recording
    ? `\n## Screen recording\n\n[Open the screen recording](./recording.webm)\n\n_Keep \`recording.webm\` beside this report. Upload it with the issue when publishing._\n`
    : session.page?.screenshotBlobId
      ? `\n## Screenshot\n\n![Captured screenshot](./screenshot.png)\n\n_Keep \`screenshot.png\` beside this report. Upload it with the issue when publishing._\n`
      : '';

  return `# ${session.summary || 'Bug report'}

## Steps to reproduce

${steps}

## Expected behavior

${session.expectedBehavior || '_Not provided._'}

## Actual behavior

${session.actualBehavior || '_Not provided._'}

## Environment

- Page: ${session.page?.url || session.origin}
- Browser: ${session.environment?.userAgent || 'Unknown'}
- Platform: ${session.environment?.platform || 'Unknown'}
- ReproKit: ${session.environment?.reproKitVersion || 'Unknown'}

## Console messages

\`\`\`text
${consoleMessages.replaceAll('```', '` ` `')}
\`\`\`

## Network activity

\`\`\`text
${network.replaceAll('```', '` ` `')}
\`\`\`
${visualEvidence}

---
Captured locally with ReproKit. Review this report before publishing.
`;
}
