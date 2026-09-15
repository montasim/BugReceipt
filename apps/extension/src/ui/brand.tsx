export function Brand({
  compact = false,
  showVersion = true,
}: {
  compact?: boolean;
  showVersion?: boolean;
}) {
  const version =
    !compact &&
    showVersion &&
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime?.getManifest === 'function'
      ? chrome.runtime.getManifest().version
      : null;

  return (
    <div
      className="brand inline-flex min-w-0 items-center gap-2.5 font-semibold tracking-[-0.02em]"
      aria-label={version ? `BugReceipt version ${version}` : 'BugReceipt'}
    >
      <span
        className="brand-mark grid size-8 shrink-0 content-center gap-0.5 rounded-[10px] bg-secondary px-[7px]"
        aria-hidden="true"
      >
        <i className="h-[3px] w-[18px] -skew-x-[10deg] rounded-[1px] bg-foreground" />
        <i className="h-[3px] w-[14px] -skew-x-[10deg] rounded-[1px] bg-primary" />
        <i className="h-[3px] w-[10px] -skew-x-[10deg] rounded-[1px] bg-success-foreground" />
      </span>
      {!compact && <span>BugReceipt</span>}
      {version && (
        <span
          className="brand-version ml-auto font-mono text-[10px] font-medium text-muted-foreground"
          aria-hidden="true"
        >
          v{version}
        </span>
      )}
    </div>
  );
}
