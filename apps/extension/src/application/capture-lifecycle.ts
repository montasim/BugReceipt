import type { CaptureSession } from '@bugreceipt/capture-model';

type InterruptionReason = 'tab-closed';
type CaptureDependencies = {
  loadSession: () => Promise<CaptureSession | null>;
  interrupt: (reason: InterruptionReason) => Promise<unknown>;
};

export async function interruptCaptureAfterTabClosed(
  tabId: number,
  dependencies: CaptureDependencies,
): Promise<boolean> {
  const session = await dependencies.loadSession();
  if (!session || session.status !== 'recording' || session.tabId !== tabId) return false;
  await dependencies.interrupt('tab-closed');
  return true;
}
