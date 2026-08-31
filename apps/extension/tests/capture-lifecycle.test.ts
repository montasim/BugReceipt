import type { CaptureSession } from '@bugreceipt/capture-model';
import { describe, expect, it, vi } from 'vitest';
import {
  interruptCaptureAfterTabClosed,
  restoreCaptureAfterNavigation,
} from '../src/application/capture-lifecycle';

const session = {
  schemaVersion: 1,
  id: '00000000-0000-4000-8000-000000000000',
  status: 'recording',
  tabId: 7,
  windowId: 2,
  origin: 'https://example.com',
  startedAt: '2026-08-27T12:00:00.000Z',
  summary: 'Bug report',
  expectedBehavior: '',
  actualBehavior: '',
  steps: [],
  diagnostics: [],
  network: [],
  filtering: { redactionCount: 0, droppedEventCount: 0 },
} satisfies CaptureSession;

describe('capture navigation lifecycle', () => {
  it('reinjects capture after a same-origin document finishes loading', async () => {
    const inject = vi.fn().mockResolvedValue(undefined);
    const interrupt = vi.fn().mockResolvedValue(undefined);

    const restored = await restoreCaptureAfterNavigation(
      7,
      { status: 'complete' },
      { url: 'https://example.com/checkout/confirmation' },
      { loadSession: () => Promise.resolve(session), inject, interrupt },
    );

    expect(restored).toBe('restored');
    expect(inject).toHaveBeenCalledWith(7, session.id);
    expect(interrupt).not.toHaveBeenCalled();
  });

  it('keeps the selected tab recording when cross-origin injection is unavailable', async () => {
    const inject = vi.fn().mockRejectedValue(new Error('Site access is not granted.'));
    const persisted = { session } as { session: CaptureSession };
    const interrupt = vi.fn().mockImplementation(() => {
      persisted.session = {
        ...persisted.session,
        status: 'ready-for-review',
        stoppedAt: '2026-08-27T12:00:01.000Z',
        endReason: 'origin-changed',
      };
      return Promise.resolve();
    });

    const outcome = await restoreCaptureAfterNavigation(
      7,
      { status: 'complete' },
      { url: 'https://payments.example.net' },
      { loadSession: () => Promise.resolve(session), inject, interrupt },
    );

    expect(outcome).toBe('continued');
    expect(inject).toHaveBeenCalledWith(7, session.id);
    expect(interrupt).not.toHaveBeenCalled();
    expect(persisted.session.status).toBe('recording');
  });

  it('waits for a cross-origin document to load without ending the recording', async () => {
    const inject = vi.fn().mockResolvedValue(undefined);
    const interrupt = vi.fn().mockResolvedValue(undefined);

    const outcome = await restoreCaptureAfterNavigation(
      7,
      { url: 'https://payments.example.net' },
      {},
      { loadSession: () => Promise.resolve(session), inject, interrupt },
    );

    expect(outcome).toBe('ignored');
    expect(inject).not.toHaveBeenCalled();
    expect(interrupt).not.toHaveBeenCalled();
  });

  it('reinjects diagnostics after cross-origin navigation when site access exists', async () => {
    const inject = vi.fn().mockResolvedValue(undefined);
    const interrupt = vi.fn().mockResolvedValue(undefined);

    const outcome = await restoreCaptureAfterNavigation(
      7,
      { status: 'complete' },
      { url: 'https://payments.example.net' },
      { loadSession: () => Promise.resolve(session), inject, interrupt },
    );

    expect(outcome).toBe('restored');
    expect(inject).toHaveBeenCalledWith(7, session.id);
    expect(interrupt).not.toHaveBeenCalled();
  });

  it('turns closing the recorded tab into a reviewable interruption', async () => {
    const interrupt = vi.fn().mockResolvedValue(undefined);

    const interrupted = await interruptCaptureAfterTabClosed(7, {
      loadSession: () => Promise.resolve(session),
      interrupt,
    });

    expect(interrupted).toBe(true);
    expect(interrupt).toHaveBeenCalledWith('tab-closed');
  });
});
