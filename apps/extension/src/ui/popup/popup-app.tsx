import type { CaptureSession } from '@bugreceipt/capture-model';
import { type FormEvent, useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../application/protocol';
import {
  abortDesktopRecording,
  startDesktopRecording,
} from '../../infrastructure/desktop-recorder';
import { ActivityIndicator } from '../activity-indicator';
import { Brand } from '../brand';
import { SupportLink } from '../support-link';
import { useOffensiveLanguageValidation } from '../use-offensive-language-validation';

type PendingAction =
  | 'loading'
  | 'granting-access'
  | 'starting'
  | 'adding-step'
  | 'stopping'
  | 'discarding'
  | 'returning'
  | 'opening-review'
  | null;

export function PopupApp() {
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [step, setStep] = useState('');
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [activeTabUrl, setActiveTabUrl] = useState('');
  const [hasSiteAccess, setHasSiteAccess] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>('loading');
  const [clockNow, setClockNow] = useState(() => Date.now());
  const stepModeration = useOffensiveLanguageValidation(step);
  const busy = pendingAction !== null;

  useEffect(() => {
    const readActiveTab = async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tabs[0]?.url ?? '';
      const originPattern = getOriginPattern(url);
      setActiveTabId(tabs[0]?.id ?? null);
      setActiveTabUrl(url);
      setHasSiteAccess(
        originPattern ? await chrome.permissions.contains({ origins: [originPattern] }) : false,
      );
      setNotice('');
    };
    const handleTabActivated = () => void readActiveTab();
    chrome.tabs.onActivated.addListener(handleTabActivated);
    void Promise.all([sendRuntimeMessage({ type: 'session:get' }), readActiveTab()])
      .then(([response]) => {
        if (response.ok && 'session' in response) setSession(response.session);
        if (!response.ok) setError(response.message);
      })
      .catch(() =>
        setError('BugReceipt could not read the active tab. Reopen the side panel and retry.'),
      )
      .finally(() => setPendingAction(null));
    return () => chrome.tabs.onActivated.removeListener(handleTabActivated);
  }, []);

  const recordingStartedAt =
    session?.status === 'recording' ? Date.parse(session.startedAt) : Number.NaN;
  const recordingElapsedMs = Number.isFinite(recordingStartedAt)
    ? Math.max(0, clockNow - recordingStartedAt)
    : 0;

  useEffect(() => {
    if (!Number.isFinite(recordingStartedAt)) return;
    const intervalId = window.setInterval(() => setClockNow(Date.now()), 1_000);
    return () => window.clearInterval(intervalId);
  }, [recordingStartedAt]);

  async function start() {
    if (activeTabId === null || !activeTabUrl) {
      setError('BugReceipt could not identify the page tab. Switch tabs and try again.');
      return;
    }
    const originPattern = getOriginPattern(activeTabUrl);
    if (!originPattern) {
      setError('BugReceipt can capture only regular web pages.');
      return;
    }
    setError('');
    setNotice('');
    if (!hasSiteAccess) {
      setPendingAction('granting-access');
      let allowed: boolean;
      try {
        allowed = await chrome.permissions.request({ origins: [originPattern] });
      } catch {
        setError('Chrome could not request access to this site.');
        setPendingAction(null);
        return;
      }
      if (!allowed) {
        setError('Site access is required to capture this tab.');
        setPendingAction(null);
        return;
      }
      setHasSiteAccess(true);
      setNotice('Site access granted. Select Choose tab & start to begin.');
      setPendingAction(null);
      return;
    }

    setPendingAction('starting');
    const streamId = await chooseTabToRecord();
    if (!streamId) {
      setError('No tab was selected. Select a tab to start recording.');
      setPendingAction(null);
      return;
    }
    const sessionId = crypto.randomUUID();
    let recordingError: string | undefined;
    try {
      await startDesktopRecording(sessionId, streamId);
    } catch (cause) {
      recordingError =
        cause instanceof Error
          ? `${cause.message} A final screenshot will be captured instead.`.slice(0, 500)
          : 'Chrome could not start the screen recording. A final screenshot will be captured instead.';
    }
    try {
      const response = await sendRuntimeMessage({
        type: 'session:start',
        tabId: activeTabId,
        sessionId,
        ...(recordingError ? { recordingError } : {}),
      });
      if (response.ok && 'session' in response) setSession(response.session);
      if (!response.ok) {
        await abortDesktopRecording(sessionId);
        setError(response.message);
      }
    } catch {
      await abortDesktopRecording(sessionId);
      setError('BugReceipt could not initialize this capture. Try again.');
    }
    setPendingAction(null);
  }

  async function addStep(event: FormEvent) {
    event.preventDefault();
    if (!step.trim()) return;
    setPendingAction('adding-step');
    const moderationError = await stepModeration.validateNow();
    if (moderationError) {
      document.getElementById('step')?.focus();
      setPendingAction(null);
      return;
    }
    const response = await sendRuntimeMessage({ type: 'session:add-step', text: step });
    if (response.ok && 'session' in response) {
      setSession(response.session);
      setStep('');
    }
    if (!response.ok) setError(response.message);
    setPendingAction(null);
  }

  async function stop() {
    setPendingAction('stopping');
    setError('');
    const response = await sendRuntimeMessage({ type: 'session:stop' });
    if (response.ok && 'session' in response && response.session) {
      setSession(response.session);
    } else if (!response.ok) {
      setError(response.message);
    }
    setPendingAction(null);
  }

  async function discard() {
    setPendingAction('discarding');
    const response = await sendRuntimeMessage({ type: 'session:discard' });
    if (response.ok) setSession(null);
    if (!response.ok) setError(response.message);
    setPendingAction(null);
  }

  async function returnToRecordedTab() {
    if (!session) return;
    setPendingAction('returning');
    setError('');
    try {
      await chrome.windows.update(session.windowId, { focused: true });
      await chrome.tabs.update(session.tabId, { active: true });
      setActiveTabId(session.tabId);
      setPendingAction(null);
    } catch {
      setError('The recorded tab is no longer available. Discard this capture and start again.');
      setPendingAction(null);
    }
  }

  async function openReview() {
    if (!session) return;
    setPendingAction('opening-review');
    setError('');
    try {
      await showReview(session);
    } catch {
      setError('The review could not be opened. Try again.');
    }
    setPendingAction(null);
  }

  async function showReview(reviewSession: CaptureSession) {
    await chrome.action
      .setBadgeText({ text: '', tabId: reviewSession.tabId })
      .catch(() => undefined);
    await chrome.tabs.create({ url: chrome.runtime.getURL('/review.html') });
    if (typeof chrome.sidePanel?.close === 'function') {
      await chrome.sidePanel.close({ windowId: reviewSession.windowId }).catch(() => undefined);
    }
  }

  const recordingElsewhere =
    session?.status === 'recording' && activeTabId !== null && activeTabId !== session.tabId;
  const interruptionCopy = session ? getInterruptionCopy(session.endReason) : null;

  return (
    <main className="popup-shell">
      <header className="popup-header panel-header">
        <Brand />
        <SupportLink />
      </header>
      {pendingAction === 'loading' && !session ? (
        <div className="empty-panel panel-state panel-loading-state" aria-live="polite">
          <ActivityIndicator />
          <span>Reading capture state…</span>
        </div>
      ) : session?.status === 'recording' ? (
        <section className="capture-panel panel-state">
          <div className="recording-line">
            <div className="recording-clock">
              <time
                className="recording-timer"
                role="timer"
                aria-label="Recording duration"
                dateTime={`PT${Math.floor(recordingElapsedMs / 1_000)}S`}
              >
                {formatRecordingDuration(recordingElapsedMs)}
              </time>
              <span className="recording-dot" aria-hidden="true" />
            </div>
            <div>
              <p className="eyebrow">
                {recordingElsewhere ? 'Recording another tab' : 'Recording this tab'}
              </p>
              <p className="capture-origin">{session.origin}</p>
            </div>
            <span className="event-count">
              {session.diagnostics.length + session.network.length} events
            </span>
          </div>

          {recordingElsewhere ? (
            <div className="other-tab-state">
              <h1>The capture is still running.</h1>
              <p>Return to the recorded tab before adding steps or finishing the report.</p>
              <div className="popup-actions stacked">
                <button
                  className="button primary button-with-status"
                  type="button"
                  onClick={() => void returnToRecordedTab()}
                  disabled={busy}
                  aria-busy={pendingAction === 'returning'}
                  aria-label={pendingAction === 'returning' ? 'Opening recorded tab' : undefined}
                >
                  {pendingAction === 'returning' ? <ActivityIndicator /> : null}
                  {pendingAction === 'returning' ? 'Opening tab…' : 'Return to recorded tab'}
                </button>
                <button
                  className="button quiet button-with-status"
                  type="button"
                  onClick={() => void discard()}
                  disabled={busy}
                  aria-busy={pendingAction === 'discarding'}
                  aria-label={pendingAction === 'discarding' ? 'Discarding capture' : undefined}
                >
                  {pendingAction === 'discarding' ? <ActivityIndicator /> : null}
                  {pendingAction === 'discarding' ? 'Discarding…' : 'Discard capture'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {session.page?.recordingError && (
                <p className="capture-warning" role="status">
                  {session.page.recordingError}
                </p>
              )}
              <div className="evidence-rule">
                <span>Steps</span>
                <span>{session.steps.length}/50</span>
              </div>
              {session.steps.length > 0 && (
                <ol className="step-list">
                  {session.steps.map((item) => (
                    <li key={item.id}>{item.text}</li>
                  ))}
                </ol>
              )}
              <form className="step-form" onSubmit={(event) => void addStep(event)}>
                <div className="step-form-heading">
                  <label htmlFor="step">What did you do?</label>
                  <button
                    className="add-step-button button-with-status"
                    type="submit"
                    disabled={busy || !step.trim() || Boolean(stepModeration.error)}
                    aria-busy={pendingAction === 'adding-step'}
                    aria-label={pendingAction === 'adding-step' ? 'Adding step' : 'Add step'}
                    title="Add step (Ctrl or Command + Enter)"
                  >
                    {pendingAction === 'adding-step' ? <ActivityIndicator /> : null}
                    <span>{pendingAction === 'adding-step' ? 'Adding…' : 'Add step'}</span>
                    {pendingAction !== 'adding-step' ? (
                      <svg aria-hidden="true" viewBox="0 0 20 20">
                        <path d="M10 4v12M4 10h12" />
                      </svg>
                    ) : null}
                  </button>
                </div>
                <div className="step-input-row">
                  <textarea
                    id="step"
                    value={step}
                    onChange={(event) => setStep(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey)) return;
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }}
                    placeholder="Clicked Save"
                    maxLength={1_000}
                    rows={3}
                    aria-invalid={Boolean(stepModeration.error)}
                    aria-busy={stepModeration.checking}
                    aria-describedby={
                      stepModeration.error
                        ? 'step-character-count step-moderation-error'
                        : 'step-character-count'
                    }
                  />
                </div>
                <span className="step-character-count" id="step-character-count">
                  {step.length}/1,000
                </span>
                {stepModeration.error ? (
                  <p className="field-validation-error" id="step-moderation-error" role="status">
                    {stepModeration.error}
                  </p>
                ) : null}
              </form>

              <div className="popup-actions capture-actions">
                <button
                  className="button primary button-with-status"
                  type="button"
                  onClick={() => void stop()}
                  disabled={busy}
                  aria-busy={pendingAction === 'stopping'}
                  aria-label={pendingAction === 'stopping' ? 'Preparing review' : undefined}
                >
                  {pendingAction === 'stopping' ? <ActivityIndicator /> : null}
                  {pendingAction === 'stopping' ? 'Preparing review…' : 'Stop & review'}
                </button>
                <button
                  className="button quiet button-with-status"
                  type="button"
                  onClick={() => void discard()}
                  disabled={busy}
                  aria-busy={pendingAction === 'discarding'}
                  aria-label={pendingAction === 'discarding' ? 'Discarding capture' : undefined}
                >
                  {pendingAction === 'discarding' ? <ActivityIndicator /> : null}
                  {pendingAction === 'discarding' ? 'Discarding…' : 'Discard'}
                </button>
              </div>
              <p className="privacy-note">
                Video, console, and network evidence stay local and are filtered before storage.
              </p>
            </>
          )}
        </section>
      ) : session?.status === 'ready-for-review' ? (
        <section className="empty-panel panel-state">
          <p className="eyebrow">{interruptionCopy ? 'Capture interrupted' : 'Capture ready'}</p>
          <h1>{interruptionCopy?.title ?? 'Your evidence is waiting.'}</h1>
          {interruptionCopy && <p>{interruptionCopy.detail}</p>}
          <div className="ready-actions">
            <button
              className="button primary button-with-status"
              type="button"
              onClick={() => void openReview()}
              disabled={busy}
              aria-busy={pendingAction === 'opening-review'}
              aria-label={pendingAction === 'opening-review' ? 'Opening review' : undefined}
            >
              {pendingAction === 'opening-review' ? <ActivityIndicator /> : null}
              {pendingAction === 'opening-review' ? 'Opening…' : 'Open review'}
            </button>
            <button
              className="button quiet button-with-status"
              type="button"
              onClick={() => void discard()}
              disabled={busy}
              aria-busy={pendingAction === 'discarding'}
              aria-label={pendingAction === 'discarding' ? 'Discarding capture' : undefined}
            >
              {pendingAction === 'discarding' ? <ActivityIndicator /> : null}
              {pendingAction === 'discarding' ? 'Discarding…' : 'Discard'}
            </button>
          </div>
        </section>
      ) : (
        <section className="start-panel panel-state">
          <p className="eyebrow">A useful bug report in one pass</p>
          <h1>
            Record the failure.
            <br />
            <em>Keep the evidence.</em>
          </h1>
          <div className="mini-evidence" aria-hidden="true">
            <span>01 · Steps</span>
            <span>02 · Console</span>
            <span>03 · Network</span>
            <span>04 · Screen</span>
          </div>
          <p>
            BugReceipt captures only what happens after you start. You review everything before
            export.
          </p>
          <button
            className="button primary full button-with-status"
            type="button"
            onClick={() => void start()}
            disabled={busy || activeTabId === null || !activeTabUrl}
            aria-busy={pendingAction === 'granting-access' || pendingAction === 'starting'}
            aria-label={
              pendingAction === 'granting-access'
                ? 'Requesting site access'
                : pendingAction === 'starting'
                  ? 'Starting capture'
                  : undefined
            }
          >
            {pendingAction === 'granting-access' || pendingAction === 'starting' ? (
              <ActivityIndicator />
            ) : null}
            {pendingAction === 'granting-access'
              ? 'Requesting access…'
              : pendingAction === 'starting'
                ? 'Starting capture…'
                : hasSiteAccess
                  ? 'Choose tab & start'
                  : 'Allow site access'}
          </button>
          {notice && (
            <p className="privacy-note" role="status">
              {notice}
            </p>
          )}
          <p className="privacy-note">
            Chrome asks which tab to record. No account, microphone, tab audio, or upload.
          </p>
        </section>
      )}

      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}

function chooseTabToRecord(): Promise<string> {
  return new Promise((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(['tab'], (streamId) => resolve(streamId));
  });
}

function getOriginPattern(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    return ['http:', 'https:'].includes(url.protocol) ? `${url.origin}/*` : null;
  } catch {
    return null;
  }
}

function formatRecordingDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const minuteText = String(minutes).padStart(2, '0');
  const secondText = String(seconds).padStart(2, '0');
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${minuteText}:${secondText}`
    : `${minuteText}:${secondText}`;
}

function getInterruptionCopy(endReason: CaptureSession['endReason']) {
  if (endReason === 'origin-changed') {
    return {
      title: 'The tab left the recorded site.',
      detail: 'Your steps and console evidence are safe. Review the partial report before export.',
    };
  }
  if (endReason === 'tab-closed') {
    return {
      title: 'The recorded tab was closed.',
      detail: 'Your steps and console evidence are safe. Review the partial report before export.',
    };
  }
  return null;
}
