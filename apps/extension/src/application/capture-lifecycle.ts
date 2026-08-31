import type { CaptureSession } from '@bugreceipt/capture-model';

type InterruptionReason = 'tab-closed';
type NavigationOutcome = 'ignored' | 'restored' | 'continued';

type NavigationDependencies = {
  loadSession: () => Promise<CaptureSession | null>;
  inject: (tabId: number, sessionId: string) => Promise<void>;
  interrupt: (reason: InterruptionReason) => Promise<unknown>;
};

export async function restoreCaptureAfterNavigation(
  tabId: number,
  changeInfo: { status?: string; url?: string },
  tab: Pick<chrome.tabs.Tab, 'url'>,
  dependencies: NavigationDependencies,
): Promise<NavigationOutcome> {
  const navigationUrl = changeInfo.url ?? (changeInfo.status === 'complete' ? tab.url : undefined);
  if (!navigationUrl) return 'ignored';
  const session = await dependencies.loadSession();
  if (!session || session.status !== 'recording' || session.tabId !== tabId) return 'ignored';
  if (changeInfo.status !== 'complete') return 'ignored';

  try {
    await dependencies.inject(tabId, session.id);
    return 'restored';
  } catch {
    // Navigation may revoke activeTab access when the selected tab changes origin.
    // The user-approved video stream remains valid, so keep the recording alive
    // even when console and network instrumentation cannot be reinstalled.
    return 'continued';
  }
}

export async function interruptCaptureAfterTabClosed(
  tabId: number,
  dependencies: Pick<NavigationDependencies, 'loadSession' | 'interrupt'>,
): Promise<boolean> {
  const session = await dependencies.loadSession();
  if (!session || session.status !== 'recording' || session.tabId !== tabId) return false;
  await dependencies.interrupt('tab-closed');
  return true;
}
