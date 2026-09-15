import { withTabMetadata } from '../../infrastructure/tab-metadata';
import type { CaptureSession } from '@bugreceipt/capture-model';
import { useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../application/protocol';
import {
  abortDesktopRecording,
  startDesktopRecording,
} from '../../infrastructure/desktop-recorder';
import { useOffensiveLanguageValidation } from '../use-offensive-language-validation';

export type PendingAction =
  | 'loading'
  | 'starting'
  | 'adding-step'
  | 'stopping'
  | 'discarding'
  | 'returning'
  | 'opening-review'
  | null;

export function useCaptureWorkflow() {
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [step, setStep] = useState('');
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [activeTabUrl, setActiveTabUrl] = useState('');
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>('loading');
  const [clockNow, setClockNow] = useState(() => Date.now());
  const stepModeration = useOffensiveLanguageValidation(step);

  useEffect(() => {
    let generation = 0;
    const readActiveTab = async () => {
      const requestGeneration = ++generation;
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0] ? await withTabMetadata(tabs[0]) : undefined;
      if (requestGeneration !== generation) return;
      const url = tab?.url ?? '';
      setActiveTabId(tab?.id ?? null);
      setActiveTabUrl(url);
    };
    const handleTabActivated = () =>
      void readActiveTab().catch(() => {
        setActiveTabUrl('');
        setError('BugReceipt could not read the active tab. Reopen the side panel and retry.');
      });
    const handleTabUpdated = (
      _tabId: number,
      change: { status?: string; url?: string; title?: string },
    ) => {
      if (change.status || change.url || change.title) handleTabActivated();
    };
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
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
    return () => {
      generation++;
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, []);

  const recordingStartedAt =
    session?.status === 'recording' ? Date.parse(session.startedAt) : Number.NaN;
  const recordingElapsedMs = Number.isFinite(recordingStartedAt)
    ? Math.max(0, clockNow - recordingStartedAt)
    : 0;

  useEffect(() => {
    if (!Number.isFinite(recordingStartedAt)) return;
    const intervalId = window.setInterval(() => {
      setClockNow(Date.now());
      void sendRuntimeMessage({ type: 'session:get' })
        .then((response) => {
          if (response.ok && 'session' in response) setSession(response.session);
        })
        .catch(() => undefined);
    }, 1_000);
    return () => window.clearInterval(intervalId);
  }, [recordingStartedAt]);

  async function start() {
    if (activeTabId === null || !activeTabUrl) {
      setError('BugReceipt could not identify the page tab. Switch tabs and try again.');
      return;
    }
    if (!isRecordablePage(activeTabUrl)) {
      setError(
        'This page cannot be recorded. Open a regular HTTP or HTTPS page, then return to BugReceipt.',
      );
      return;
    }
    setError('');
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
      setError('BugReceipt could not start the capture. Choose the affected tab and try again.');
    }
    setPendingAction(null);
  }

  async function addStep() {
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
    if (response.ok && 'session' in response && response.session) setSession(response.session);
    if (!response.ok) setError(response.message);
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
    } catch {
      setError('The recorded tab is no longer available. Discard this capture and start again.');
    } finally {
      setPendingAction(null);
    }
  }

  async function openReview() {
    if (!session) return;
    setPendingAction('opening-review');
    setError('');
    try {
      await chrome.action.setBadgeText({ text: '', tabId: session.tabId }).catch(() => undefined);
      await chrome.tabs.create({ url: chrome.runtime.getURL('/review.html') });
      if (typeof chrome.sidePanel?.close === 'function') {
        await chrome.sidePanel.close({ windowId: session.windowId }).catch(() => undefined);
      }
    } catch {
      setError('The review could not be opened. Try again.');
    } finally {
      setPendingAction(null);
    }
  }

  return {
    session,
    step,
    setStep,
    error,
    pendingAction,
    busy: pendingAction !== null,
    recordingElapsedMs,
    recordingElsewhere:
      session?.status === 'recording' && activeTabId !== null && activeTabId !== session.tabId,
    stepModeration,
    start,
    addStep,
    stop,
    discard,
    returnToRecordedTab,
    openReview,
  };
}

function chooseTabToRecord(): Promise<string> {
  return new Promise((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(['tab'], (streamId) => resolve(streamId));
  });
}

function isRecordablePage(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (
      url.hostname === 'chromewebstore.google.com' ||
      (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))
    ) {
      return false;
    }
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function formatRecordingDuration(elapsedMs: number): string {
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

export function getInterruptionCopy(endReason: CaptureSession['endReason']) {
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
