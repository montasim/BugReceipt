import { getTabWithMetadata } from '../src/infrastructure/tab-metadata';
import {
  getSelectedFrames,
  runtimeRequestSchema,
  type RuntimeRequest,
  type RuntimeResponse,
} from '@bugreceipt/capture-model';
import { defineBackground } from 'wxt/utils/define-background';
import {
  appendCaptureWarning,
  appendDiagnostic,
  appendNetworkEvent,
  addSelectedFrame,
  appendStep,
  clearSession,
  createSession,
  finalizeSession,
  interruptSession,
  loadSession,
  removeDiagnostic,
  removeNetworkEvent,
  removeRecordingReference,
  removeSelectedFrameReference,
  setEvidenceExcluded,
  removeScreenshotReference,
  saveSession,
  setSelectedFrame,
  updateReview,
} from '../src/application/session-store';
import {
  clearCorrection,
  clearCorrectionCollection,
  createCorrection,
  appendCorrection,
  loadCorrectionCollection,
  loadCorrection,
  saveCorrectionCollection,
  setActiveCorrection,
  updateCorrectionDraft,
  updateCorrection,
} from '../src/application/correction-store';
import { interruptCaptureAfterTabClosed } from '../src/application/capture-lifecycle';
import { DebuggerRecorder } from '../src/infrastructure/debugger-recorder';
import { deleteScreenshot, saveScreenshot } from '../src/infrastructure/screenshot-store';
import { deleteRecording } from '../src/infrastructure/recording-store';
import { deleteAnnotationDocument } from '../src/infrastructure/annotation-store';

type RecordingEvidence = NonNullable<
  NonNullable<NonNullable<Awaited<ReturnType<typeof loadSession>>>['page']>['recording']
>;

let requestQueue = Promise.resolve();
const pendingEvidence: Array<() => Promise<unknown>> = [];
let drainScheduled = false;
function enqueueEvidence(write: () => Promise<unknown>): void {
  pendingEvidence.push(write);
  if (drainScheduled) return;
  drainScheduled = true;
  const task = requestQueue.then(flushEvidence);
  requestQueue = task.catch(() => undefined);
}
async function flushEvidence(): Promise<void> {
  try {
    while (pendingEvidence.length) {
      try {
        await pendingEvidence.shift()?.();
      } catch {
        const session = await loadSession();
        if (session?.status === 'recording')
          await appendCaptureWarning(
            session.id,
            'Some browser evidence could not be saved. The report may be incomplete.',
          ).catch(() => undefined);
      }
    }
  } finally {
    drainScheduled = false;
  }
}
const recorder = new DebuggerRecorder({
  diagnostic: (id, event) => enqueueEvidence(() => appendDiagnostic(id, event)),
  network: (id, event) => enqueueEvidence(() => appendNetworkEvent(id, event, event.id)),
  warning: (id, message) => enqueueEvidence(() => appendCaptureWarning(id, message)),
});

export default defineBackground(() => {
  void initializeSidePanel();
  void initializeCorrectionMenu();
  // Chrome 125+ keeps an active debugger worker alive. On an extension restart,
  // persisted captures can outlive the attachment and must not look complete.
  const recovery = requestQueue.then(async () => {
    const session = await loadSession();
    if (session?.status === 'recording')
      await appendCaptureWarning(
        session.id,
        'The extension restarted during capture. Browser evidence recording is no longer connected. Start a new capture to reconnect.',
      );
  });
  requestQueue = recovery.catch(() => undefined);
  chrome.runtime.onMessage.addListener(
    (raw: unknown, _sender, sendResponse: (response: RuntimeResponse) => void) => {
      const parsed = runtimeRequestSchema.safeParse(raw);
      if (!parsed.success) return false;
      const request = parsed.data;
      const task = requestQueue.then(() => handleRequest(request));
      requestQueue = task.then(
        () => undefined,
        () => undefined,
      );
      void task.then(sendResponse).catch((error: unknown) => {
        sendResponse({
          ok: false,
          code: 'capture-failed',
          message:
            error instanceof Error ? error.message : 'BugReceipt could not complete that action.',
        });
      });
      return true;
    },
  );
  chrome.debugger.onEvent.addListener((source, method, params) => {
    void recorder.event(source, method, params).catch(() => {
      enqueueEvidence(async () => {
        const session = await loadSession();
        if (session?.status === 'recording')
          await appendCaptureWarning(session.id, 'Some browser evidence could not be processed.');
      });
    });
  });
  chrome.debugger.onDetach.addListener((source, reason) => recorder.detached(source, reason));
  chrome.tabs.onRemoved.addListener((tabId) => {
    const task = requestQueue.then(() =>
      interruptCaptureAfterTabClosed(tabId, {
        loadSession,
        interrupt: (reason) => finishInterruptedCapture(reason),
      }),
    );
    requestQueue = task.then(
      () => undefined,
      () => undefined,
    );
    void task.catch(() => undefined);
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== 'bugreceipt-suggest-correction' || !tab?.id) return;
    // Open synchronously from the context-menu gesture; delayed API calls can lose user activation.
    void chrome.sidePanel.open({ tabId: tab.id }).catch(() => undefined);
    void startCorrectionFromSelection(tab, info.selectionText ?? '').catch(() => undefined);
  });
});

async function initializeSidePanel(): Promise<void> {
  await chrome.sidePanel.setOptions({ path: 'sidepanel.html', enabled: true });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

async function initializeCorrectionMenu(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: 'bugreceipt-suggest-correction',
    title: 'Suggest a correction',
    contexts: ['selection'],
  });
}

async function startCorrectionFromSelection(tab: chrome.tabs.Tab, selectionText: string) {
  if (!tab.id || !tab.url || !selectionText.trim()) return;
  const url = new URL(tab.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;
  const selection = await readSelectionContext(tab.id).catch(() => undefined);
  const context = selection?.context;
  let report = createCorrection(tab, selectionText, context, selection?.sourceLocale);
  await appendCorrection(report);
  const screenshot = await captureCorrectionScreenshot(tab.windowId, tab.id, context?.rect);
  report = {
    ...report,
    page: {
      ...report.page,
      ...(screenshot.screenshotBlobId ? { screenshotBlobId: screenshot.screenshotBlobId } : {}),
      ...(screenshot.screenshotError ? { screenshotError: screenshot.screenshotError } : {}),
    },
  };
  const collection = await loadCorrectionCollection();
  if (!collection) return;
  await saveCorrectionCollection({
    ...collection,
    corrections: collection.corrections.map((item) => (item.id === report.id ? report : item)),
    updatedAt: new Date().toISOString(),
  });
}

async function readSelectionContext(tabId: number) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return undefined;
      const range = selection.getRangeAt(0);
      const element = range.commonAncestorContainer.parentElement;
      const rect = range.getBoundingClientRect();
      const text = document.body?.innerText ?? '';
      const selected = selection.toString();
      const index = text.indexOf(selected);
      const sourceLocale =
        document.documentElement.lang ||
        document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
        document.querySelector('meta[name="language"]')?.getAttribute('content') ||
        navigator.language;
      return {
        context: {
          before: index >= 0 ? text.slice(Math.max(0, index - 200), index) : undefined,
          after:
            index >= 0
              ? text.slice(index + selected.length, index + selected.length + 200)
              : undefined,
          element: element?.tagName.toLowerCase(),
          rect:
            rect.width > 0 && rect.height > 0
              ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
              : undefined,
        },
        sourceLocale,
      };
    },
  });
  return results[0]?.result;
}

async function captureCorrectionScreenshot(
  windowId: number,
  tabId: number,
  rect?: { x: number; y: number; width: number; height: number },
) {
  try {
    if (rect) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (selectionRect) => {
          const marker = document.createElement('div');
          marker.dataset.bugreceiptCorrectionMarker = 'true';
          Object.assign(marker.style, {
            position: 'fixed',
            left: `${selectionRect.x}px`,
            top: `${selectionRect.y}px`,
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`,
            border: '3px solid #ff5c3a',
            background: 'rgba(255, 92, 58, 0.12)',
            pointerEvents: 'none',
            zIndex: '2147483647',
          });
          document.documentElement.append(marker);
        },
        args: [rect],
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return {
      screenshotBlobId: await saveScreenshot(
        await chrome.tabs.captureVisibleTab(windowId, { format: 'png' }),
      ),
    };
  } catch {
    return { screenshotError: 'Chrome could not capture a screenshot of this page.' };
  } finally {
    if (rect) {
      await chrome.scripting
        .executeScript({
          target: { tabId },
          func: () =>
            document.querySelector('[data-bugreceipt-correction-marker="true"]')?.remove(),
        })
        .catch(() => undefined);
    }
  }
}

async function handleRequest(request: RuntimeRequest): Promise<RuntimeResponse> {
  switch (request.type) {
    case 'session:get':
      return { ok: true, session: await loadSession() };
    case 'correction:get':
      return { ok: true, correction: await loadCorrection() };
    case 'correction:get-collection':
      return { ok: true, correctionCollection: await loadCorrectionCollection() };
    case 'correction:update':
      return { ok: true, correction: await updateCorrection(request) };
    case 'correction:update-draft':
      return { ok: true, correctionCollection: await updateCorrectionDraft(request) };
    case 'correction:set-active':
      return { ok: true, correctionCollection: await setActiveCorrection(request.correctionId) };
    case 'correction:discard': {
      const correction = await loadCorrection();
      if (correction?.page.screenshotBlobId)
        await deleteScreenshot(correction.page.screenshotBlobId);
      await clearCorrection();
      return { ok: true };
    }
    case 'correction:discard-collection': {
      const collection = await loadCorrectionCollection();
      for (const item of collection?.corrections ?? []) {
        if (item.page.screenshotBlobId) await deleteScreenshot(item.page.screenshotBlobId);
      }
      await clearCorrectionCollection();
      return { ok: true };
    }
    case 'session:start': {
      const current = await loadSession();
      if (current?.status === 'recording') return { ok: true, session: current };
      if (current?.page?.screenshotBlobId) await deleteScreenshot(current.page.screenshotBlobId);
      await deleteSelectedFrameArtifacts(getSelectedFrames(current?.page));
      if (current?.page?.recording?.blobId) await deleteRecording(current.page.recording.blobId);
      const tab = await getTabWithMetadata(request.tabId);
      if (!tab.active) {
        throw new Error('The selected page is no longer active. Return to it and try again.');
      }
      let session = createSession(tab, request.sessionId);
      if (request.recordingError) {
        session = {
          ...session,
          page: session.page
            ? {
                ...session.page,
                recordingError: request.recordingError,
              }
            : undefined,
        };
      }
      session = await saveSession(session);
      try {
        await recorder.start(session.tabId, session.id);
      } catch (error) {
        await recorder.stop();
        await flushEvidence();
        await finishScreenRecording(session);
        await deleteRecording(session.id).catch(() => undefined);
        await clearSession();
        throw error;
      }
      await chrome.action.setBadgeBackgroundColor({ color: '#ff5c3a' });
      await chrome.action.setBadgeText({ text: 'REC', tabId: session.tabId });
      return { ok: true, session };
    }
    case 'session:add-step':
      return { ok: true, session: await appendStep(request.text) };
    case 'session:update-review':
      return {
        ok: true,
        session: await updateReview({
          summary: request.summary,
          description: request.description,
          expectedBehavior: request.expectedBehavior,
          actualBehavior: request.actualBehavior,
          steps: request.steps,
        }),
      };
    case 'session:remove-diagnostic':
      return { ok: true, session: await removeDiagnostic(request.id) };
    case 'session:remove-network':
      return { ok: true, session: await removeNetworkEvent(request.id) };
    case 'session:set-evidence-excluded':
      return {
        ok: true,
        session: await setEvidenceExcluded(request.kind, request.excluded, request.id),
      };
    case 'session:add-selected-frame':
      return { ok: true, session: await addSelectedFrame(request.frame) };
    case 'session:set-selected-frame': {
      const session = await loadSession();
      const previousFrames = getSelectedFrames(session?.page);
      const updated = await setSelectedFrame(request.frame);
      await deleteSelectedFrameArtifacts(
        previousFrames.filter((frame) => frame.blobId !== request.frame.blobId),
      );
      return { ok: true, session: updated };
    }
    case 'session:remove-selected-frame': {
      const session = await loadSession();
      if (!session || session.status !== 'ready-for-review') {
        throw new Error('No reviewable capture exists.');
      }
      const frames = getSelectedFrames(session.page);
      const blobId = request.blobId ?? frames.at(-1)?.blobId;
      const frame = frames.find((candidate) => candidate.blobId === blobId);
      const updated = await removeSelectedFrameReference(blobId);
      if (frame) await deleteSelectedFrameArtifacts([frame]);
      return { ok: true, session: updated };
    }
    case 'session:remove-recording': {
      const session = await loadSession();
      if (!session || session.status !== 'ready-for-review') {
        throw new Error('No reviewable capture exists.');
      }
      if (session.page?.recording?.blobId) {
        await deleteRecording(session.page.recording.blobId);
      }
      return { ok: true, session: await removeRecordingReference() };
    }
    case 'session:remove-screenshot': {
      const session = await loadSession();
      if (!session || session.status !== 'ready-for-review') {
        throw new Error('No reviewable capture exists.');
      }
      if (session.page?.screenshotBlobId) {
        await deleteScreenshot(session.page.screenshotBlobId);
      }
      return { ok: true, session: await removeScreenshotReference() };
    }
    case 'diagnostic:append':
    case 'network:append':
      throw new Error('Page messages cannot submit browser evidence.');
    case 'session:stop': {
      const session = await loadSession();
      if (!session || session.status !== 'recording') throw new Error('No recording is active.');
      const tab = await getTabWithMetadata(session.tabId);
      if (!tab.active) throw new Error('Return to the recorded tab before stopping the capture.');
      const { recording, recordingError } = await finishScreenRecording(session);
      const { screenshotBlobId, screenshotError } = recording
        ? {}
        : await captureScreenshotFallback(session.windowId);
      await recorder.stop();
      await flushEvidence();
      const finalized = await finalizeSession(
        tab,
        recording,
        recordingError,
        screenshotBlobId,
        screenshotError,
      );
      await chrome.action.setBadgeText({ text: '', tabId: session.tabId });
      await chrome.tabs.create({ url: chrome.runtime.getURL('/review.html') });
      if (typeof chrome.sidePanel?.close === 'function') {
        await chrome.sidePanel.close({ windowId: session.windowId }).catch(() => undefined);
      }
      return { ok: true, session: finalized };
    }
    case 'session:discard': {
      const session = await loadSession();
      if (session?.status === 'recording') {
        await Promise.allSettled([recorder.stop(), finishScreenRecording(session)]);
      }
      await flushEvidence();
      if (session?.page?.screenshotBlobId) await deleteScreenshot(session.page.screenshotBlobId);
      await deleteSelectedFrameArtifacts(getSelectedFrames(session?.page));
      if (session?.page?.recording?.blobId) await deleteRecording(session.page.recording.blobId);
      if (session) await deleteRecording(session.id).catch(() => undefined);
      await clearSession();
      if (session) await chrome.action.setBadgeText({ text: '', tabId: session.tabId });
      return { ok: true };
    }
  }
}

async function deleteSelectedFrameArtifacts(
  frames: ReturnType<typeof getSelectedFrames>,
): Promise<void> {
  await Promise.allSettled(
    frames.flatMap((frame) => [
      deleteScreenshot(frame.blobId),
      deleteAnnotationDocument(frame.blobId),
    ]),
  );
}

async function finishInterruptedCapture(
  reason: Parameters<typeof interruptSession>[0],
): Promise<Awaited<ReturnType<typeof interruptSession>>> {
  const session = await loadSession();
  if (!session || session.status !== 'recording') throw new Error('No recording is active.');
  await recorder.stop();
  await flushEvidence();
  const { recording, recordingError } = await finishScreenRecording(session);
  return interruptSession(reason, recording, recordingError);
}

async function finishScreenRecording(
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
): Promise<{
  recording?: RecordingEvidence;
  recordingError?: string;
}> {
  if (session.page?.recordingError) return { recordingError: session.page.recordingError };
  try {
    const response: unknown = await chrome.runtime.sendMessage({
      target: 'reprokit-sidepanel',
      type: 'recording:stop',
      sessionId: session.id,
    });
    if (!isSuccessfulRecordingResponse(response) || !('recording' in response)) {
      throw new Error(getRecordingResponseError(response));
    }
    return { recording: response.recording };
  } catch (error) {
    return {
      recordingError:
        error instanceof Error ? error.message : 'Chrome could not finish the tab recording.',
    };
  }
}

async function captureScreenshotFallback(windowId: number) {
  try {
    return {
      screenshotBlobId: await saveScreenshot(
        await chrome.tabs.captureVisibleTab(windowId, { format: 'png' }),
      ),
    };
  } catch {
    return { screenshotError: 'Chrome could not capture a fallback screenshot of this page.' };
  }
}

function isSuccessfulRecordingResponse(value: unknown): value is {
  ok: true;
  recording?: RecordingEvidence;
} {
  if (!value || typeof value !== 'object' || (value as { ok?: unknown }).ok !== true) return false;
  const recording = (value as { recording?: unknown }).recording;
  if (recording === undefined) return true;
  if (!recording || typeof recording !== 'object') return false;
  const candidate = recording as Partial<RecordingEvidence>;
  return (
    typeof candidate.blobId === 'string' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.sizeBytes === 'number' &&
    typeof candidate.durationMs === 'number'
  );
}

function getRecordingResponseError(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { message?: unknown }).message === 'string'
  ) {
    return (value as { message: string }).message;
  }
  return 'Chrome could not finish the tab recording.';
}
