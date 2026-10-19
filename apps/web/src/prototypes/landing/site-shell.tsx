import type { ReactNode } from 'react';

export const storeUrl =
  'https://chromewebstore.google.com/detail/bugreceipt/dcjbnkadoenmkcimidcbhhckdpaondae';
export const siteVersion = '0.3.0';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="clean-site">
      <header className="site-header">
        <div className="clean-shell">
          <a className="clean-brand" href="/" aria-label="BugReceipt home">
            <img src="/brand/bugreceipt-mark.svg" alt="" />
            <span>BugReceipt</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="/guide">Guide</a>
            <a href="/#privacy">Privacy</a>
            <a href="/#faq">FAQ</a>
            <a href="https://github.com/montasim/BugReceipt" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
          <a className="btn-primary" href={storeUrl} target="_blank" rel="noreferrer">
            <ChromeIcon />
            <span>Add to Chrome</span>
          </a>
        </div>
      </header>

      {children}

      <footer className="site-footer">
        <div className="clean-shell">
          <div>
            <a className="clean-brand" href="/">
              <img src="/brand/bugreceipt-mark.svg" alt="" />
              <span>BugReceipt</span>
            </a>
            <p>
              Local-first bug reports for Chrome. No account, no automatic uploads, review before
              you share.
            </p>
            <p className="version mono">Version {siteVersion}</p>
          </div>
          <div>
            <h3>Product</h3>
            <ul>
              <li>
                <a href={storeUrl} target="_blank" rel="noreferrer">
                  Add to Chrome
                </a>
              </li>
              <li>
                <a href="/guide">User guide</a>
              </li>
              <li>
                <a
                  href="https://github.com/montasim/BugReceipt/releases"
                  target="_blank"
                  rel="noreferrer"
                >
                  Releases
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Project</h3>
            <ul>
              <li>
                <a href="https://github.com/montasim/BugReceipt" target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/montasim/BugReceipt/blob/main/SECURITY.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Security policy
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/montasim/BugReceipt/blob/main/SUPPORT.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Help the project</h3>
            <ul>
              <li>
                <a href="https://www.supportkori.com/montasim" target="_blank" rel="noreferrer">
                  Support BugReceipt on SupportKori
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/montasim/BugReceipt/issues/new/choose"
                  target="_blank"
                  rel="noreferrer"
                >
                  Report a bug or request a feature
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function ChromeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <path d="M8.53 14 4.03 6M11.5 21.5l4-7.5M12 8h9" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}
