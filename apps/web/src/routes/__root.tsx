import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
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
          async
          src="https://supportkori.com/widget.js"
          data-id="montasim"
          data-message="Support me"
          data-color="#ff5c3a"
          data-position="right"
        />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="not-found">
      <p>404 · No evidence here</p>
      <h1>This page was not captured.</h1>
      <a href="/">Return to BugReceipt</a>
    </main>
  );
}
