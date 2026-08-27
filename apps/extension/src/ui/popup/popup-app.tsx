import type { CaptureSession } from '@reprokit/capture-model';
import { type FormEvent, useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../application/protocol';
import {
  abortDesktopRecording,
  startDesktopRecording,
} from '../../infrastructure/desktop-recorder';
import { Brand } from '../brand';

export function PopupApp() {
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [step, setStep] = useState('');
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [activeTabUrl, setActiveTabUrl] = useState('');
  const [hasSiteAccess, setHasSiteAccess] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

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
        setError('ReproKit could not read the active tab. Reopen the side panel and retry.'),
      )
      .finally(() => setBusy(false));
    return () => chrome.tabs.onActivated.removeListener(handleTabActivated);
  }, []);

  async function start() {
    if (activeTabId === null || !activeTabUrl) {
      setError('ReproKit could not identify the page tab. Switch tabs and try again.');
      return;
    }
    const originPattern = getOriginPattern(activeTabUrl);
    if (!originPattern) {
      setError('ReproKit can capture only regular web pages.');
      return;
    }
    setError('');
    setNotice('');
    if (!hasSiteAccess) {
      setBusy(true);
      let allowed: boolean;
      try {
        allowed = await chrome.permissions.request({ origins: [originPattern] });
      } catch {
        setError('Chrome could not request access to this site.');
        setBusy(false);
        return;
      }
      if (!allowed) {
        setError('Site access is required to capture this tab.');
        setBusy(false);
        return;
      }
      setHasSiteAccess(true);
      setNotice('Site access granted. Select Choose tab & start to begin.');
      setBusy(false);
      return;
    }

    setBusy(true);
    const streamId = await chooseTabToRecord();
    if (!streamId) {
      setError('No tab was selected. Select a tab to start recording.');
      setBusy(false);
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
      setError('ReproKit could not initialize this capture. Try again.');
    }
    setBusy(false);
  }

  async function addStep(event: FormEvent) {
    event.preventDefault();
    if (!step.trim()) return;
    setBusy(true);
    const response = await sendRuntimeMessage({ type: 'session:add-step', text: step });
    if (response.ok && 'session' in response) {
      setSession(response.session);
      setStep('');
    }
    if (!response.ok) setError(response.message);
    setBusy(false);
  }

  async function stop() {
    setBusy(true);
    const response = await sendRuntimeMessage({ type: 'session:stop' });
    if (response.ok && 'session' in response) {
      setSession(response.session);
      setBusy(false);
    } else if (!response.ok) {
      setError(response.message);
      setBusy(false);
    }
  }

  async function discard() {
    setBusy(true);
    const response = await sendRuntimeMessage({ type: 'session:discard' });
    if (response.ok) setSession(null);
    if (!response.ok) setError(response.message);
    setBusy(false);
  }

  async function returnToRecordedTab() {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      await chrome.windows.update(session.windowId, { focused: true });
      await chrome.tabs.update(session.tabId, { active: true });
      setActiveTabId(session.tabId);
      setBusy(false);
    } catch {
      setError('The recorded tab is no longer available. Discard this capture and start again.');
      setBusy(false);
    }
  }

  async function openReview() {
    if (!session) return;
    setBusy(true);
    await Promise.allSettled([
      chrome.action.setBadgeText({ text: '', tabId: session.tabId }),
      chrome.tabs.create({ url: chrome.runtime.getURL('/review.html') }),
    ]);
    setBusy(false);
  }

  const recordingElsewhere =
    session?.status === 'recording' && activeTabId !== null && activeTabId !== session.tabId;
  const interruptionCopy = session ? getInterruptionCopy(session.endReason) : null;

  return (
    <main className="popup-shell">
      <header className="popup-header panel-header">
        <Brand />
        <a
          className="support-link"
          href="https://www.supportkori.com/montasim"
          target="_blank"
          rel="noreferrer"
          aria-label="Support ReproKit on SupportKori"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" />
            <path d="M6 1v3M10 1v3M14 1v3" />
          </svg>
          Support
        </a>
      </header>
      {busy && !session ? (
        <div className="empty-panel" aria-live="polite">
          Reading capture state…
        </div>
      ) : session?.status === 'recording' ? (
        <section className="capture-panel">
          <div className="recording-line">
            <span className="recording-dot" />
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
                  className="button primary"
                  type="button"
                  onClick={() => void returnToRecordedTab()}
                  disabled={busy}
                >
                  Return to recorded tab
                </button>
                <button
                  className="button quiet"
                  type="button"
                  onClick={() => void discard()}
                  disabled={busy}
                >
                  Discard capture
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
                <label htmlFor="step">What did you do?</label>
                <div className="step-input-row">
                  <input
                    id="step"
                    value={step}
                    onChange={(event) => setStep(event.target.value)}
                    placeholder="Clicked Save"
                    maxLength={1_000}
                  />
                  <button
                    className="icon-button"
                    type="submit"
                    disabled={busy || !step.trim()}
                    aria-label="Add step"
                  >
                    +
                  </button>
                </div>
              </form>

              <div className="popup-actions">
                <button
                  className="button primary"
                  type="button"
                  onClick={() => void stop()}
                  disabled={busy}
                >
                  Stop & review
                </button>
                <button
                  className="button quiet"
                  type="button"
                  onClick={() => void discard()}
                  disabled={busy}
                >
                  Discard
                </button>
              </div>
              <p className="privacy-note">
                Video, console, and network evidence stay local and are filtered before storage.
              </p>
            </>
          )}
        </section>
      ) : session?.status === 'ready-for-review' ? (
        <section className="empty-panel">
          <p className="eyebrow">{interruptionCopy ? 'Capture interrupted' : 'Capture ready'}</p>
          <h1>{interruptionCopy?.title ?? 'Your evidence is waiting.'}</h1>
          {interruptionCopy && <p>{interruptionCopy.detail}</p>}
          <div className="ready-actions">
            <button
              className="button primary"
              type="button"
              onClick={() => void openReview()}
              disabled={busy}
            >
              Open review
            </button>
            <button className="button quiet" type="button" onClick={() => void discard()}>
              Discard
            </button>
          </div>
        </section>
      ) : (
        <section className="start-panel">
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
            ReproKit captures only what happens after you start. You review everything before
            export.
          </p>
          <button
            className="button primary full"
            type="button"
            onClick={() => void start()}
            disabled={busy || activeTabId === null || !activeTabUrl}
          >
            {hasSiteAccess ? 'Choose tab & start' : 'Allow site access'}
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
