import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export const Route = createFileRoute('/')({ component: Home });

const releaseUrl = 'https://github.com/montasim/BugReceipt/releases/latest';

const capturedEvidence = [
  ['Screen recording', 'The selected tab’s pixels, without microphone or tab audio.'],
  ['Console timeline', 'Logs, warnings, errors, uncaught exceptions, and rejected promises.'],
  ['Network activity', 'Fetch, XHR, and page requests with filtered request and response details.'],
  ['Reproduction context', 'Manual steps, page URL, browser version, and application context.'],
] as const;

const questions = [
  {
    question: 'What does BugReceipt capture?',
    answer:
      'Only activity collected after you start: the selected tab’s video, console messages, network activity, page details, and any steps you add manually.',
  },
  {
    question: 'Does a recording upload automatically?',
    answer:
      'No. The capture stays in extension-owned browser storage. Downloading creates a local report bundle; email delivery happens only after you explicitly choose it.',
  },
  {
    question: 'Why do I need Chrome Developer mode?',
    answer:
      'This is a pre-release package distributed through GitHub Releases. Chrome requires Developer mode to load an unpacked extension that is not yet in the Chrome Web Store.',
  },
  {
    question: 'Can I remove sensitive evidence before export?',
    answer:
      'Yes. Review the recording, console entries, network entries, steps, and behavior descriptions before downloading or sharing the report.',
  },
] as const;

function Home() {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand" href="#top" aria-label="BugReceipt home">
            <Mark /> BugReceipt
          </a>
          <nav aria-label="Main navigation">
            <a href="#details">Details</a>
            <a href="#workflow">Workflow</a>
            <a href="#privacy">Privacy</a>
            <a href="#install">Install</a>
          </nav>
        </div>
      </header>
      <main id="top">
        <section className="hero shell">
          <div className="hero-copy">
            <h1>
              Turn “it broke” into <em>reproducible.</em>
            </h1>
            <p className="lede">
              Capture the interaction, steps, console failure, and page details in one local
              review—then export a GitHub-ready issue with screen recording.
            </p>
            <div className="hero-actions">
              <a className="button primary" href={releaseUrl} target="_blank" rel="noreferrer">
                Download BugReceipt
              </a>
              <a className="button secondary" href="#details">
                Explore what it captures
              </a>
            </div>
            <p className="boundary-line">
              Chrome 120+ · Pre-release ZIP · No account · Nothing sent without your click
            </p>
          </div>
          <EvidencePreview />
        </section>

        <section className="trust-strip" aria-label="Product boundaries">
          <span>01 · Starts only when you ask</span>
          <span>02 · Filters before storage</span>
          <span>03 · Exports local files</span>
        </section>

        <section className="details shell" id="details">
          <div className="details-heading">
            <h2>The evidence developers ask for, already together.</h2>
            <p>
              BugReceipt follows the failure across pixels, browser activity, and human context. The
              result is one reviewable report instead of a screenshot with no explanation.
            </p>
          </div>
          <dl className="capture-ledger">
            {capturedEvidence.map(([term, description], index) => (
              <div key={term}>
                <dt>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {term}
                </dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
          <div className="bundle-proof" aria-label="BugReceipt download and report contents">
            <div>
              <strong>Know what is inside each download.</strong>
              <p>
                The GitHub release includes the complete extension package and its checksum.
                BugReceipt then keeps each bug report and its visual evidence together locally.
              </p>
            </div>
            <div className="bundle-trees">
              <code>
                BugReceipt-v0.1.4-chrome-unpacked.zip
                <span>manifest.json</span>
                <span>sidepanel.html</span>
                <span>review.html</span>
                <span>scripts + icons</span>
              </code>
              <code>
                bugreceipt-report.zip
                <span>issue.md</span>
                <span>recording.webm</span>
              </code>
            </div>
          </div>
        </section>

        <section className="workflow shell" id="workflow">
          <div className="section-heading">
            <h2>Evidence, not guesswork.</h2>
          </div>
          <ol>
            <WorkflowStep number="01" title="Start at the failure">
              Open BugReceipt on the affected tab. Capture begins only after your click.
            </WorkflowStep>
            <WorkflowStep number="02" title="Reproduce and annotate">
              Repeat the bug and add the human steps that console output cannot explain.
            </WorkflowStep>
            <WorkflowStep number="03" title="Review every field">
              Inspect the filtered errors and screen recording, then export locally or explicitly
              email the report.
            </WorkflowStep>
          </ol>
        </section>

        <section className="privacy" id="privacy">
          <div className="shell privacy-grid">
            <div>
              <h2>Your bug report stays local until you send it.</h2>
            </div>
            <div className="privacy-list">
              <p>
                <strong>Never captured</strong>
                <span>Cookies, form values, keystrokes, browser storage, or page HTML.</span>
              </p>
              <p>
                <strong>Filtered locally</strong>
                <span>
                  Text and JSON request or response bodies, URL queries, email addresses, bearer
                  tokens, and secret-like fields.
                </span>
              </p>
              <p>
                <strong>Always reviewable</strong>
                <span>
                  Every exported field and the screen recording are visible before download.
                </span>
              </p>
              <p>
                <strong>Email only on request</strong>
                <span>A reviewed report is sent only after you choose Email report.</span>
              </p>
            </div>
          </div>
        </section>

        <section className="install shell" id="install">
          <div className="install-copy">
            <h2>From ZIP to side panel in three steps.</h2>
            <p>
              The current pre-release is packaged directly from the verified production extension
              build. Keep the extracted folder in place after installation.
            </p>
            <a className="button primary" href={releaseUrl} target="_blank" rel="noreferrer">
              Download BugReceipt
            </a>
            <small>Chrome 120+ · Version 0.1.4 · Developer mode installation</small>
          </div>
          <ol className="install-steps">
            <InstallStep number="01" title="Download and extract">
              Download the Chrome ZIP and extract it to a folder you will keep.
            </InstallStep>
            <InstallStep number="02" title="Load unpacked">
              Open <code>chrome://extensions</code>, enable Developer mode, choose Load unpacked,
              and select the extracted folder.
            </InstallStep>
            <InstallStep number="03" title="Pin and capture">
              Pin BugReceipt to the toolbar, open a normal website, and click it to keep the capture
              panel open on the right.
            </InstallStep>
          </ol>
        </section>

        <section className="questions" id="questions">
          <div className="shell questions-grid">
            <h2>Know the boundaries before you install.</h2>
            <div>
              {questions.map(({ question, answer }, index) => (
                <details key={question} open={index === 0}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="closing shell">
          <h2>Capture the failure while it is still visible.</h2>
          <p className="closing-copy">
            Download the pre-release Chrome extension, reproduce the problem once, and leave the
            next developer enough evidence to act.
          </p>
          <a className="button primary" href={releaseUrl} target="_blank" rel="noreferrer">
            Download BugReceipt for Chrome
          </a>
        </section>
      </main>
      <footer>
        <div className="shell">
          <span>
            <Mark /> BugReceipt
          </span>
          <span className="footer-links">
            <a href="#details">Details</a>
            <a href="#privacy">Privacy</a>
            <a href="#install">Install</a>
          </span>
        </div>
      </footer>
    </>
  );
}

function InstallStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li>
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </li>
  );
}

function Mark() {
  return (
    <i className="mark" aria-hidden="true">
      <b />
      <b />
      <b />
    </i>
  );
}

function EvidencePreview() {
  return (
    <figure className="evidence-preview">
      <img
        src="/brand/bugreceipt-review-latest.jpg"
        width="1905"
        height="933"
        alt="BugReceipt extension review workspace with the issue report, visual evidence, console, and network tabs"
        fetchPriority="high"
      />
      <figcaption>Current review workspace · Latest</figcaption>
    </figure>
  );
}

function WorkflowStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: string;
}) {
  return (
    <li>
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </li>
  );
}
