import {
  diagnosticEventSchema,
  getSelectedFrames,
  networkEventSchema,
  runtimeRequestSchema,
  type RuntimeRequest,
  type RuntimeResponse,
} from '@bugreceipt/capture-model';
import { defineBackground } from 'wxt/utils/define-background';
import {
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
  removeScreenshotReference,
  saveSession,
  setSelectedFrame,
  updateReview,
} from '../src/application/session-store';
import {
  interruptCaptureAfterTabClosed,
  restoreCaptureAfterNavigation,
} from '../src/application/capture-lifecycle';
import {
  installBridge,
  installRecorder,
  uninstallBridge,
  uninstallRecorder,
} from '../src/infrastructure/page-instrumentation';
import { deleteScreenshot, saveScreenshot } from '../src/infrastructure/screenshot-store';
import { deleteRecording } from '../src/infrastructure/recording-store';
import { deleteAnnotationDocument } from '../src/infrastructure/annotation-store';

type RecordingEvidence = NonNullable<
  NonNullable<NonNullable<Awaited<ReturnType<typeof loadSession>>>['page']>['recording']
>;

let requestQueue = Promise.resolve();

export default defineBackground(() => {
  void initializeSidePanel();
  chrome.runtime.onMessage.addListener(
    (raw: unknown, sender, sendResponse: (response: RuntimeResponse) => void) => {
      const parsed = runtimeRequestSchema.safeParse(raw);
      if (!parsed.success) return false;
      const request = parsed.data;
      const task = requestQueue.then(() => handleRequest(request, sender));
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
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const task = requestQueue.then(async () => {
      const outcome = await restoreCaptureAfterNavigation(tabId, changeInfo, tab, {
        loadSession,
        inject: injectCapture,
        interrupt: (reason) => finishInterruptedCapture(reason),
      });
      if (outcome === 'interrupted') {
        await chrome.action.setBadgeBackgroundColor({ color: '#1f9fae' });
        await chrome.action.setBadgeText({ text: '!', tabId });
      }
    });
    requestQueue = task.then(
      () => undefined,
      () => undefined,
    );
    void task.catch(() => undefined);
  });
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
});

async function initializeSidePanel(): Promise<void> {
  await chrome.sidePanel.setOptions({ path: 'sidepanel.html', enabled: true });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

async function handleRequest(
  request: RuntimeRequest,
  sender: chrome.runtime.MessageSender,
): Promise<RuntimeResponse> {
  switch (request.type) {
    case 'session:get':
      return { ok: true, session: await loadSession() };
    case 'session:start': {
      const current = await loadSession();
      if (current?.status === 'recording') return { ok: true, session: current };
      if (current?.page?.screenshotBlobId) await deleteScreenshot(current.page.screenshotBlobId);
      await deleteSelectedFrameArtifacts(getSelectedFrames(current?.page));
      if (current?.page?.recording?.blobId) await deleteRecording(current.page.recording.blobId);
      const tab = await chrome.tabs.get(request.tabId);
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
        await injectCapture(session.tabId, session.id);
      } catch (error) {
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
          expectedBehavior: request.expectedBehavior,
          actualBehavior: request.actualBehavior,
          steps: request.steps,
        }),
      };
    case 'session:remove-diagnostic':
      return { ok: true, session: await removeDiagnostic(request.id) };
    case 'session:remove-network':
      return { ok: true, session: await removeNetworkEvent(request.id) };
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
    case 'diagnostic:append': {
      if (sender.tab?.id === undefined) throw new Error('Diagnostics must come from a tab.');
      const session = await loadSession();
      if (!session || sender.tab.id !== session.tabId) throw new Error('Diagnostic tab mismatch.');
      const event = diagnosticEventSchema.omit({ id: true }).parse(request.event);
      return {
        ok: true,
        session: await appendDiagnostic(request.sessionId, {
          ...event,
          id: crypto.randomUUID(),
        }),
      };
    }
    case 'network:append': {
      if (sender.tab?.id === undefined) throw new Error('Network evidence must come from a tab.');
      const session = await loadSession();
      if (!session || sender.tab.id !== session.tabId) throw new Error('Network tab mismatch.');
      const event = networkEventSchema.omit({ id: true }).parse(request.event);
      return {
        ok: true,
        session: await appendNetworkEvent(request.sessionId, event),
      };
    }
    case 'session:stop': {
      const session = await loadSession();
      if (!session || session.status !== 'recording') throw new Error('No recording is active.');
      const tab = await chrome.tabs.get(session.tabId);
      if (!tab.active) throw new Error('Return to the recorded tab before stopping the capture.');
      const { recording, recordingError } = await finishScreenRecording(session);
      const { screenshotBlobId, screenshotError } = recording
        ? {}
        : await captureScreenshotFallback(session.windowId);
      await removeCapture(session.tabId);
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
        await Promise.allSettled([removeCapture(session.tabId), finishScreenRecording(session)]);
      }
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

async function injectCapture(tabId: number, sessionId: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'ISOLATED',
    func: installBridge,
    args: [sessionId],
  });
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: installRecorder,
    args: [sessionId],
  });
}

async function removeCapture(tabId: number): Promise<void> {
  await Promise.allSettled([
    chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: uninstallRecorder }),
    chrome.scripting.executeScript({ target: { tabId }, world: 'ISOLATED', func: uninstallBridge }),
  ]);
}
