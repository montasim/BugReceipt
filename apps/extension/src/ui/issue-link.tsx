export function IssueLink() {
  return (
    <a
      className="issue-link"
      href="https://github.com/montasim/BugReceipt/issues/new/choose"
      target="_blank"
      rel="noreferrer"
      aria-label="Report an issue on GitHub"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 3h14v14H9l-4 4V3Z" />
        <path d="M12 7v5M12 15.5v.5" />
      </svg>
      <span className="issue-link-label">Report an issue</span>
    </a>
  );
}
