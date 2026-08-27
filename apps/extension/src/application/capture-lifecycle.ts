import type { CaptureSession } from '@reprokit/capture-model';

type InterruptionReason = 'origin-changed' | 'tab-closed';
type NavigationOutcome = 'ignored' | 'restored' | 'interrupted';

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

  let origin: string;
  try {
    origin = new URL(navigationUrl).origin;
  } catch {
    return 'ignored';
  }
  if (origin !== session.origin) {
    await dependencies.interrupt('origin-changed');
    return 'interrupted';
  }
  if (changeInfo.status !== 'complete') return 'ignored';

  await dependencies.inject(tabId, session.id);
  return 'restored';
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
