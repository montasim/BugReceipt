export function SupportLink() {
  return (
    <a
      className="support-link"
      href="https://www.supportkori.com/montasim"
      target="_blank"
      rel="noreferrer"
      aria-label="Support BugReceipt on SupportKori"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" />
        <path d="M6 1v3M10 1v3M14 1v3" />
      </svg>
      <span className="support-link-label">Support</span>
    </a>
  );
}
