import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, buttonVariants } from '#/components/ui/button';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/')({ component: Home });

const releaseUrl = 'https://github.com/montasim/BugReceipt/releases/latest';
const shell =
  'mx-auto w-[min(1400px,calc(100%-4rem))] max-[900px]:w-[min(100%-2.5rem,1400px)] max-[620px]:w-[min(calc(100%-2rem),1400px)]';
const sectionTitle =
  'm-0 max-w-[800px] text-[clamp(2.125rem,3.2vw,2.5rem)] leading-[1.1] font-[560] tracking-[-0.035em]';
const monoLabel = 'font-mono text-[0.71875rem] font-[650]';

const traceEvents = [
  { time: '00:00', title: 'Record', description: 'You start recording on a browser tab.' },
  { time: '00:08', title: 'Console', description: 'Errors and warnings are captured.' },
  { time: '00:12', title: 'Network', description: 'Requests, responses, status, and timing.' },
  { time: '00:18', title: 'Review', description: 'Inspect the trace, filter noise, add steps.' },
  { time: '00:24', title: 'Export', description: 'Choose the local files that leave.' },
] as const;

const capturedEvidence = [
  ['Screen recording', 'Selected tab only', 'No microphone, tab audio, or unrelated windows.'],
  ['Console timeline', 'Errors first', 'Logs, warnings, exceptions, and rejected promises.'],
  [
    'Network activity',
    'Filtered locally',
    'Fetch, XHR, and page requests with sensitive details removed.',
  ],
  [
    'Reproduction context',
    'Tester supplied',
    'Steps, page URL, browser version, and behavior notes.',
  ],
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
      'Yes. Review the recording, selected frames, console entries, network entries, steps, and behavior descriptions before downloading or sharing the report.',
  },
] as const;

function Home() {
  return (
    <div className="landing-page min-h-screen overflow-clip">
      <header className="relative z-10 h-[76px] border-b border-line bg-[rgb(248_251_252_/_0.96)] max-[620px]:h-[68px]">
        <div
          className={cn(
            'mx-auto grid h-full w-[min(1464px,calc(100%-4rem))] grid-cols-[auto_1fr_auto] items-center gap-10',
            'max-[1180px]:grid-cols-[1fr_auto] max-[900px]:w-[min(100%-2.5rem,1464px)] max-[620px]:w-[min(calc(100%-2rem),1400px)]',
          )}
        >
          <a
            className="inline-flex items-center gap-2.5 text-xl leading-[1.1] font-[790] tracking-[-0.025em] text-ink no-underline"
            href="#top"
            aria-label="BugReceipt home"
          >
            <Mark />
            <span>BugReceipt</span>
            <small className="ml-1 font-mono text-[0.71875rem] font-[620] tracking-normal text-muted-text max-[620px]:hidden">
              v0.1.4
            </small>
          </a>
          <nav
            className="flex justify-center gap-[clamp(24px,3.4vw,54px)] max-[1180px]:hidden"
            aria-label="Main navigation"
          >
            {[
              ['#workflow', 'How it works'],
              ['#evidence', 'What’s captured'],
              ['#privacy', 'Privacy first'],
              ['#install', 'Install'],
            ].map(([href, label]) => (
              <a
                key={href}
                className="text-[0.8125rem] leading-[1.3] font-[680] tracking-[0.01em] no-underline hover:text-signal-text"
                href={href}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-5">
            <a
              className={cn(buttonVariants({ variant: 'header' }), 'max-[900px]:hidden')}
              href={releaseUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download pre-release
            </a>
            <SupportButton />
          </div>
        </div>
      </header>

      <main id="top">
        <section
          className={cn(
            shell,
            'grid min-h-[444px] grid-cols-[minmax(0,0.94fr)_minmax(420px,0.76fr)] items-center gap-[clamp(3rem,6vw,5rem)] pt-12 pb-[clamp(5rem,8vw,7rem)]',
            'max-[1180px]:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)] max-[1180px]:gap-14',
            'max-[900px]:grid-cols-1 max-[900px]:gap-10 max-[900px]:py-14 max-[900px]:pb-16',
            'max-[620px]:min-h-0 max-[620px]:py-10 max-[620px]:pb-14',
          )}
          aria-labelledby="hero-title"
        >
          <div>
            <h1
              id="hero-title"
              className="m-0 max-w-[690px] text-[clamp(3rem,4.8vw,3.75rem)] leading-[1.04] font-[520] tracking-[-0.035em]"
            >
              Turn broken into{' '}
              <em className="block font-[600] not-italic text-signal-text">reproducible.</em>
            </h1>
            <p className="my-6 max-w-[62ch] text-[1.0625rem] leading-[1.55] text-muted-text max-[620px]:text-base">
              BugReceipt records what matters—one browser tab, console errors, network activity, and
              your manual QA steps—so you can review everything locally and export when you’re
              ready.
            </p>
            <a
              className={cn(buttonVariants({ variant: 'primary' }), 'max-[620px]:w-full')}
              href={releaseUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ChromeMark />
              Download BugReceipt for Chrome
            </a>
            <span className="mt-4 block font-mono text-[0.6875rem] font-[620] tracking-[0.13em] text-muted-text uppercase">
              Private by design · No accounts · No cloud
            </span>
          </div>
          <ExtensionPanel />
        </section>

        <section
          className={cn(shell, 'scroll-mt-[76px] pt-2 max-[900px]:pt-1')}
          id="workflow"
          aria-label="BugReceipt evidence trace"
        >
          <ol
            className={cn(
              'trace-events relative m-0 grid list-none grid-cols-5 px-8 pb-8',
              'before:absolute before:top-[53px] before:right-0.5 before:left-0.5 before:h-0.5 before:bg-line before:content-[""]',
              'after:absolute after:top-[53px] after:left-0.5 after:h-0.5 after:w-[72%] after:origin-left after:animate-trace-arrive after:bg-trace after:content-[""]',
              'max-[900px]:grid-cols-1 max-[900px]:p-0',
              'max-[900px]:before:top-0 max-[900px]:before:bottom-0 max-[900px]:before:left-[7px] max-[900px]:before:h-auto max-[900px]:before:w-0.5',
              'max-[900px]:after:top-0 max-[900px]:after:bottom-auto max-[900px]:after:left-[7px] max-[900px]:after:h-[72%] max-[900px]:after:w-0.5',
            )}
          >
            {traceEvents.map((event, index) => {
              const active = index === 3;
              return (
                <li
                  key={event.title}
                  className={cn(
                    'relative z-1 grid min-w-0 justify-items-center text-center',
                    'max-[900px]:min-h-20 max-[900px]:grid-cols-[17px_58px_1fr] max-[900px]:grid-rows-[auto_auto] max-[900px]:justify-items-start max-[900px]:gap-x-4 max-[900px]:text-left',
                    'max-[620px]:min-h-[76px]',
                    active &&
                      'after:absolute after:top-[53px] after:right-1/2 after:h-0.5 after:w-[28%] after:bg-signal after:content-[""] max-[900px]:after:top-0 max-[900px]:after:bottom-0 max-[900px]:after:left-[7px] max-[900px]:after:h-auto max-[900px]:after:w-0.5',
                  )}
                >
                  <span
                    className={cn(
                      monoLabel,
                      'text-trace-text max-[900px]:col-start-2',
                      active && 'text-signal-text',
                    )}
                  >
                    {event.time}
                  </span>
                  <strong
                    className={cn(
                      'mt-0.5 font-mono text-xs font-[650] text-trace-text max-[900px]:col-start-3 max-[900px]:row-start-1 max-[900px]:m-0',
                      active && 'text-signal-text',
                    )}
                  >
                    {event.title}
                  </strong>
                  <i
                    className={cn(
                      'my-[13px] mb-1 h-[17px] w-[17px] rounded-full border-[3px] border-trace bg-fog',
                      'max-[900px]:row-span-2 max-[900px]:m-0',
                      active && 'border-signal',
                    )}
                    aria-hidden="true"
                  />
                  <p className="m-0 max-w-[155px] text-[0.6875rem] leading-[1.45] text-ink max-[900px]:col-[2/-1] max-[900px]:row-start-2 max-[900px]:max-w-[450px]">
                    {event.description}
                  </p>
                </li>
              );
            })}
          </ol>

          <div
            className={cn(
              'relative grid min-h-[205px] grid-cols-[42px_1.15fr_1fr_1fr_1fr_1fr] gap-6 border-b border-line py-8 pt-10',
              'max-[1180px]:grid-cols-[36px_repeat(5,minmax(190px,1fr))] max-[1180px]:overflow-x-auto',
              'max-[900px]:mt-8 max-[900px]:pt-14',
              'max-[620px]:grid-cols-[28px_repeat(5,235px)] max-[620px]:gap-4',
            )}
            id="evidence"
          >
            <span className="absolute top-3 right-0 font-mono text-[0.6875rem] font-[620] tracking-[0.08em] text-muted-text uppercase">
              Illustrative example · sample checkout failure
            </span>
            <p className="m-0 self-stretch border-r border-line font-mono text-[0.71875rem] font-[650] tracking-[0.13em] text-muted-text uppercase [writing-mode:vertical-rl] rotate-180">
              Evidence trace
            </p>
            <TraceRecord />
            <TraceConsole />
            <TraceNetwork />
            <TraceReview />
            <TraceExport />
          </div>
        </section>

        <section
          className="mt-[200px] border-b border-line bg-paper"
          id="privacy"
          aria-labelledby="privacy-title"
        >
          <div
            className={cn(
              shell,
              'grid min-h-[124px] grid-cols-[1.35fr_repeat(4,1fr)] items-stretch',
              'max-[1180px]:grid-cols-2',
              'max-[620px]:w-full max-[620px]:grid-cols-1',
            )}
          >
            <h2
              id="privacy-title"
              className="m-0 self-center px-0 py-6 pr-8 text-[clamp(1.5rem,2vw,2rem)] leading-[1.08] font-[570] tracking-[-0.035em] max-[1180px]:col-span-full max-[1180px]:border-b max-[1180px]:border-line-soft max-[620px]:px-4 max-[620px]:py-5"
            >
              Local until you choose to <em className="not-italic text-signal-text">share.</em>
            </h2>
            <PrivacyPrinciple icon="lock" title="Everything stays on your device">
              No upload. No cloud. No third-party servers.
            </PrivacyPrinciple>
            <PrivacyPrinciple icon="eye-off" title="Captures only after you start">
              Before you click record, nothing is collected.
            </PrivacyPrinciple>
            <PrivacyPrinciple icon="sliders" title="You control what gets exported">
              Review, filter, annotate, and remove before export.
            </PrivacyPrinciple>
            <PrivacyPrinciple icon="download" title="Export is always your choice">
              Send it to a team, or keep it for later.
            </PrivacyPrinciple>
          </div>
        </section>

        <section
          className={cn(shell, 'scroll-mt-[76px] py-[clamp(4.5rem,7vw,6rem)] max-[620px]:py-16')}
          aria-labelledby="ledger-title"
        >
          <div className="grid grid-cols-[1fr_minmax(360px,0.72fr)] items-end gap-[clamp(3rem,6vw,5rem)] border-b border-line pb-6 max-[900px]:grid-cols-1 max-[900px]:gap-8 max-[620px]:gap-6">
            <h2 className={sectionTitle} id="ledger-title">
              Every signal remains inspectable.
            </h2>
            <p className="m-0 max-w-[65ch] leading-[1.65] text-muted-text">
              The trace is not a black box. BugReceipt keeps each evidence type visible in the
              review so a tester can remove noise, capture a frame, annotate the problem, and verify
              the report before it leaves the browser.
            </p>
          </div>
          <div className="grid grid-cols-[minmax(0,1.22fr)_minmax(390px,0.78fr)] items-start gap-12 pt-8 max-[1180px]:grid-cols-1 max-[620px]:pt-7">
            <ExtensionTour large />
            <ol className="m-0 list-none border-t border-ink p-0">
              {capturedEvidence.map(([label, meta, description], index) => (
                <li
                  key={label}
                  className="grid grid-cols-[46px_1fr] gap-4 border-b border-line py-5"
                >
                  <span className={cn(monoLabel, 'text-trace-text')}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 max-[620px]:grid-cols-1">
                    <strong className="text-lg leading-[1.3] tracking-[-0.02em]">{label}</strong>
                    <small className="font-mono text-[0.6875rem] font-[600] text-signal-text uppercase">
                      {meta}
                    </small>
                    <p className="col-span-full m-0 text-sm leading-[1.5] text-muted-text">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className={cn(
            shell,
            'grid scroll-mt-[76px] grid-cols-[0.82fr_1.18fr] gap-[clamp(3rem,6vw,5rem)] border-t border-line py-[clamp(4.5rem,7vw,6rem)]',
            'max-[900px]:grid-cols-1 max-[900px]:gap-12 max-[620px]:py-16',
          )}
          id="install"
          aria-labelledby="install-title"
        >
          <div>
            <h2 className={sectionTitle} id="install-title">
              From ZIP to a persistent side panel.
            </h2>
            <p className="my-6 mb-7 max-w-[65ch] leading-[1.65] text-muted-text">
              The current pre-release is distributed through GitHub as an unpacked Chrome extension.
              Keep the extracted folder in place after installation.
            </p>
            <a
              className={buttonVariants({ variant: 'primary' })}
              href={releaseUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download BugReceipt
              <ArrowIcon />
            </a>
            <code className="mt-4 block font-mono text-[0.6875rem] font-[560] text-muted-text">
              BugReceipt-v0.1.4-chrome-unpacked.zip
            </code>
          </div>
          <ol className="m-0 list-none border-y border-ink p-0">
            <RunbookStep number="01" title="Download and extract">
              Download the Chrome ZIP and extract it to a folder you will keep.
            </RunbookStep>
            <RunbookStep number="02" title="Load unpacked">
              Open <code>chrome://extensions</code>, enable Developer mode, choose Load unpacked,
              and select the folder containing <code>manifest.json</code>.
            </RunbookStep>
            <RunbookStep number="03" title="Pin and capture" last>
              Pin BugReceipt, open the affected page, and keep the side panel visible while you
              reproduce the issue.
            </RunbookStep>
          </ol>
        </section>

        <section
          className="scroll-mt-[76px] border-y border-line bg-paper py-[clamp(4rem,6vw,5rem)] max-[620px]:py-16"
          id="questions"
          aria-labelledby="questions-title"
        >
          <div
            className={cn(
              shell,
              'grid grid-cols-[0.72fr_1.28fr] gap-[clamp(3rem,6vw,5rem)] max-[900px]:grid-cols-1 max-[900px]:gap-8',
            )}
          >
            <h2 className={sectionTitle} id="questions-title">
              Know the boundary before you install.
            </h2>
            <div>
              {questions.map(({ question, answer }, index) => (
                <details
                  className="group border-t border-line last:border-b"
                  key={question}
                  open={index === 0}
                >
                  <summary className="relative cursor-pointer list-none py-5 pr-12 text-lg leading-[1.35] font-[720] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-trace [&::-webkit-details-marker]:hidden">
                    {question}
                    <span className="absolute top-[17px] right-[5px] text-[1.7rem] font-[430] text-signal-text group-open:hidden">
                      +
                    </span>
                    <span className="absolute top-[17px] right-[5px] hidden text-[1.7rem] font-[430] text-signal-text group-open:block">
                      −
                    </span>
                  </summary>
                  <p className="mt-[-2px] mr-12 mb-6 max-w-[65ch] leading-[1.6] text-muted-text">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          className={cn(
            shell,
            'flex scroll-mt-[76px] items-center justify-between gap-[clamp(3rem,6vw,5rem)] py-[clamp(4rem,6vw,5rem)]',
            'max-[900px]:flex-col max-[900px]:items-start max-[900px]:justify-center max-[900px]:gap-8',
            'max-[620px]:py-16',
          )}
          aria-labelledby="closing-title"
        >
          <div>
            <h2 className={cn(sectionTitle, 'max-w-[850px]')} id="closing-title">
              Capture the failure while the trace is still intact.
            </h2>
            <p className="mt-4 max-w-[65ch] leading-[1.65] text-muted-text">
              Reproduce once. Hand off the screen, browser signals, and steps as one local report.
            </p>
          </div>
          <a
            className={cn(buttonVariants({ variant: 'primary' }), 'max-[620px]:w-full')}
            href={releaseUrl}
            target="_blank"
            rel="noreferrer"
          >
            Download BugReceipt for Chrome
            <ArrowIcon />
          </a>
        </section>
      </main>

      <footer className="bg-ink text-white">
        <div
          className={cn(
            shell,
            'grid min-h-[82px] grid-cols-[auto_1fr_auto] items-center gap-8 text-xs leading-[1.5] font-[560] tracking-[0.04em] text-[#a9bdc6] uppercase',
            'max-[620px]:min-h-0 max-[620px]:grid-cols-1 max-[620px]:gap-3 max-[620px]:py-6',
          )}
        >
          <span className="inline-flex items-center gap-2.5 text-base font-[790] tracking-[-0.025em] text-white normal-case">
            <Mark /> BugReceipt
          </span>
          <span>Privacy-first bug reports for developers, QA, and support.</span>
          <nav className="flex gap-[26px] max-[620px]:mt-2" aria-label="Footer navigation">
            <a
              className="text-[0.8125rem] leading-[1.3] font-[680] tracking-[0.01em] no-underline hover:text-signal-text"
              href="https://github.com/montasim/BugReceipt"
              target="_blank"
              rel="noreferrer"
            >
              Open source
            </a>
            <a
              className="text-[0.8125rem] leading-[1.3] font-[680] tracking-[0.01em] no-underline hover:text-signal-text"
              href={releaseUrl}
              target="_blank"
              rel="noreferrer"
            >
              Releases
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function TraceHeader({ time, title }: { time: string; title: string }) {
  return (
    <header className="mb-2 flex items-baseline gap-3 font-mono text-[0.71875rem] font-[650] text-trace-text">
      <span>{time}</span>
      <strong className="text-xs">{title}</strong>
    </header>
  );
}

const traceArticle = 'flex min-w-0 flex-col';
const traceFooter = 'mt-auto pt-2 font-mono text-[0.6875rem] font-[560] text-muted-text';

function TraceRecord() {
  return (
    <article className={traceArticle}>
      <TraceHeader time="00:00" title="Record" />
      <ExtensionTour />
      <dl className="mt-2 mb-0">
        {[
          ['URL', 'app.example.com/checkout'],
          ['Started', '09:41:02 AM'],
        ].map(([term, value]) => (
          <div
            className="mt-1 grid grid-cols-[45px_1fr] gap-2 font-mono text-[0.6875rem] font-[530]"
            key={term}
          >
            <dt className="text-muted-text">{term}</dt>
            <dd className="m-0 min-w-0 overflow-hidden text-ellipsis">{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function TraceConsole() {
  return (
    <article className={traceArticle}>
      <TraceHeader time="00:08" title="Console" />
      <pre className="m-0 whitespace-pre-wrap font-mono text-[0.6875rem] leading-[1.5] font-[540]">
        <b className="font-[650] text-signal-text">12:41:08.512 × TypeError:</b> Cannot read
        properties of undefined at onSubmit
        <mark className="bg-transparent text-[#795b0d]">12:41:08.915 △ Warning:</mark> Synchronous
        XHR on the main thread is deprecated.
      </pre>
      <footer className={traceFooter}>3 errors · 2 warnings</footer>
    </article>
  );
}

function TraceNetwork() {
  return (
    <article className={traceArticle}>
      <TraceHeader time="00:12" title="Network" />
      <table className="w-full border-collapse border border-line bg-paper font-mono text-[0.6875rem] font-[560]">
        <tbody>
          {[
            ['POST', '/api/payments', '500'],
            ['GET', '/api/cart', '200'],
            ['GET', '/api/user', '200'],
          ].map(([method, path, status], index) => (
            <tr className={index === 0 ? 'text-signal-text' : undefined} key={path}>
              <th className="border-b border-line-soft px-[7px] py-1.5 text-left">{method}</th>
              <td className="border-b border-line-soft px-[7px] py-1.5 text-left">{path}</td>
              <td className="border-b border-line-soft px-[7px] py-1.5 text-right">{status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer className={traceFooter}>18 requests · 2 failed</footer>
    </article>
  );
}

function TraceReview() {
  return (
    <article className={traceArticle}>
      <TraceHeader time="00:18" title="Review" />
      <ul className="m-0 list-none border border-line bg-paper px-2.5 py-2 font-mono text-[0.6875rem] leading-[1.5] font-[540]">
        {[
          'Reproduced on Chrome',
          'Logged in as test user',
          'Added item to cart',
          'Clicked “Pay now”',
          'Payment failed with 500',
        ].map((item) => (
          <li
            className="before:mr-2 before:mb-[0.22em] before:inline-block before:h-0.5 before:w-2 before:bg-trace-text before:content-['']"
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
      <footer className={traceFooter}>5 manual steps · Notes attached</footer>
    </article>
  );
}

function TraceExport() {
  return (
    <article className={traceArticle}>
      <TraceHeader time="00:24" title="Export" />
      <pre className="m-0 whitespace-pre-wrap bg-ink p-3 font-mono text-[0.6875rem] leading-[1.5] font-[540] text-[#c6e9ec]">
        bugreceipt-report/
        {'  '}├─ issue.md
        {'  '}├─ recording.webm
        {'  '}└─ selected-frame.png
      </pre>
      <footer className={traceFooter}>All files stay on your device</footer>
    </article>
  );
}

function ExtensionPanel() {
  return (
    <article
      className={cn(
        'relative w-full max-w-[490px] self-end justify-self-end border border-ink bg-paper shadow-[0_22px_48px_rgb(16_35_50_/_0.13)]',
        'after:pointer-events-none after:absolute after:bottom-[-4.5rem] after:left-[28%] after:h-18 after:w-20 after:-translate-x-full after:border-r after:border-b after:border-dashed after:border-muted-text after:content-[""]',
        'max-[900px]:max-w-none max-[900px]:justify-self-stretch max-[900px]:after:hidden',
      )}
      aria-label="BugReceipt extension capture panel"
    >
      <header className="flex min-h-14 items-center justify-between gap-5 border-b border-line px-5 max-[620px]:px-4">
        <span className="inline-flex items-center gap-2.5 text-base font-[790] tracking-[-0.025em] text-ink">
          <Mark compact /> BugReceipt{' '}
          <small className="ml-1 font-mono text-[0.71875rem] font-[620] tracking-normal text-muted-text">
            v0.1.4
          </small>
        </span>
        <SupportButton compact />
      </header>
      <div className="px-5 pt-5 pb-4 max-[620px]:px-4">
        <h2 className="mt-0 mb-3 text-[1.375rem] leading-[1.12] font-[560] tracking-[-0.025em]">
          Record the failure.
          <em className="block font-[650] not-italic text-signal-text">Keep the evidence.</em>
        </h2>
        <ol className="m-0 list-none border-t border-line p-0">
          {['Steps', 'Console', 'Network', 'Screen'].map((label, index) => (
            <li
              className={cn(
                'flex gap-3 border-b border-line-soft py-2 text-sm leading-[1.4] text-muted-text',
                index === 3 && 'text-signal-text',
              )}
              key={label}
            >
              <span className={cn(monoLabel, 'text-ink', index === 3 && 'text-signal-text')}>
                {String(index + 1).padStart(2, '0')}
              </span>{' '}
              {label}
            </li>
          ))}
        </ol>
        <p className="my-3 text-sm leading-[1.5] text-muted-text">
          BugReceipt captures only what happens after you start. Review everything before export.
        </p>
        <span className="extension-start-control flex min-h-11 items-center justify-center bg-ink text-[0.8125rem] font-[760] text-white">
          Choose tab &amp; start
        </span>
        <small className="mt-2 block text-[0.6875rem] leading-[1.5] text-muted-text">
          Chrome asks which tab to record. No account, microphone, tab audio, or upload.
        </small>
      </div>
    </article>
  );
}

function ExtensionTour({ large = false }: { large?: boolean }) {
  const previewRef = useRef<HTMLElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isVisible = !document.hidden;
    let isInView = true;

    const syncAnimation = () =>
      setShouldAnimate(!motionPreference.matches && isVisible && isInView);
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      syncAnimation();
    };
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            ([entry]) => {
              isInView = entry.isIntersecting;
              syncAnimation();
            },
            { rootMargin: '160px' },
          )
        : null;

    if (previewRef.current) observer?.observe(previewRef.current);
    motionPreference.addEventListener('change', syncAnimation);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    syncAnimation();

    return () => {
      observer?.disconnect();
      motionPreference.removeEventListener('change', syncAnimation);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <figure
      className={cn(
        'relative m-0 overflow-hidden border border-line bg-paper',
        large && 'shadow-[0_24px_42px_rgb(16_35_50_/_0.14)]',
      )}
      ref={previewRef}
    >
      <img
        className="block aspect-[1200/588] h-auto w-full object-cover"
        src={
          shouldAnimate
            ? '/brand/bugreceipt-extension-tour.gif'
            : '/brand/bugreceipt-extension-tour-poster.jpg'
        }
        width="1200"
        height="588"
        alt="BugReceipt extension workflow showing tab capture, recording status, review, selected-frame annotation, diagnostics, and report export"
        fetchPriority={large ? 'auto' : 'high'}
      />
      <figcaption
        className={cn(
          'absolute inset-x-0 bottom-0 bg-[rgb(8_25_35_/_0.88)] px-[7px] py-[5px] font-mono text-[0.6875rem] font-[550] tracking-[0.06em] text-white uppercase',
          large && 'px-3 py-2.5',
        )}
      >
        Extension workflow · Live preview
      </figcaption>
    </figure>
  );
}

function PrivacyPrinciple({
  icon,
  title,
  children,
}: {
  icon: IconKind;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="grid grid-cols-[36px_1fr] items-center gap-3 border-l border-line-soft p-5 odd:max-[1180px]:border-l-0 max-[620px]:border-t max-[620px]:border-l-0 max-[620px]:px-4 max-[620px]:py-5">
      <SystemIcon kind={icon} className="h-7 w-7" />
      <div>
        <h3 className="mt-0 mb-1 text-sm leading-[1.3]">{title}</h3>
        <p className="m-0 text-[0.8125rem] leading-[1.5] text-muted-text">{children}</p>
      </div>
    </article>
  );
}

function RunbookStep({
  number,
  title,
  children,
  last = false,
}: {
  number: string;
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <li
      className={cn(
        'grid grid-cols-[54px_1fr] gap-5 border-b border-line py-6 max-[620px]:grid-cols-[42px_1fr]',
        last && 'border-b-0',
      )}
    >
      <span className={cn(monoLabel, 'text-trace-text')}>{number}</span>
      <div>
        <h3 className="m-0 text-lg leading-[1.3] tracking-[-0.02em]">{title}</h3>
        <p className="mt-2 mb-0 max-w-[65ch] leading-[1.55] text-muted-text [&_code]:bg-[#dde8ec] [&_code]:px-[5px] [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.86em] [&_code]:text-ink">
          {children}
        </p>
      </div>
    </li>
  );
}

function SupportButton({ compact = false }: { compact?: boolean }) {
  const openSupport = () => {
    document.querySelector<HTMLButtonElement>('.sk-widget-btn')?.click();
  };

  return (
    <Button
      variant={compact ? 'outline' : 'ghost'}
      size={compact ? 'compact' : 'default'}
      onClick={openSupport}
    >
      <SystemIcon kind="cup" className={cn(!compact && 'max-[620px]:hidden')} />
      Support
    </Button>
  );
}

function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <i
      className={cn('grid w-[27px] shrink-0 skew-x-[-10deg] gap-[3px]', compact && 'w-6')}
      aria-hidden="true"
    >
      <b className="h-1 bg-ink" />
      <b className="h-1 w-[76%] bg-signal" />
      <b className="h-1 w-[48%] bg-trace" />
    </i>
  );
}

function ChromeMark() {
  return (
    <i
      className="h-6 w-6 shrink-0 rounded-full border-[6px] border-signal border-r-[#e4c338] border-b-trace bg-[#e9f2f5] shadow-[inset_0_0_0_2px_#376d90]"
      aria-hidden="true"
    />
  );
}

function ArrowIcon() {
  return (
    <svg
      className="h-5 w-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M3 10h13M11 5l5 5-5 5" />
    </svg>
  );
}

type IconKind = 'lock' | 'eye-off' | 'sliders' | 'download' | 'cup';

function SystemIcon({ kind, className }: { kind: IconKind; className?: string }) {
  const paths: Record<IconKind, ReactNode> = {
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" />
        <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v3" />
      </>
    ),
    'eye-off': (
      <>
        <path d="M3 3 21 21M10.6 10.7a2 2 0 0 0 2.7 2.7M9.8 5.2A10.5 10.5 0 0 1 12 5c5.7 0 9 7 9 7a16 16 0 0 1-2.4 3.2M6.2 6.2C4.1 7.7 3 12 3 12s3.3 7 9 7a9.7 9.7 0 0 0 4-.8" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h4M12 12h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
        <circle cx="10" cy="12" r="2" />
      </>
    ),
    download: <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 20h16" />,
    cup: (
      <>
        <path d="M5 8h12v5a6 6 0 0 1-12 0ZM17 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3" />
      </>
    ),
  };

  return (
    <svg
      className={cn(
        'h-[22px] w-[22px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]',
        className,
      )}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  );
}
