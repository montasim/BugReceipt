export function Brand({ compact = false }: { compact?: boolean }) {
  const version =
    !compact && typeof chrome !== 'undefined' && typeof chrome.runtime?.getManifest === 'function'
      ? chrome.runtime.getManifest().version
      : null;

  return (
    <div className="brand" aria-label={version ? `BugReceipt version ${version}` : 'BugReceipt'}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && <span>BugReceipt</span>}
      {version && (
        <span className="brand-version" aria-hidden="true">
          v{version}
        </span>
      )}
    </div>
  );
}
