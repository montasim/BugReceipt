import type { CaptureSession } from '@bugreceipt/capture-model';
import { describe, expect, it, vi } from 'vitest';
import { interruptCaptureAfterTabClosed } from '../src/application/capture-lifecycle';

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
