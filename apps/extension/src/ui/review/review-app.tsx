import type { CaptureSession } from '@bugreceipt/capture-model';
import { getIssueValidationErrors, renderGitHubIssue } from '@bugreceipt/issue-export';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { sendRuntimeMessage } from '../../application/protocol';
import { createReportBundle, type ReportBundleVisual } from '../../infrastructure/report-bundle';
import { readRecording } from '../../infrastructure/recording-store';
import { isReportEmailConfigured, sendReportEmail } from '../../infrastructure/report-email';
import { readScreenshot } from '../../infrastructure/screenshot-store';
import { Brand } from '../brand';

type ArtifactState = 'loading' | 'ready' | 'missing' | 'failed';

export function ReviewApp() {
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingState, setRecordingState] = useState<ArtifactState>('loading');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotState, setScreenshotState] = useState<ArtifactState>('loading');
  const [newStep, setNewStep] = useState('');
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [emailed, setEmailed] = useState(false);
  const exportBase = useMemo(
    () => (session ? createExportBase(session) : 'bugreceipt-report'),
    [session],
  );
  const validationErrors = useMemo(
    () => (session ? getIssueValidationErrors(session) : []),
    [session],
  );
  const exportReady = validationErrors.length === 0;
  const emailConfigured = isReportEmailConfigured();

  useEffect(() => {
    const objectUrls: string[] = [];
    void sendRuntimeMessage({ type: 'session:get' })
      .then(async (response) => {
        if (!response.ok) {
          setError(response.message);
          return;
        }
        if (!('session' in response) || response.session?.status !== 'ready-for-review') return;
        setSession(response.session);
        const recordingId = response.session.page?.recording?.blobId;
        if (recordingId) {
          const recording = await readRecording(recordingId);
          if (recording) {
            const url = URL.createObjectURL(recording);
            objectUrls.push(url);
            setRecordingUrl(url);
            setRecordingState('ready');
          } else {
            setRecordingState('failed');
          }
        } else {
          setRecordingState(response.session.page?.recordingError ? 'failed' : 'missing');
        }
        const blobId = response.session.page?.screenshotBlobId;
        if (!blobId) {
          setScreenshotState(response.session.page?.screenshotError ? 'failed' : 'missing');
          return;
        }
        const blob = await readScreenshot(blobId);
        if (!blob) {
          setScreenshotState('failed');
          return;
        }
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        setScreenshotUrl(url);
        setScreenshotState('ready');
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Could not load this capture.');
        setRecordingState('failed');
        setScreenshotState('failed');
      });
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function updateSession(update: (current: CaptureSession) => CaptureSession) {
    setSession((current) => (current ? update(current) : current));
    setDirty(true);
    setNotice('Unsaved changes');
  }

  async function persistReview(draft: CaptureSession): Promise<CaptureSession | null> {
    const response = await sendRuntimeMessage({
      type: 'session:update-review',
      summary: draft.summary,
      expectedBehavior: draft.expectedBehavior,
      actualBehavior: draft.actualBehavior,
      steps: draft.steps,
    });
    if (!response.ok) {
      setError(response.message);
      return null;
    }
    if (!('session' in response) || !response.session) return null;
    setSession(response.session);
    setDirty(false);
    return response.session;
  }

  async function saveReview() {
    if (!session || busy) return;
    if (!dirty) {
      setNotice('Report is already saved locally');
      return;
    }
    setBusy(true);
    setError('');
    const saved = await persistReview(session);
    setBusy(false);
    if (!saved) return;
    setNotice('Review saved locally');
  }

  function revealFirstMissingField() {
    if (!session) return;
    const blankStepIndex = session.steps.findIndex((step) => !step.text.trim());
    const target = !session.summary.trim()
      ? document.getElementById('issue-summary')
      : blankStepIndex >= 0
        ? document.querySelector<HTMLElement>(`[aria-label="Step ${blankStepIndex + 1}"]`)
        : null;
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
    setNotice('Complete the required fields shown in the report before exporting');
  }

  async function withPreparedExport(
    action: (saved: CaptureSession) => void | Promise<void>,
  ): Promise<void> {
    if (!session || busy) return;
    if (!exportReady) {
      revealFirstMissingField();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = dirty ? await persistReview(session) : session;
      if (saved) await action(saved);
    } finally {
      setBusy(false);
    }
  }

  function addStep(event: FormEvent) {
    event.preventDefault();
    const text = newStep.trim();
    if (!text || !session || session.steps.length >= 50) return;
    updateSession((current) => ({
      ...current,
      steps: [...current.steps, { id: crypto.randomUUID(), position: current.steps.length, text }],
    }));
    setNewStep('');
  }

  async function removeDiagnostic(id: string) {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    if (dirty && !(await persistReview(session))) {
      setBusy(false);
      return;
    }
    const response = await sendRuntimeMessage({ type: 'session:remove-diagnostic', id });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if ('session' in response && response.session) setSession(response.session);
    setNotice('Console entry removed');
  }

  async function removeNetworkEvent(id: string) {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    if (dirty && !(await persistReview(session))) {
      setBusy(false);
      return;
    }
    const response = await sendRuntimeMessage({ type: 'session:remove-network', id });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if ('session' in response && response.session) setSession(response.session);
    setNotice('Network entry removed');
  }

  async function removeScreenshot() {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    if (dirty && !(await persistReview(session))) {
      setBusy(false);
      return;
    }
    const response = await sendRuntimeMessage({ type: 'session:remove-screenshot' });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if ('session' in response && response.session) setSession(response.session);
    if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
    setScreenshotUrl('');
    setScreenshotState('missing');
    setNotice('Screenshot removed');
  }

  async function removeRecording() {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    if (dirty && !(await persistReview(session))) {
      setBusy(false);
      return;
    }
    const response = await sendRuntimeMessage({ type: 'session:remove-recording' });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if ('session' in response && response.session) setSession(response.session);
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl('');
    setRecordingState('missing');
    setNotice('Screen recording removed');
  }

  async function downloadReport() {
    await withPreparedExport(async (saved) => {
      const savedMarkdown = renderGitHubIssue(saved);
      const savedExportBase = createExportBase(saved);
      const visual = await readExportVisual(recordingUrl, screenshotUrl);
      if (visual) {
        const bundle = await createReportBundle(savedMarkdown, visual);
        downloadBlob(bundle, `${savedExportBase}.zip`);
        setNotice(`Downloaded ${savedExportBase}.zip with the report and visual evidence`);
        return;
      }
      downloadBlob(
        new Blob([savedMarkdown], { type: 'text/markdown;charset=utf-8' }),
        `${savedExportBase}.md`,
      );
      setNotice(`Downloaded ${savedExportBase}.md`);
    });
  }

  async function copyMarkdown() {
    await withPreparedExport(async (saved) => {
      try {
        await navigator.clipboard.writeText(renderGitHubIssue(saved));
        setNotice('Issue Markdown copied');
      } catch {
        setError('Clipboard access failed. Download the Markdown report instead.');
      }
    });
  }

  async function emailReport() {
    await withPreparedExport(async (saved) => {
      try {
        const result = await sendReportEmail({
          sessionId: saved.id,
          subject: saved.summary,
          markdown: renderGitHubIssue(saved),
          ...(recordingUrl || screenshotUrl ? { visualUrl: recordingUrl || screenshotUrl } : {}),
        });
        setEmailed(true);
        setNotice(
          result.visualAttached
            ? 'Report and visual evidence emailed'
            : 'Report emailed; the visual evidence was too large and remains local',
        );
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The report email could not be sent.');
      }
    });
  }

  async function discard() {
    const response = await sendRuntimeMessage({ type: 'session:discard' });
    if (response.ok) setSession(null);
    if (!response.ok) setError(response.message);
  }

  if (!session) {
    return (
      <main className="review-empty">
        <Brand />
        <p className="eyebrow">No reviewable capture</p>
        <h1>{error || 'Start a capture from the BugReceipt toolbar button.'}</h1>
      </main>
    );
  }

  return (
    <main className="review-shell">
      <header className="review-header">
        <Brand />
        <div className="review-status">
          <span /> {emailed ? 'Report sent by email' : 'Nothing has been uploaded'}
        </div>
      </header>

      <section className="review-intro">
        <div>
          <p className="eyebrow">Review before export</p>
          <h1>
            Make the report
            <br />
            <em>safe and useful.</em>
          </h1>
        </div>
        <div className="review-actions">
          <button
            className="button quiet"
            type="button"
            onClick={() => void saveReview()}
            disabled={busy}
          >
            {busy ? 'Working…' : dirty ? 'Save changes' : 'Save locally'}
          </button>
          <button
            className="button quiet"
            type="button"
            onClick={() => void copyMarkdown()}
            disabled={busy}
            aria-describedby={!exportReady ? 'report-check-heading' : undefined}
          >
            Copy Markdown
          </button>
          <button
            className="button quiet"
            type="button"
            onClick={() => void emailReport()}
            disabled={busy || emailed || !emailConfigured}
            aria-describedby={!exportReady ? 'report-check-heading' : undefined}
            title={
              emailConfigured
                ? undefined
                : 'Set VITE_BUGRECEIPT_REPORT_ENDPOINT when building the extension.'
            }
          >
            {emailed ? 'Report emailed' : emailConfigured ? 'Share by email' : 'Email unavailable'}
          </button>
          <button
            className="button primary"
            type="button"
            onClick={() => void downloadReport()}
            disabled={busy}
            aria-describedby={!exportReady ? 'report-check-heading' : undefined}
          >
            {recordingUrl || screenshotUrl ? 'Download report ZIP' : 'Download Markdown'}
          </button>
        </div>
      </section>

      {session.endReason && session.endReason !== 'completed' && (
        <section className="interruption-panel" role="status">
          <strong>Capture ended early.</strong>{' '}
          {session.endReason === 'origin-changed'
            ? 'The tab left the recorded site.'
            : 'The recorded tab was closed.'}{' '}
          The evidence collected before that point is still available below.
        </section>
      )}

      {(!exportReady || dirty) && (
        <section className="validation-panel" aria-labelledby="report-check-heading">
          <strong id="report-check-heading">Complete the report before export</strong>
          <ul>
            {dirty && <li>Save changes to apply local privacy filtering.</li>}
            {validationErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="evidence-grid">
        <article className="evidence-card report-card">
          <div className="card-index">
            <span>01</span>
            <strong>Issue report</strong>
          </div>
          <div className="review-field title-field">
            <label htmlFor="issue-summary">Issue title</label>
            <input
              id="issue-summary"
              value={session.summary}
              aria-invalid={!session.summary.trim()}
              maxLength={200}
              onChange={(event) =>
                updateSession((current) => ({ ...current, summary: event.target.value }))
              }
            />
          </div>
          <div className="behavior-grid">
            <div className="review-field">
              <label htmlFor="expected-behavior">Expected behavior (optional)</label>
              <textarea
                id="expected-behavior"
                value={session.expectedBehavior}
                maxLength={4_000}
                rows={4}
                placeholder="What should have happened?"
                onChange={(event) =>
                  updateSession((current) => ({
                    ...current,
                    expectedBehavior: event.target.value,
                  }))
                }
              />
            </div>
            <div className="review-field">
              <label htmlFor="actual-behavior">Actual behavior (optional)</label>
              <textarea
                id="actual-behavior"
                value={session.actualBehavior}
                maxLength={4_000}
                rows={4}
                placeholder="What happened instead?"
                onChange={(event) =>
                  updateSession((current) => ({
                    ...current,
                    actualBehavior: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <dl className="environment-list">
            <div>
              <dt>Page</dt>
              <dd>{session.page?.url}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{new Date(session.startedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>BugReceipt</dt>
              <dd>{session.environment?.reproKitVersion}</dd>
            </div>
          </dl>
          <h3>Steps to reproduce (optional)</h3>
          {session.steps.length ? (
            <ol className="review-steps editable-steps">
              {session.steps.map((step, index) => (
                <li key={step.id}>
                  <input
                    aria-label={`Step ${index + 1}`}
                    value={step.text}
                    aria-invalid={!step.text.trim()}
                    maxLength={1_000}
                    onChange={(event) =>
                      updateSession((current) => ({
                        ...current,
                        steps: current.steps.map((candidate) =>
                          candidate.id === step.id
                            ? { ...candidate, text: event.target.value }
                            : candidate,
                        ),
                      }))
                    }
                  />
                  <button
                    className="remove-action"
                    type="button"
                    aria-label={`Remove step ${index + 1}`}
                    onClick={() =>
                      updateSession((current) => ({
                        ...current,
                        steps: current.steps
                          .filter((candidate) => candidate.id !== step.id)
                          .map((candidate, position) => ({ ...candidate, position })),
                      }))
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-copy">
              No manual steps were added. You can export now or add a step for more context.
            </p>
          )}
          <form className="review-step-form" onSubmit={addStep}>
            <label htmlFor="review-new-step">Add another step</label>
            <div className="step-input-row">
              <input
                id="review-new-step"
                value={newStep}
                maxLength={1_000}
                placeholder="Clicked Complete payment"
                onChange={(event) => setNewStep(event.target.value)}
              />
              <button type="submit" disabled={!newStep.trim() || session.steps.length >= 50}>
                Add step
              </button>
            </div>
          </form>
        </article>

        <div className="evidence-stack">
          <article className="evidence-card screenshot-card recording-card">
            <div className="card-index">
              <span>02</span>
              <strong>Screen recording</strong>
            </div>
            {recordingState === 'loading' && (
              <p className="empty-copy">Loading screen recording…</p>
            )}
            {recordingState === 'ready' && recordingUrl && (
              <>
                <video
                  src={recordingUrl}
                  controls
                  preload="metadata"
                  aria-label={`Screen recording of ${session.page?.title || 'the captured page'}`}
                >
                  Your browser cannot preview this screen recording.
                </video>
                <div className="artifact-actions">
                  <button
                    className="text-action"
                    type="button"
                    onClick={() => downloadBlobFromUrl(recordingUrl, `${exportBase}.webm`)}
                  >
                    Download recording.webm
                  </button>
                  <button
                    className="remove-action"
                    type="button"
                    onClick={() => void removeRecording()}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
            {recordingState !== 'ready' && screenshotState === 'ready' && screenshotUrl && (
              <>
                <p className="artifact-fallback-label">Fallback screenshot</p>
                <img
                  src={screenshotUrl}
                  alt={`Captured page: ${session.page?.title || 'untitled page'}`}
                />
                <div className="artifact-actions">
                  <button
                    className="text-action"
                    type="button"
                    onClick={() => downloadBlobFromUrl(screenshotUrl, `${exportBase}.png`)}
                  >
                    Download screenshot.png
                  </button>
                  <button
                    className="remove-action"
                    type="button"
                    onClick={() => void removeScreenshot()}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
            {recordingState !== 'ready' && screenshotState !== 'ready' && (
              <p className="empty-copy">
                {session.page?.recordingError ||
                  session.page?.screenshotError ||
                  'No visual recording is included in this report.'}{' '}
                The Markdown report is still available.
              </p>
            )}
          </article>

          <article className="evidence-card console-card">
            <div className="card-index">
              <span>03</span>
              <strong>Console evidence</strong>
            </div>
            <div className="console-window">
              <div className="console-top">
                <span />
                <span />
                <span />
                <b>{session.diagnostics.length} captured</b>
              </div>
              {session.diagnostics.length ? (
                session.diagnostics.map((event) => (
                  <div className="console-entry" key={event.id}>
                    <time>{new Date(event.occurredAt).toLocaleTimeString()}</time>
                    <code>{event.message}</code>
                    <button
                      type="button"
                      aria-label="Remove console entry"
                      onClick={() => void removeDiagnostic(event.id)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p className="console-empty">
                  No console messages were captured after recording started.
                </p>
              )}
            </div>
            <p className="redaction-count">
              {session.filtering.redactionCount} sensitive value
              {session.filtering.redactionCount === 1 ? '' : 's'} redacted locally
            </p>
          </article>

          <article className="evidence-card network-card">
            <div className="card-index">
              <span>04</span>
              <strong>Network evidence</strong>
            </div>
            <div className="network-window">
              <div className="network-top">
                <strong>{session.network.length} requests captured</strong>
                <span>Fetch, XHR, and page resources</span>
              </div>
              {session.network.length ? (
                session.network.map((event) => (
                  <article className="network-entry" key={event.id}>
                    <div className="network-entry-heading">
                      <span className="network-method">{event.method}</span>
                      <span
                        className={
                          event.error || (event.status ?? 0) >= 400
                            ? 'network-status failed'
                            : 'network-status'
                        }
                      >
                        {event.status ?? 'FAILED'}
                      </span>
                      <time>{Math.round(event.durationMs)} ms</time>
                      <button
                        type="button"
                        aria-label="Remove network entry"
                        onClick={() => void removeNetworkEvent(event.id)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </div>
                    <code className="network-url">{event.url}</code>
                    {(event.requestBody || event.responseBody || event.error) && (
                      <details>
                        <summary>Request and response</summary>
                        {event.requestBody && (
                          <div className="network-payload">
                            <strong>Request body</strong>
                            <pre>{event.requestBody}</pre>
                          </div>
                        )}
                        {event.responseBody && (
                          <div className="network-payload">
                            <strong>Response body</strong>
                            <pre>{event.responseBody}</pre>
                          </div>
                        )}
                        {event.error && (
                          <div className="network-payload failed">
                            <strong>Error</strong>
                            <pre>{event.error}</pre>
                          </div>
                        )}
                      </details>
                    )}
                  </article>
                ))
              ) : (
                <p className="console-empty">
                  No network activity was captured after recording started.
                </p>
              )}
            </div>
          </article>
        </div>
      </section>

      <footer className="review-footer">
        <p aria-live="polite">
          {notice || 'Export creates local files only. You choose whether to publish them.'}
        </p>
        {confirmDelete ? (
          <div className="delete-confirmation" role="group" aria-label="Confirm capture deletion">
            <span>Delete this capture permanently?</span>
            <button
              className="button danger"
              type="button"
              onClick={() => void discard()}
              disabled={busy}
            >
              Delete now
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
            >
              Keep capture
            </button>
          </div>
        ) : (
          <button
            className="button danger"
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            Delete local capture
          </button>
        )}
      </footer>
      {error && (
        <p className="error-banner fixed" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlobFromUrl(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

async function readExportVisual(
  recordingUrl: string,
  screenshotUrl: string,
): Promise<ReportBundleVisual | null> {
  const url = recordingUrl || screenshotUrl;
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) throw new Error('The visual evidence could not be added to the download.');
  return {
    blob: await response.blob(),
    filename: recordingUrl ? 'recording.webm' : 'screenshot.png',
  };
}

function createExportBase(session: CaptureSession): string {
  const slug = session.summary
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 48);
  const timestamp = session.startedAt.replaceAll(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `bugreceipt-${slug || 'bug-report'}-${timestamp}`;
}
