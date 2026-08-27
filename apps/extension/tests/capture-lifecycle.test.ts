import type { CaptureSession } from '@reprokit/capture-model';
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

  it('turns a cross-origin navigation into a reviewable interruption', async () => {
    const inject = vi.fn().mockResolvedValue(undefined);
    const interrupt = vi.fn().mockResolvedValue(undefined);

    const restored = await restoreCaptureAfterNavigation(
      7,
      { status: 'complete' },
      { url: 'https://payments.example.net' },
      { loadSession: () => Promise.resolve(session), inject, interrupt },
    );

    expect(restored).toBe('interrupted');
    expect(inject).not.toHaveBeenCalled();
    expect(interrupt).toHaveBeenCalledWith('origin-changed');
  });

  it('interrupts from the navigation URL before active-tab access is revoked', async () => {
    const inject = vi.fn().mockResolvedValue(undefined);
    const interrupt = vi.fn().mockResolvedValue(undefined);

    const outcome = await restoreCaptureAfterNavigation(
      7,
      { url: 'https://payments.example.net' },
      {},
      { loadSession: () => Promise.resolve(session), inject, interrupt },
    );

    expect(outcome).toBe('interrupted');
    expect(interrupt).toHaveBeenCalledWith('origin-changed');
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
