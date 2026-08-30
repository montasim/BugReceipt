import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Button, buttonVariants } from '#/components/ui/button';
import { cn } from '#/lib/utils';
import appCss from '../styles.css?url';

const siteUrl = 'https://bugreceipt.netlify.app';
const socialImageUrl = `${siteUrl}/brand/bugreceipt-social-v1.png`;
const title = 'BugReceipt · Turn broken into reproducible';
const description =
  'Capture a privacy-filtered bug reproduction with steps, console messages, network evidence, and a local screen recording—then export a GitHub-ready report.';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title },
      { name: 'description', content: description },
      { name: 'theme-color', content: '#eef3f5' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: siteUrl },
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
      { rel: 'canonical', href: siteUrl },
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
      className="scroll-smooth bg-fog text-ink [scrollbar-color:#1f9fae_#eef3f5] motion-reduce:scroll-auto"
    >
      <head>
        <HeadContent />
      </head>
      <body
        className={cn(
          'm-0 min-w-80 bg-fog font-sans text-base leading-[1.6] [font-synthesis:none]',
          'selection:bg-ink selection:text-paper',
          '[&_.sk-widget-btn]:min-h-11 [&_.sk-widget-btn]:gap-2.5 [&_.sk-widget-btn]:rounded-none [&_.sk-widget-btn]:border [&_.sk-widget-btn]:border-signal [&_.sk-widget-btn]:bg-signal [&_.sk-widget-btn]:px-4 [&_.sk-widget-btn]:py-[11px] [&_.sk-widget-btn]:font-sans [&_.sk-widget-btn]:text-[0.8125rem] [&_.sk-widget-btn]:font-[750] [&_.sk-widget-btn]:text-white [&_.sk-widget-btn]:shadow-none [&_.sk-widget-btn]:transition-[background-color,color,transform] [&_.sk-widget-btn]:duration-180',
          '[&_.sk-widget-btn:hover]:-translate-y-px [&_.sk-widget-btn:hover]:bg-signal-dark [&_.sk-widget-btn:hover]:text-white [&_.sk-widget-btn:active]:translate-y-0 [&_.sk-widget-btn:focus-visible]:outline-3 [&_.sk-widget-btn:focus-visible]:outline-offset-4 [&_.sk-widget-btn:focus-visible]:outline-trace',
          '[&_.sk-widget-btn_svg]:h-[18px] [&_.sk-widget-btn_svg]:w-[18px] [&_.sk-widget-btn_svg]:text-white',
          '[&:has(.landing-page)_.sk-widget-btn]:pointer-events-none [&:has(.landing-page)_.sk-widget-btn]:h-px [&:has(.landing-page)_.sk-widget-btn]:min-h-px [&:has(.landing-page)_.sk-widget-btn]:w-px [&:has(.landing-page)_.sk-widget-btn]:min-w-px [&:has(.landing-page)_.sk-widget-btn]:overflow-hidden [&:has(.landing-page)_.sk-widget-btn]:border-0 [&:has(.landing-page)_.sk-widget-btn]:p-0 [&:has(.landing-page)_.sk-widget-btn]:opacity-0',
          'max-[680px]:[&_.sk-widget-iframe-container]:right-[15px] max-[680px]:[&_.sk-widget-iframe-container]:bottom-[calc(env(safe-area-inset-bottom)+72px)] max-[680px]:[&_.sk-widget-iframe-container]:left-[15px] max-[680px]:[&_.sk-widget-iframe-container]:h-[min(550px,calc(100dvh-env(safe-area-inset-bottom)-96px))] max-[680px]:[&_.sk-widget-iframe-container]:w-auto',
        )}
      >
        {children}
        <Scripts />
        <script
          src="https://www.supportkori.com/widget.js"
          data-id="montasim"
          data-message="Support"
          data-color="#ff5c3a"
          data-position="right"
        />
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
            <span className="text-trace-text">Nothing uploaded</span>
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
