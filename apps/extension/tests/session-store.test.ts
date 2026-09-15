import { getSelectedFrames, MAX_SELECTED_FRAMES } from '@bugreceipt/capture-model';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addSelectedFrame,
  appendNetworkEvent,
  appendDiagnostic,
  appendStep,
  createSession,
  interruptSession,
  loadSession,
  removeSelectedFrameReference,
  saveSession,
  setEvidenceExcluded,
  updateReview,
} from '../src/application/session-store';

const values = new Map<string, unknown>();

beforeEach(() => {
  values.clear();
  vi.stubGlobal('chrome', {
    runtime: {
      getManifest: () => ({ version: '0.1.6' }),
    },
    storage: {
      session: {
        get: (key: string) => Promise.resolve(values.has(key) ? { [key]: values.get(key) } : {}),
        set: (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) values.set(key, structuredClone(value));
          return Promise.resolve();
        },
        remove: (key: string) => Promise.resolve(values.delete(key)),
      },
    },
  });
});

describe('capture session store', () => {
  it('persists a newly created active-tab session', async () => {
    const session = createSession(
      makeTab({
        url: 'https://example.com/checkout?token=secret',
        title: 'Checkout',
      }),
    );
    await saveSession(session);
    expect(await loadSession()).toEqual(session);
    expect(session.page?.url).toBe('https://example.com/checkout?token=%5BREDACTED%5D');
  });

  it('filters sensitive text before persisting a manual step', async () => {
    await saveSession(createSession(makeTab({ url: 'https://example.com', title: 'Checkout' })));
    const updated = await appendStep('Signed in as fixture@example.com');
    expect(updated.steps[0]?.text).toBe('Signed in as [REDACTED]');
    expect(updated.filtering.redactionCount).toBe(1);
  });

  it('preserves the console API type when persisting filtered evidence', async () => {
    const active = createSession(makeTab({ url: 'https://example.com', title: 'Checkout' }));
    await saveSession(active);
    await appendDiagnostic(active.id, {
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      kind: 'console',
      level: 'log',
      consoleType: 'table',
      message: 'Orders table',
    });
    expect((await loadSession())?.diagnostics[0]?.consoleType).toBe('table');
  });

  it('stores privacy-filtered request and response evidence', async () => {
    const active = createSession(makeTab({ url: 'https://example.com', title: 'Checkout' }));
    await saveSession(active);

    const updated = await appendNetworkEvent(active.id, {
      occurredAt: new Date().toISOString(),
      method: 'POST',
      url: 'https://example.com/api/pay?token=private',
      resourceType: 'fetch',
      status: 422,
      durationMs: 125,
      requestBody: JSON.stringify({ password: 'private', email: 'fixture@example.com' }),
      responseBody: JSON.stringify({ error: 'Card rejected for fixture@example.com' }),
    });

    expect(updated.network[0]?.url).toBe('https://example.com/api/pay');
    expect(updated.network[0]?.requestBody).not.toContain('private');
    expect(updated.network[0]?.responseBody).not.toContain('fixture@example.com');
    expect(updated.filtering.redactionCount).toBe(3);
  });

  it('updates a request in place as browser response and body events arrive', async () => {
    const active = createSession(makeTab({ url: 'https://example.com', title: 'Checkout' }));
    await saveSession(active);
    const id = crypto.randomUUID();
    const event = {
      occurredAt: new Date().toISOString(),
      method: 'GET',
      url: 'https://example.com/api',
      resourceType: 'fetch',
      durationMs: 0,
    };
    await appendNetworkEvent(active.id, event, id);
    const updated = await appendNetworkEvent(
      active.id,
      { ...event, status: 200, responseBody: '{"token":"private"}' },
      id,
    );
    expect(updated.network).toHaveLength(1);
    expect(updated.network[0]).toMatchObject({ id, status: 200 });
    expect(updated.network[0]?.responseBody).not.toContain('private');
  });

  it('persists a privacy-filtered review draft and normalizes step positions', async () => {
    const active = createSession(makeTab({ url: 'https://example.com', title: 'Checkout' }));
    await saveSession({
      ...active,
      status: 'ready-for-review',
      stoppedAt: new Date().toISOString(),
    });

    const updated = await updateReview({
      summary: 'Payment fails for fixture@example.com',
      description: 'Customer fixture@example.com cannot finish checkout.',
      expectedBehavior: 'The order should complete.',
      actualBehavior: 'Authorization: Bearer secret-token is shown.',
      steps: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          position: 17,
          text: 'Pay as fixture@example.com',
        },
      ],
    });

    expect(updated.summary).toBe('Payment fails for [REDACTED]');
    expect(updated.description).toBe('Customer [REDACTED] cannot finish checkout.');
    expect(updated.actualBehavior).not.toContain('secret-token');
    expect(updated.steps).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000001',
        position: 0,
        text: 'Pay as [REDACTED]',
      },
    ]);

    const savedAgain = await updateReview({
      summary: updated.summary,
      description: updated.description,
      expectedBehavior: updated.expectedBehavior,
      actualBehavior: updated.actualBehavior,
      steps: updated.steps,
    });
    expect(savedAgain.filtering.redactionCount).toBe(updated.filtering.redactionCount);
  });

  it('persists reversible evidence exclusions', async () => {
    const active = createSession(makeTab({ url: 'https://example.com', title: 'Checkout' }));
    const diagnosticId = '00000000-0000-4000-8000-000000000010';
    await saveSession({
      ...active,
      status: 'ready-for-review',
      stoppedAt: new Date().toISOString(),
      diagnostics: [
        {
          id: diagnosticId,
          occurredAt: new Date().toISOString(),
          kind: 'console',
          level: 'error',
          message: 'Payment failed',
        },
      ],
    });

    expect((await setEvidenceExcluded('diagnostic', true, diagnosticId)).exclusions).toEqual(
      expect.objectContaining({ diagnosticIds: [diagnosticId] }),
    );
    expect((await setEvidenceExcluded('diagnostic', false, diagnosticId)).exclusions).toEqual(
      expect.objectContaining({ diagnosticIds: [] }),
    );
  });

  it('preserves partial evidence when a capture is interrupted', async () => {
    await saveSession(
      createSession(makeTab({ url: 'https://example.com/checkout', title: 'Checkout' })),
    );

    const interrupted = await interruptSession('origin-changed');

    expect(interrupted.status).toBe('ready-for-review');
    expect(interrupted.endReason).toBe('origin-changed');
    expect(interrupted.page?.url).toBe('https://example.com/checkout');
    expect(interrupted.stoppedAt).toBeDefined();
  });

  it('appends and removes selected frame metadata without removing the recording', async () => {
    const active = createSession(makeTab({ url: 'https://example.com', title: 'Checkout' }));
    await saveSession({
      ...active,
      status: 'ready-for-review',
      stoppedAt: new Date().toISOString(),
      page: {
        ...active.page!,
        recording: {
          blobId: active.id,
          mimeType: 'video/webm',
          sizeBytes: 1_024,
          durationMs: 10_000,
        },
      },
    });

    const firstFrame = {
      blobId: '00000000-0000-4000-8000-000000000004',
      mimeType: 'image/png' as const,
      sizeBytes: 512,
      videoTimeMs: 3_067,
      width: 1_280,
      height: 720,
    };
    const secondFrame = {
      ...firstFrame,
      blobId: '00000000-0000-4000-8000-000000000005',
      videoTimeMs: 4_000,
    };
    await addSelectedFrame(firstFrame);
    const withFrames = await addSelectedFrame(secondFrame);
    expect(getSelectedFrames(withFrames.page).map((frame) => frame.videoTimeMs)).toEqual([
      3_067, 4_000,
    ]);

    const withOneFrame = await removeSelectedFrameReference(firstFrame.blobId);
    expect(getSelectedFrames(withOneFrame.page)).toEqual([secondFrame]);
    expect(withOneFrame.page?.recording?.blobId).toBe(active.id);
  });

  it('enforces the selected-frame limit at the persistence boundary', async () => {
    const active = createSession(makeTab({ url: 'https://example.com', title: 'Checkout' }));
    const baseFrame = {
      mimeType: 'image/png' as const,
      sizeBytes: 512,
      videoTimeMs: 0,
      width: 1_280,
      height: 720,
    };
    await saveSession({
      ...active,
      status: 'ready-for-review',
      stoppedAt: new Date().toISOString(),
      page: {
        ...active.page!,
        recording: {
          blobId: active.id,
          mimeType: 'video/webm',
          sizeBytes: 1_024,
          durationMs: 10_000,
        },
        selectedFrames: Array.from({ length: MAX_SELECTED_FRAMES }, (_, index) => ({
          ...baseFrame,
          blobId: crypto.randomUUID(),
          videoTimeMs: index,
        })),
      },
    });

    await expect(addSelectedFrame({ ...baseFrame, blobId: crypto.randomUUID() })).rejects.toThrow(
      'up to 20 selected frames',
    );
  });
});

function makeTab(overrides: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id: 7,
    index: 0,
    windowId: 2,
    pinned: false,
    highlighted: true,
    active: true,
    frozen: false,
    incognito: false,
    selected: true,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    lastAccessed: Date.now(),
    ...overrides,
  };
}
