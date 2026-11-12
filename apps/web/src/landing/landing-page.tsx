import { useState } from 'react';
import type { ReactNode } from 'react';
import { Receipt } from '../prototypes/landing/receipt';

export const storeUrl =
  'https://chromewebstore.google.com/detail/bugreceipt/dcjbnkadoenmkcimidcbhhckdpaondae';
export const videoId = 'QkJJBP71Ze0';
const repoUrl = 'https://github.com/montasim/BugReceipt';

export function LandingPage() {
  return (
    <div className="lp">
      <Header />
      <div className="lp-scroll">
        <main id="top">
          <Hero />
          <Problem />
          <Features />
          <HowItWorks />
          <Deliverable />
          <Audiences />
          <Privacy />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="lp-header">
      <div className="lp-wrap lp-header-row">
        <a className="lp-brand" href="/" aria-label="BugReceipt home">
          <img src="/brand/bugreceipt-mark.svg" alt="" width="28" height="28" />
          <span>BugReceipt</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#demo">Demo</a>
          <a href="#features">Features</a>
          <a href="#privacy">Privacy</a>
          <a href="#faq">FAQ</a>
          <a href="/guide">Guide</a>
          <a href={repoUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <div className="lp-header-end">
          <ThemeToggle />
          <InstallButton compact />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="lp-hero">
      <div className="lp-wrap lp-hero-copy">
        <p className="lp-pill">
          <span aria-hidden="true">●</span> Free Chrome extension · Open source
        </p>
        <h1>
          Turn “it’s broken” into a bug report developers can <em>reproduce.</em>
        </h1>
        <p className="lp-lead">
          Record the tab and type each step as you go. BugReceipt keeps the console errors and the
          failing request beside them, redacts secrets on your machine, and hands you one ZIP to
          share.
        </p>
        <div className="lp-actions">
          <InstallButton label="Add to Chrome, it’s free" />
          <a className="lp-btn-ghost" href="#demo">
            <PlayIcon /> Watch the 50-second demo
          </a>
        </div>
        <ul className="lp-trust" aria-label="At a glance">
          <li>No account</li>
          <li>Nothing uploaded</li>
          <li>
            <a href={repoUrl} target="_blank" rel="noreferrer">
              Open source
            </a>
          </li>
          <li>Chrome 125+</li>
        </ul>
      </div>
      <div className="lp-wrap" id="demo">
        <VideoPlayer />
      </div>
    </section>
  );
}

/** Loads YouTube only after a click, so the page stays fast and sets no third-party cookies. */
function VideoPlayer() {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="lp-video">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title="BugReceipt in 50 seconds"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Play the BugReceipt demo video"
        >
          <img
            src="/video/launch-poster.jpg"
            alt=""
            width="1280"
            height="720"
            fetchPriority="high"
          />
          <span className="lp-play" aria-hidden="true">
            <PlayIcon />
          </span>
          <span className="lp-video-time">0:50</span>
        </button>
      )}
      <figcaption>
        From a broken checkout to a report a developer can reproduce.{' '}
        <a href={`https://youtu.be/${videoId}`} target="_blank" rel="noreferrer">
          Open on YouTube
        </a>
      </figcaption>
    </figure>
  );
}

function Problem() {
  return (
    <section className="lp-section lp-problem">
      <div className="lp-wrap lp-split">
        <div>
          <p className="lp-eyebrow">The problem</p>
          <h2>Most bug reports arrive without the evidence.</h2>
          <p className="lp-sub">
            A screenshot shows the symptom. A screen recording shows the clicks. Neither shows the
            error behind it, so the developer replies with questions instead of a fix.
          </p>
        </div>
        <div className="lp-compare">
          <div className="lp-card lp-card-bad">
            <span className="lp-tag">Without BugReceipt</span>
            <p className="lp-quote">“Checkout is broken.”</p>
            <ul className="lp-x">
              <li>No steps</li>
              <li>No console errors</li>
              <li>No failing request</li>
            </ul>
          </div>
          <div className="lp-card lp-card-good">
            <span className="lp-tag">With BugReceipt</span>
            <p className="lp-quote">Checkout fails after applying a discount</p>
            <ul className="lp-check">
              <li>3 steps, typed while it happened</li>
              <li>CheckoutError with its stack trace</li>
              <li>POST /api/orders → 422, with the body</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    eyebrow: 'Record',
    title: 'Steps written while it happens',
    body: 'Pick the tab and press record. Type each step in the side panel as you reproduce the problem, so nothing is reconstructed from memory.',
    image: {
      src: '/guide/03-recording',
      width: 880,
      height: 1520,
      alt: 'BugReceipt side panel recording a tab, with three steps typed by the tester',
    },
    tall: true,
  },
  {
    eyebrow: 'Capture',
    title: 'Console errors and the request that failed',
    body: 'Console messages, exceptions and stack traces, plus network requests with their status, timing and JSON bodies. Captured automatically from the moment you start.',
    image: {
      src: '/guide/08-network-evidence',
      width: 2880,
      height: 1800,
      alt: 'Network evidence with a failed POST request expanded to its JSON response',
    },
  },
  {
    eyebrow: 'Protect',
    title: 'Secrets redacted on your machine',
    body: 'Tokens, passwords, cookies, API keys and email addresses are filtered before anything is stored. Then you review every item and remove what should not be shared.',
    redaction: true,
  },
  {
    eyebrow: 'Share',
    title: 'Circle the problem. Download one ZIP.',
    body: 'Save frames from the recording and draw on them. Export GitHub-ready Markdown with the recording, frames, console and network files beside it.',
    image: {
      src: '/guide/annotated-frame',
      width: 2880,
      height: 1800,
      alt: 'A saved frame of the checkout page with a highlight drawn over the error',
    },
  },
] as const;

function Features() {
  return (
    <section className="lp-section" id="features">
      <div className="lp-wrap">
        <SectionHead
          eyebrow="What you get"
          title="Everything a developer asks for, in one capture."
          sub="Four things happen while you reproduce the bug. You do one of them."
        />
        <div className="lp-features">
          {features.map((feature, index) => (
            <article key={feature.title} className={`lp-feature${index % 2 ? ' is-flipped' : ''}`}>
              <div className="lp-feature-copy">
                <p className="lp-eyebrow">{feature.eyebrow}</p>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
              <div className={`lp-feature-media${'tall' in feature ? ' is-tall' : ''}`}>
                {'redaction' in feature ? (
                  <Redaction />
                ) : (
                  <picture>
                    <source srcSet={`${feature.image.src}.webp`} type="image/webp" />
                    <img
                      src={`${feature.image.src}.png`}
                      alt={feature.image.alt}
                      width={feature.image.width}
                      height={feature.image.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                )}
              </div>
            </article>
          ))}
        </div>
        <p className="lp-aside">
          Also included: select wrong wording on any page, right-click, and send a correction.{' '}
          <a href="/guide#corrections">See how</a>
        </p>
      </div>
    </section>
  );
}

/** Mirrors the real filter in packages/privacy: sensitive keys, bearer tokens and emails. */
function Redaction() {
  const rows = [
    ['authorization', 'Bearer eyJhbGciOi…'],
    ['cookie', 'session=8f2c91…'],
    ['password', 'hunter2!'],
    ['email', 'jane@example.com'],
  ];
  return (
    <div
      className="lp-redact"
      role="img"
      aria-label="Request headers with every secret replaced by REDACTED"
    >
      <div className="lp-redact-head">
        <span>POST /api/orders</span>
        <span className="lp-status">422</span>
      </div>
      {rows.map(([key, value]) => (
        <div className="lp-redact-row" key={key}>
          <span className="lp-key">{key}</span>
          <s>{value}</s>
          <b>[REDACTED]</b>
        </div>
      ))}
      <p>Filtered before storage. Nothing leaves until you export it.</p>
    </div>
  );
}

const steps = [
  { title: 'Add BugReceipt to Chrome', body: 'Free from the Chrome Web Store. No sign-up.' },
  { title: 'Record and reproduce', body: 'Choose the tab, use the page, type your steps.' },
  { title: 'Review and download', body: 'Remove anything private, then save one ZIP.' },
];

function HowItWorks() {
  return (
    <section className="lp-section lp-band">
      <div className="lp-wrap">
        <SectionHead eyebrow="How it works" title="Your first report in under two minutes." />
        <ol className="lp-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="lp-step-n">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="lp-center">
          <InstallButton />
        </div>
      </div>
    </section>
  );
}

function Deliverable() {
  return (
    <section className="lp-section">
      <div className="lp-wrap lp-split lp-split-receipt">
        <div>
          <p className="lp-eyebrow">The receipt</p>
          <h2>What lands in the developer’s inbox.</h2>
          <p className="lp-sub">
            A GitHub-ready <code>issue.md</code> with steps, expected and current behavior, the
            environment, and the errors that matter, plus the files to prove it.
          </p>
          <p className="lp-note">
            This is the real export from the demo capture. BugReceipt does not open or submit an
            issue for you; you decide where it goes.
          </p>
        </div>
        <div className="lp-receipt">
          <Receipt />
        </div>
      </div>
    </section>
  );
}

const audiences = [
  {
    title: 'QA engineers',
    body: 'Send a report that is closed by a fix, not reopened with “cannot reproduce”.',
  },
  {
    title: 'Support teams',
    body: 'Skip the screen-share. Customers send one ZIP they have already reviewed.',
  },
  {
    title: 'Developers and maintainers',
    body: 'Get the console, the failing request and the browser version with the first message.',
  },
];

function Audiences() {
  return (
    <section className="lp-section lp-band">
      <div className="lp-wrap">
        <SectionHead eyebrow="Built for" title="Whoever has to explain the bug." />
        <div className="lp-grid3">
          {audiences.map((audience) => (
            <div className="lp-card" key={audience.title}>
              <h3>{audience.title}</h3>
              <p>{audience.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const privacy = [
  {
    title: 'Recorded after you start',
    items: ['Tab video, no audio', 'Console messages', 'Requests and responses', 'Your steps'],
  },
  {
    title: 'Redacted before storage',
    items: ['Tokens and passwords', 'Cookies and API keys', 'Email addresses', 'URL query strings'],
  },
  {
    title: 'Never collected',
    items: ['Keystrokes and form values', 'Cookies and storage', 'Page HTML', 'Microphone audio'],
  },
];

function Privacy() {
  return (
    <section className="lp-section" id="privacy">
      <div className="lp-wrap">
        <SectionHead
          eyebrow="Privacy"
          title="Local-first. Nothing uploaded. Ever."
          sub="BugReceipt has no server and no account. Your capture stays in Chrome until you download it."
        />
        <div className="lp-grid3">
          {privacy.map((column) => (
            <div className="lp-card" key={column.title}>
              <h3>{column.title}</h3>
              <ul className="lp-check">
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="lp-note lp-center">
          Filtering cannot recognize every secret, and a recording shows whatever was on screen.
          Review before you share.
        </p>
      </div>
    </section>
  );
}

const faqs = [
  {
    question: 'Is BugReceipt free?',
    answer: 'Yes. It is free and open source, with no account, no trial and no paid tier.',
  },
  {
    question: 'Does it upload my recordings?',
    answer:
      'No. Everything stays in the extension’s local storage until you download it or delete it. BugReceipt has no server.',
  },
  {
    question: 'Which browsers are supported?',
    answer: 'Chrome on desktop, version 125 or newer. Firefox and Safari are not supported.',
  },
  {
    question: 'Does it work on localhost and staging?',
    answer:
      'Yes. Any HTTP or HTTPS page works, including local servers. Chrome’s own pages cannot be captured.',
  },
  {
    question: 'Does it create the GitHub issue for me?',
    answer:
      'No. It exports GitHub-ready Markdown and the evidence files. You choose where to post them.',
  },
];

function Faq() {
  return (
    <section className="lp-section lp-band" id="faq">
      <div className="lp-wrap lp-faq-wrap">
        <SectionHead eyebrow="FAQ" title="Questions before you install." />
        <div className="lp-faq">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>
                {faq.question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="lp-final">
      <div className="lp-wrap">
        <h2>Make the next bug report the last one with questions.</h2>
        <p>Free. Private. Ready in Chrome in ten seconds.</p>
        <div className="lp-actions lp-center">
          <InstallButton label="Add to Chrome, it’s free" />
          <a className="lp-btn-ghost" href={repoUrl} target="_blank" rel="noreferrer">
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer-row">
        <a className="lp-brand" href="/">
          <img src="/brand/bugreceipt-mark.svg" alt="" width="24" height="24" />
          <span>BugReceipt</span>
        </a>
        <nav aria-label="Footer">
          <a href="/guide">User guide</a>
          <a href={`${repoUrl}/releases`} target="_blank" rel="noreferrer">
            Releases
          </a>
          <a href={`${repoUrl}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer">
            Security
          </a>
          <a href={`${repoUrl}/blob/main/SUPPORT.md`} target="_blank" rel="noreferrer">
            Support
          </a>
          <a href={`${repoUrl}/issues/new/choose`} target="_blank" rel="noreferrer">
            Report a bug
          </a>
          <a href="https://www.supportkori.com/montasim" target="_blank" rel="noreferrer">
            Support the project
          </a>
        </nav>
      </div>
    </footer>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="lp-head">
      <p className="lp-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {sub ? <p className="lp-sub">{sub}</p> : null}
    </div>
  );
}

function InstallButton({
  label = 'Add to Chrome',
  compact,
}: {
  label?: ReactNode;
  compact?: boolean;
}) {
  return (
    <a
      className={`lp-btn${compact ? ' is-compact' : ''}`}
      href={storeUrl}
      target="_blank"
      rel="noreferrer"
    >
      <img src="/brand/chrome-logo.svg" alt="" width="20" height="20" />
      {label}
    </a>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l10.5-6.5z" />
    </svg>
  );
}

export const themeKey = 'bugreceipt-theme';

/** Runs before paint so the saved or system theme shows without a flash. */
export const themeScript = `try{var t=localStorage.getItem('${themeKey}');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){}`;

function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try {
      localStorage.setItem(themeKey, next);
    } catch {
      // Storage can be blocked; the theme still applies for this visit.
    }
  };
  return (
    <button
      type="button"
      className="lp-theme"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      title="Switch theme"
    >
      <svg className="lp-sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg className="lp-moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
    </button>
  );
}
