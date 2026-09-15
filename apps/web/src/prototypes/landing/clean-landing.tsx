import { useEffect, useState } from 'react';

const storeUrl =
  'https://chromewebstore.google.com/detail/bugreceipt/dcjbnkadoenmkcimidcbhhckdpaondae';
const videoUrl = 'https://www.youtube-nocookie.com/embed/KdrGAhvUyoY?rel=0';

const features = [
  ['Screen recording', 'Record the selected browser tab without microphone or tab audio.'],
  ['Console evidence', 'Keep errors, warnings, exceptions, and rejected promises with the report.'],
  [
    'Network activity',
    'Review failed requests, status codes, timing, and supported filtered responses.',
  ],
  ['Reproduction steps', 'Add the exact human actions needed to reproduce the problem.'],
  [
    'Review before export',
    'Remove evidence, select frames, annotate screenshots, and highlight diagnostics.',
  ],
  ['Local export', 'Download a reviewed Markdown report and selected evidence as a ZIP.'],
] as const;

const faqs = [
  [
    'What does BugReceipt capture?',
    'Only evidence collected after you start: the selected tab, console messages, network activity, page context, and steps you add.',
  ],
  [
    'Does BugReceipt upload my report?',
    'No. Captures stay in extension-owned browser storage. A report leaves only when you explicitly export and share it.',
  ],
  [
    'Can I remove sensitive information?',
    'Yes. Review and remove individual evidence before export. Diagnostic filtering reduces risk, but you should still inspect screen recordings and every report field.',
  ],
  [
    'Which browsers are supported?',
    'BugReceipt currently supports Chrome desktop version 120 and newer.',
  ],
  [
    'Does it create GitHub issues automatically?',
    'No. BugReceipt exports local files and can open the public issue form, but it does not populate or submit an issue.',
  ],
] as const;

export function CleanLanding() {
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
          <a className="clean-brand" href="#top" aria-label="BugReceipt home">
            <img src="/brand/bugreceipt-mark.svg" alt="" />
            <span>BugReceipt</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#demo">Demo</a>
            <a href="#privacy">Privacy</a>
            <a href="#changelog">Changelog</a>
            <a href="#faq">FAQ</a>
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

      <main id="top">
        <section className="clean-shell hero-section">
          <div className="hero-copy">
            <h1>Clear browser bug reports, with the evidence included.</h1>
            <p>
              Record the affected tab, collect console and network context, add reproduction steps,
              and review everything before exporting a local report.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href={storeUrl} target="_blank" rel="noreferrer">
                <ChromeIcon /> Add to Chrome
              </a>
              <a className="text-action" href="#demo">
                <PlayIcon /> Watch the 33-second demo
              </a>
            </div>
            <p className="release-note">
              <span /> Version 0.2.0 is the latest version.
            </p>
          </div>
          <figure className="product-preview">
            <img
              src="/brand/bugreceipt-extension-real-desktop.png"
              alt="The real BugReceipt desktop review interface showing report details and export controls"
            />
            <figcaption>Review the report before choosing what to export.</figcaption>
          </figure>
        </section>

        <section className="trust-row" aria-label="Product boundaries">
          <div className="clean-shell">
            <span>
              <CheckIcon /> Local-first
            </span>
            <span>
              <CheckIcon /> No account required
            </span>
            <span>
              <CheckIcon /> No automatic uploads
            </span>
            <span>
              <CheckIcon /> Review before sharing
            </span>
          </div>
        </section>

        <section className="clean-shell content-section" id="features">
          <div className="section-heading">
            <h2>Everything needed to reproduce the problem.</h2>
            <p>
              BugReceipt keeps the human steps and browser evidence together, so developers receive
              context instead of another vague report.
            </p>
          </div>
          <div className="feature-list">
            {features.map(([title, description], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="demo-section" id="demo">
          <div className="clean-shell demo-grid">
            <div className="section-heading">
              <h2>See the full workflow in 33 seconds.</h2>
              <p>
                From a failed browser action to a reviewed local export—without leaving the evidence
                scattered across screenshots and DevTools.
              </p>
            </div>
            <div className="video-frame">
              <iframe
                src={videoUrl}
                title="BugReceipt product demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <section className="clean-shell content-section privacy-grid" id="privacy">
          <div className="section-heading">
            <h2>Your report stays under your control.</h2>
            <p>
              Filtering happens before diagnostic data is stored. You inspect the capture and
              explicitly choose which local files to export.
            </p>
          </div>
          <div className="privacy-details">
            <div>
              <LockIcon />
              <h3>Captured intentionally</h3>
              <p>Nothing is recorded before you choose a tab and start the capture.</p>
            </div>
            <div>
              <EyeIcon />
              <h3>Reviewed locally</h3>
              <p>Remove unwanted entries and visual evidence before creating the report bundle.</p>
            </div>
            <div>
              <DownloadIcon />
              <h3>Exported explicitly</h3>
              <p>BugReceipt does not automatically upload, email, or submit your capture.</p>
            </div>
          </div>
        </section>

        <section className="changelog-section" id="changelog">
          <div className="clean-shell changelog-grid">
            <div className="section-heading">
              <h2>Changelog</h2>
              <p>A concise view of what is available and what is coming next.</p>
            </div>
            <div className="release-list">
              <article>
                <div>
                  <strong>0.2.0</strong>
                  <span>Latest version</span>
                </div>
                <p>
                  Updated review experience, evidence curation, local export flow, and the new
                  light/dark product identity.
                </p>
              </article>
              <article>
                <div>
                  <strong>0.1.6</strong>
                  <span>Previous release</span>
                </div>
                <p>
                  Tab recording, console and network evidence, manual steps, annotations, and
                  reviewed local ZIP export.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="clean-shell content-section faq-section" id="faq">
          <div className="section-heading">
            <h2>Frequently asked questions</h2>
            <p>What BugReceipt collects, where it stays, and what happens when you export.</p>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-section">
          <div className="clean-shell final-inner">
            <div>
              <h2>Report bugs with proof.</h2>
              <p>Capture the context developers need.</p>
            </div>
            <a className="primary-action" href={storeUrl} target="_blank" rel="noreferrer">
              <ChromeIcon /> Add to Chrome
            </a>
          </div>
        </section>
      </main>

      <footer>
        <div className="clean-shell">
          <div>
            <a className="clean-brand" href="#top">
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
            <a href="#privacy">Privacy</a>
            <a href="#changelog">Changelog</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4Z" />
    </svg>
  );
}
function ChromeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <path d="M8.53 14 4.03 6M11.5 21.5l4-7.5M12 8h9" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4 10 4 4 8-9" />
    </svg>
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
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14" />
    </svg>
  );
}
