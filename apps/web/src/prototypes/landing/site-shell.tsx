import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const storeUrl =
  'https://chromewebstore.google.com/detail/bugreceipt/dcjbnkadoenmkcimidcbhhckdpaondae';

export function SiteShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = window.localStorage.getItem('bugreceipt-prototype-theme');
    if (saved === 'dark') setTheme('dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    window.localStorage.setItem('bugreceipt-prototype-theme', next);
  };

  return (
    <div className="clean-site" data-theme={theme}>
      <header className="clean-header">
        <div className="clean-shell header-inner">
          <a className="clean-brand" href="/" aria-label="BugReceipt home">
            <img src="/brand/bugreceipt-mark.svg" alt="" />
            <span>BugReceipt</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="/#features">Features</a>
            <a href="/#demo">Demo</a>
            <a href="/guide">Guide</a>
            <a href="/#privacy">Privacy</a>
            <a href="/#changelog">Changelog</a>
            <a href="/#faq">FAQ</a>
          </nav>
          <div className="header-actions">
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <a className="small-download" href={storeUrl} target="_blank" rel="noreferrer">
              Add to Chrome
            </a>
          </div>
        </div>
      </header>

      {children}

      <footer>
        <div className="clean-shell">
          <div>
            <a className="clean-brand" href="/">
              <img src="/brand/bugreceipt-mark.svg" alt="" />
              <span>BugReceipt</span>
            </a>
            <p>Privacy-filtered browser evidence for reproducible bug reports.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="https://github.com/montasim/BugReceipt" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a
              href="https://github.com/montasim/BugReceipt/blob/main/SECURITY.md"
              target="_blank"
              rel="noreferrer"
            >
              Security
            </a>
            <a href="/guide">Guide</a>
            <a href="/#privacy">Privacy</a>
            <a href="/#changelog">Changelog</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M15.5 13.5A7 7 0 0 1 6.5 4.5 7 7 0 1 0 15.5 13.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6 16 16M16 4l-1.4 1.4M5.4 14.6 4 16" />
    </svg>
  );
}
