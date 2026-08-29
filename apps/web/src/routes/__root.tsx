import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';
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
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <script
          src="https://www.supportkori.com/widget.js"
          data-id="montasim"
          data-message="Support montasim"
          data-color="#FFDD00"
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
      <a className="button primary" href="/">
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
      <button className="button primary" type="button" onClick={reset}>
        Try again
      </button>
      <a className="button secondary" href="/">
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
    <div className="error-layout">
      <header className="site-header error-header">
        <a className="brand" href="/" aria-label="BugReceipt home">
          <ErrorMark /> BugReceipt
        </a>
        <span>Recovery console</span>
      </header>
      <main className="error-page shell">
        <section className="error-copy" aria-labelledby={`error-${code}-title`}>
          <h1 id={`error-${code}-title`}>{errorTitle}</h1>
          <p>{errorDescription}</p>
          <div className="error-actions">{children}</div>
        </section>
        <article className="error-receipt" aria-label={`${code} recovery details`}>
          <div className="error-receipt-top">
            <span>System receipt</span>
            <b>Status / {code}</b>
          </div>
          <strong className="error-code" aria-hidden="true">
            {code}
          </strong>
          <dl>
            {rows.map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="error-receipt-footer">
            <span>BugReceipt</span>
            <span>Nothing uploaded</span>
          </div>
        </article>
      </main>
    </div>
  );
}

function ErrorMark() {
  return (
    <i className="mark" aria-hidden="true">
      <b />
      <b />
      <b />
    </i>
  );
}
