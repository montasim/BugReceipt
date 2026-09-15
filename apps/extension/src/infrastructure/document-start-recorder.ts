const DOCUMENT_START_RECORDER_ID = 'bugreceipt-document-start-recorder';

export function getDocumentStartMatch(rawUrl: string): string | null {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return `${url.protocol}//${url.hostname}/*`;
}

export async function registerDocumentStartRecorder(rawUrl: string): Promise<void> {
  const match = getDocumentStartMatch(rawUrl);
  if (!match) throw new Error('BugReceipt cannot record this page.');

  const definition: chrome.scripting.RegisteredContentScript = {
    id: DOCUMENT_START_RECORDER_ID,
    js: ['content-scripts/capture-recorder.js'],
    matches: [match],
    persistAcrossSessions: false,
    runAt: 'document_start',
    world: 'MAIN',
  };
  const registered = await chrome.scripting.getRegisteredContentScripts({
    ids: [DOCUMENT_START_RECORDER_ID],
  });
  if (registered.length > 0) {
    await chrome.scripting.updateContentScripts([definition]);
    return;
  }
  await chrome.scripting.registerContentScripts([definition]);
}

export async function unregisterDocumentStartRecorder(): Promise<void> {
  const registered = await chrome.scripting.getRegisteredContentScripts({
    ids: [DOCUMENT_START_RECORDER_ID],
  });
  if (registered.length === 0) return;
  await chrome.scripting.unregisterContentScripts({ ids: [DOCUMENT_START_RECORDER_ID] });
}
