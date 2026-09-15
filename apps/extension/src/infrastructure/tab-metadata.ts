/** Read page metadata with the debugger permission, without attaching to the page. */
export async function withTabMetadata(tab: chrome.tabs.Tab): Promise<chrome.tabs.Tab> {
  if (typeof tab.id !== 'number') return tab;
  const targets = await chrome.debugger.getTargets();
  const target = targets.find(
    (candidate) => candidate.type === 'page' && candidate.tabId === tab.id,
  );
  if (!target) return tab;
  return { ...tab, url: target.url, title: target.title };
}

export async function getTabWithMetadata(tabId: number): Promise<chrome.tabs.Tab> {
  return withTabMetadata(await chrome.tabs.get(tabId));
}
