import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Button, buttonVariants } from '#/components/ui/button';
import { cn } from '#/lib/utils';
import appCss from '../styles.css?url';

const siteUrl = 'https://bugreceipt.netlify.app';
const socialImageUrl = `${siteUrl}/brand/bugreceipt-social-v1.png`;
const title = 'BugReceipt · Bug reports developers can reproduce';
const description =
  'BugReceipt records the Chrome tab you are testing, keeps console and network evidence with your steps, and exports a report you review before sharing. Nothing leaves your machine until you share it.';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title },
      { name: 'description', content: description },
      { name: 'theme-color', content: '#f6f8f9' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: socialImageUrl },
      { property: 'og:image:secure_url', content: socialImageUrl },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content: 'BugReceipt turns incomplete browser bug reports into reproducible evidence.',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: socialImageUrl },
      {
        name: 'twitter:image:alt',
        content: 'BugReceipt turns incomplete browser bug reports into reproducible evidence.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'icon',
        href: '/brand/bugreceipt-mark.svg',
        type: 'image/svg+xml',
      },
      {
        rel: 'icon',
        href: '/brand/bugreceipt-32.png',
        type: 'image/png',
        sizes: '32x32',
      },
      {
        rel: 'apple-touch-icon',
        href: '/brand/bugreceipt-180.png',
        sizes: '180x180',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: ServerError,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className="scroll-smooth bg-fog text-ink [scrollbar-color:#0f7a6d_#f6f8f9] motion-reduce:scroll-auto"
    >
      <head>
        <HeadContent />
      </head>
      <body
        className={cn(
          'm-0 min-w-80 bg-fog font-sans text-base leading-[1.6] [font-synthesis:none]',
          'selection:bg-ink selection:text-paper',
        )}
      >
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="This page left no trace."
      description="The address does not match a BugReceipt page. Nothing was changed, captured, or sent."
      rows={[
        ['Requested resource', 'No matching page'],
        ['Report state', 'No data changed'],
        ['Recovery', 'Return to the landing page'],
      ]}
    >
      <a className={buttonVariants({ variant: 'primary' })} href="/">
        Return to BugReceipt
      </a>
    </ErrorScreen>
  );
}

export function ServerError({ reset }: ErrorComponentProps) {
  return (
    <ErrorScreen
      code="500"
      title="The page hit an unexpected failure."
      description="BugReceipt could not finish rendering this page. Retry once, or return home if the problem continues."
      rows={[
        ['Failure class', 'Unexpected application error'],
        ['Privacy state', 'No diagnostic data sent'],
        ['Recovery', 'Retry this page or return home'],
      ]}
    >
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
      <a className={buttonVariants({ variant: 'secondary' })} href="/">
        Return home
      </a>
    </ErrorScreen>
  );
}

function ErrorScreen({
  code,
  title: errorTitle,
  description: errorDescription,
  rows,
  children,
}: {
  code: '404' | '500';
  title: string;
  description: string;
  rows: ReadonlyArray<readonly [string, string]>;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="relative z-10 flex h-[76px] items-center justify-between border-b border-line bg-[rgb(248_251_252_/_0.96)] px-[max(2rem,calc((100%-1400px)/2))] max-[620px]:h-[68px] max-[620px]:px-4">
        <a
          className="inline-flex items-center gap-2.5 text-xl leading-[1.1] font-[790] tracking-[-0.025em] text-ink no-underline"
          href="/"
          aria-label="BugReceipt home"
        >
          <ErrorMark /> BugReceipt
        </a>
        <span className="font-mono text-[0.71875rem] font-[650] tracking-[0.08em] text-muted-text uppercase max-[620px]:hidden">
          Recovery console
        </span>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-76px)] w-[min(1400px,calc(100%-4rem))] grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)] items-center gap-[clamp(55px,8vw,120px)] py-20 max-[900px]:grid-cols-1 max-[620px]:w-[calc(100%-2rem)] max-[620px]:gap-[55px] max-[620px]:py-[58px]">
        <section aria-labelledby={`error-${code}-title`}>
          <h1
            className="m-0 max-w-[620px] text-[clamp(3rem,4.8vw,3.75rem)] leading-none font-[560] tracking-[-0.035em]"
            id={`error-${code}-title`}
          >
            {errorTitle}
          </h1>
          <p className="mt-7 mb-0 max-w-[65ch] leading-[1.65] text-muted-text">
            {errorDescription}
          </p>
          <div className="mt-[38px] flex flex-wrap gap-[13px] max-[620px]:flex-col max-[620px]:items-stretch">
            {children}
          </div>
        </section>
        <article
          className="border border-ink bg-paper shadow-[0_22px_48px_rgb(16_35_50_/_0.14)]"
          aria-label={`${code} recovery details`}
        >
          <div className="flex justify-between gap-5 border-b border-line px-[18px] py-[15px] font-mono text-[0.6875rem] font-[650] tracking-[0.08em] uppercase">
            <span>System receipt</span>
            <b className="text-signal-text">Status / {code}</b>
          </div>
          <strong
            className="block px-6 pt-[38px] pb-[34px] font-mono text-[clamp(3.5rem,7vw,4.5rem)] leading-[0.95] font-[720] tracking-[-0.04em] text-ink"
            aria-hidden="true"
          >
            {code}
          </strong>
          <dl className="m-0 border-t border-ink">
            {rows.map(([term, value]) => (
              <div
                className="grid grid-cols-[minmax(150px,0.75fr)_1.25fr] gap-6 border-b border-line p-[18px] max-[620px]:grid-cols-1 max-[620px]:gap-1.5"
                key={term}
              >
                <dt className="font-mono text-[0.6875rem] font-[650] tracking-[0.05em] text-muted-text uppercase">
                  {term}
                </dt>
                <dd className="m-0 font-[680]">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-between gap-5 px-[18px] py-[15px] font-mono text-[0.6875rem] font-[650] tracking-[0.08em] text-muted-text uppercase">
            <span>BugReceipt</span>
            <span className="text-trace-text">Local export</span>
          </div>
        </article>
      </main>
    </div>
  );
}

function ErrorMark() {
  return (
    <i className="grid w-[27px] shrink-0 skew-x-[-10deg] gap-[3px]" aria-hidden="true">
      <b className="h-1 bg-ink" />
      <b className="h-1 w-[76%] bg-signal" />
      <b className="h-1 w-[48%] bg-trace" />
    </i>
  );
}
