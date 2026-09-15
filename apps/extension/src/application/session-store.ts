import {
  captureSessionSchema,
  getSelectedFrames,
  MAX_SELECTED_FRAMES,
  reviewUpdateSchema,
  type CaptureEndReason,
  type CaptureSession,
  type EvidenceExclusionKind,
  type NetworkEvent,
  type ReviewUpdate,
  type SelectedFrame,
} from '@bugreceipt/capture-model';
import { filterPayload, filterRequestHeaders, filterText, filterUrl } from '@bugreceipt/privacy';

const SESSION_KEY = 'reprokit:capture-session';

export async function loadSession(): Promise<CaptureSession | null> {
  const stored = (await chrome.storage.session.get(SESSION_KEY))[SESSION_KEY];
  if (stored === undefined) return null;
  const parsed = captureSessionSchema.safeParse(stored);
  if (parsed.success) return parsed.data;
  await chrome.storage.session.remove(SESSION_KEY);
  return null;
}

export async function saveSession(session: CaptureSession): Promise<CaptureSession> {
  const validated = captureSessionSchema.parse(session);
  await chrome.storage.session.set({ [SESSION_KEY]: validated });
  return validated;
}

export async function clearSession(): Promise<void> {
  await chrome.storage.session.remove(SESSION_KEY);
}

export function createSession(
  tab: chrome.tabs.Tab,
  id: string = crypto.randomUUID(),
): CaptureSession {
  if (typeof tab.id !== 'number' || typeof tab.windowId !== 'number' || !tab.url) {
    throw new Error('The active tab cannot be captured.');
  }
  const url = new URL(tab.url);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('BugReceipt can capture only regular web pages.');
  }
  const startedAt = new Date().toISOString();
  return {
    schemaVersion: 1,
    id,
    status: 'recording',
    tabId: tab.id,
    windowId: tab.windowId,
    origin: url.origin,
    startedAt,
    summary: tab.title ? `Bug on ${tab.title}`.slice(0, 200) : 'Bug report',
    description: '',
    expectedBehavior: '',
    actualBehavior: '',
    steps: [],
    diagnostics: [],
    network: [],
    page: {
      url: filterUrl(tab.url, true),
      title: filterText(tab.title ?? '').value,
      capturedAt: startedAt,
    },
    filtering: { redactionCount: 0, droppedEventCount: 0 },
  };
}

export async function appendStep(text: string): Promise<CaptureSession> {
  const session = await requireSession('recording');
  const filtered = filterText(text.trim());
  return saveSession({
    ...session,
    steps: [
      ...session.steps,
      { id: crypto.randomUUID(), position: session.steps.length, text: filtered.value },
    ],
    filtering: {
      ...session.filtering,
      redactionCount: session.filtering.redactionCount + filtered.redactionCount,
    },
  });
}

export async function appendDiagnostic(
  sessionId: string,
  event: CaptureSession['diagnostics'][number],
): Promise<CaptureSession> {
  const session = await requireSession('recording');
  if (session.id !== sessionId) throw new Error('This diagnostic belongs to a stale session.');
  if (session.diagnostics.length >= 500) {
    return saveEvidenceSession(session, {
      ...session,
      filtering: {
        ...session.filtering,
        droppedEventCount: session.filtering.droppedEventCount + 1,
      },
    });
  }
  const message = filterText(event.message);
  const stack = event.stack ? filterText(event.stack) : undefined;
  return saveEvidenceSession(session, {
    ...session,
    diagnostics: [
      ...session.diagnostics,
      {
        ...event,
        id: crypto.randomUUID(),
        message: message.value,
        ...(stack ? { stack: stack.value } : {}),
      },
    ],
    filtering: {
      ...session.filtering,
      redactionCount:
        session.filtering.redactionCount + message.redactionCount + (stack?.redactionCount ?? 0),
    },
  });
}

export async function appendNetworkEvent(
  sessionId: string,
  event: Omit<NetworkEvent, 'id'>,
  evidenceId: string = crypto.randomUUID(),
): Promise<CaptureSession> {
  const session = await requireSession('recording');
  if (session.id !== sessionId) throw new Error('This network event belongs to a stale session.');
  const existingIndex = session.network.findIndex((item) => item.id === evidenceId);
  if (existingIndex < 0 && session.network.length >= 500) {
    return saveEvidenceSession(session, {
      ...session,
      filtering: {
        ...session.filtering,
        droppedEventCount: session.filtering.droppedEventCount + 1,
      },
    });
  }
  const requestHeaders = event.requestHeaders
    ? filterRequestHeaders(event.requestHeaders)
    : undefined;
  const requestBody = event.requestBody ? filterPayload(event.requestBody, 16_384) : undefined;
  const responseBody = event.responseBody ? filterPayload(event.responseBody) : undefined;
  const error = event.error ? filterText(event.error) : undefined;
  const filteredEvent = {
    ...event,
    id: evidenceId,
    url: filterUrl(event.url),
    ...(requestHeaders ? { requestHeaders: requestHeaders.headers } : {}),
    ...(requestBody ? { requestBody: requestBody.value } : {}),
    ...(responseBody ? { responseBody: responseBody.value } : {}),
    ...(error ? { error: error.value } : {}),
  };
  return saveEvidenceSession(session, {
    ...session,
    network:
      existingIndex < 0
        ? [...session.network, filteredEvent]
        : session.network.map((item, index) => (index === existingIndex ? filteredEvent : item)),
    filtering: {
      ...session.filtering,
      redactionCount:
        session.filtering.redactionCount +
        (requestHeaders?.redactionCount ?? 0) +
        (requestBody?.redactionCount ?? 0) +
        (responseBody?.redactionCount ?? 0) +
        (error?.redactionCount ?? 0),
    },
  });
}

export async function removeNetworkEvent(id: string): Promise<CaptureSession> {
  const session = await requireSession('ready-for-review');
  return saveSession({ ...session, network: session.network.filter((event) => event.id !== id) });
}

export async function setEvidenceExcluded(
  kind: EvidenceExclusionKind,
  excluded: boolean,
  id?: string,
): Promise<CaptureSession> {
  const session = await requireSession('ready-for-review');
  const exclusions = session.exclusions ?? {
    diagnosticIds: [],
    networkIds: [],
    selectedFrameBlobIds: [],
    recording: false,
    screenshot: false,
  };
  if (kind === 'recording' || kind === 'screenshot') {
    return saveSession({ ...session, exclusions: { ...exclusions, [kind]: excluded } });
  }
  if (!id) throw new Error('An evidence identifier is required.');
  const key =
    kind === 'diagnostic'
      ? 'diagnosticIds'
      : kind === 'network'
        ? 'networkIds'
        : 'selectedFrameBlobIds';
  const ids = exclusions[key].filter((candidate) => candidate !== id);
  if (excluded) ids.push(id);
  return saveSession({ ...session, exclusions: { ...exclusions, [key]: ids } });
}

export async function updateReview(update: ReviewUpdate): Promise<CaptureSession> {
  const session = await requireSession('ready-for-review');
  const draft = reviewUpdateSchema.parse(update);
  const summary = filterText(draft.summary);
  const description = filterText(draft.description ?? '');
  const expectedBehavior = filterText(draft.expectedBehavior);
  const actualBehavior = filterText(draft.actualBehavior);
  let redactionCount =
    summary.redactionCount +
    description.redactionCount +
    expectedBehavior.redactionCount +
    actualBehavior.redactionCount;
  redactionCount += [
    draft.summary,
    draft.description ?? '',
    draft.expectedBehavior,
    draft.actualBehavior,
    ...draft.steps.map((step) => step.text),
  ].reduce((count, value) => count + (value.match(/\[REDACTED\]/g)?.length ?? 0), 0);
  const steps = draft.steps.map((step, position) => {
    const filtered = filterText(step.text);
    redactionCount += filtered.redactionCount;
    return { ...step, position, text: filtered.value };
  });

  const previousReviewRedactionCount = session.filtering.reviewRedactionCount ?? 0;
  return saveSession({
    ...session,
    summary: summary.value,
    description: description.value,
    expectedBehavior: expectedBehavior.value,
    actualBehavior: actualBehavior.value,
    steps,
    filtering: {
      ...session.filtering,
      redactionCount:
        session.filtering.redactionCount - previousReviewRedactionCount + redactionCount,
      reviewRedactionCount: redactionCount,
    },
  });
}

export async function removeDiagnostic(id: string): Promise<CaptureSession> {
  const session = await requireSession('ready-for-review');
  return saveSession({
    ...session,
    diagnostics: session.diagnostics.filter((event) => event.id !== id),
  });
}

export async function removeScreenshotReference(): Promise<CaptureSession> {
  const session = await requireSession('ready-for-review');
  if (!session.page) return session;
  const page = { ...session.page };
  delete page.screenshotBlobId;
  delete page.screenshotError;
  return saveSession({ ...session, page });
}

export async function addSelectedFrame(frame: SelectedFrame): Promise<CaptureSession> {
  const session = await requireSession('ready-for-review');
  if (!session.page?.recording) {
    throw new Error('A selected frame requires a reviewable screen recording.');
  }
  const selectedFrames = getSelectedFrames(session.page);
  if (selectedFrames.length >= MAX_SELECTED_FRAMES) {
    throw new Error(`A capture can include up to ${MAX_SELECTED_FRAMES} selected frames.`);
  }
  const page = {
    ...session.page,
    selectedFrames: [...selectedFrames, frame],
  };
  delete page.selectedFrame;
  return saveSession({
    ...session,
    page,
  });
}

/** @deprecated Use addSelectedFrame for multi-frame captures. */
export async function setSelectedFrame(frame: SelectedFrame): Promise<CaptureSession> {
  const session = await requireSession('ready-for-review');
  if (!session.page?.recording) {
    throw new Error('A selected frame requires a reviewable screen recording.');
  }
  const page = { ...session.page, selectedFrames: [frame] };
  delete page.selectedFrame;
  return saveSession({ ...session, page });
}

export async function removeSelectedFrameReference(blobId?: string): Promise<CaptureSession> {
  const session = await requireSession('ready-for-review');
  if (!session.page) return session;
  const page = { ...session.page };
  const selectedFrames = blobId
    ? getSelectedFrames(page).filter((frame) => frame.blobId !== blobId)
    : [];
  delete page.selectedFrame;
  if (selectedFrames.length > 0) page.selectedFrames = selectedFrames;
  else delete page.selectedFrames;
  return saveSession({ ...session, page });
}

export async function removeRecordingReference(): Promise<CaptureSession> {
  const session = await requireSession('ready-for-review');
  if (!session.page) return session;
  const page = { ...session.page };
  delete page.recording;
  delete page.recordingError;
  return saveSession({ ...session, page });
}

export async function interruptSession(
  reason: Exclude<CaptureEndReason, 'completed'>,
  recording?: NonNullable<NonNullable<CaptureSession['page']>['recording']>,
  recordingError?: string,
) {
  const session = await requireSession('recording');
  const now = new Date().toISOString();
  return saveSession({
    ...session,
    status: 'ready-for-review',
    stoppedAt: now,
    endReason: reason,
    page: session.page
      ? {
          ...session.page,
          ...(recording ? { recording } : {}),
          ...(recordingError ? { recordingError } : {}),
        }
      : undefined,
    environment: createEnvironment(),
  });
}

export async function finalizeSession(
  tab: chrome.tabs.Tab,
  recording?: NonNullable<NonNullable<CaptureSession['page']>['recording']>,
  recordingError?: string,
  screenshotBlobId?: string,
  screenshotError?: string,
): Promise<CaptureSession> {
  const session = await requireSession('recording');
  const now = new Date().toISOString();
  return saveSession({
    ...session,
    status: 'ready-for-review',
    stoppedAt: now,
    endReason: 'completed',
    page: {
      url: filterUrl(tab.url ?? session.origin, true),
      title: filterText(tab.title ?? '').value,
      capturedAt: now,
      ...(recording ? { recording } : {}),
      ...(recordingError ? { recordingError } : {}),
      ...(screenshotBlobId ? { screenshotBlobId } : {}),
      ...(screenshotError ? { screenshotError } : {}),
    },
    environment: createEnvironment(),
  });
}

function createEnvironment(): NonNullable<CaptureSession['environment']> {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    reproKitVersion: chrome.runtime.getManifest().version,
  };
}

async function requireSession(status: CaptureSession['status']): Promise<CaptureSession> {
  const session = await loadSession();
  if (!session || session.status !== status) throw new Error(`No ${status} session exists.`);
  return session;
}

export async function appendCaptureWarning(sessionId: string, message: string): Promise<void> {
  const session = await loadSession();
  if (!session || session.id !== sessionId || session.status !== 'recording') return;
  const warning = filterText(message).value.slice(0, 1_000);
  const warnings = session.captureWarnings ?? [];
  if (warnings.includes(warning) || warnings.length >= 20) return;
  await saveSession({ ...session, captureWarnings: [...warnings, warning] });
}

// Chrome estimates in-memory storage (including UTF-16 strings), not UTF-8 file size.
// Leave room for that overhead, review metadata, and warnings.
async function saveEvidenceSession(
  previous: CaptureSession,
  next: CaptureSession,
): Promise<CaptureSession> {
  if (new TextEncoder().encode(JSON.stringify(next)).byteLength <= 3_000_000)
    return saveSession(next);
  const warning =
    'The local evidence storage limit was reached. Some additional events or updates were omitted.';
  return saveSession({
    ...previous,
    captureWarnings: [...new Set([warning, ...(previous.captureWarnings ?? [])])].slice(0, 20),
    filtering: {
      ...previous.filtering,
      droppedEventCount: previous.filtering.droppedEventCount + 1,
    },
  });
}
