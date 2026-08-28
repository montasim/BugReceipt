export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="BugReceipt">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && <span>BugReceipt</span>}
    </div>
  );
}
