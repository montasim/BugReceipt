import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import appCss from '../styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'ReproKit · Turn broken into reproducible' },
      {
        name: 'description',
        content:
          'Capture a privacy-filtered bug reproduction with steps, console messages, network evidence, and a local screen recording—then export a GitHub-ready report.',
      },
      { name: 'theme-color', content: '#eef3f5' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
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
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="not-found">
      <p>404 · No evidence here</p>
      <h1>This page was not captured.</h1>
      <a href="/">Return to ReproKit</a>
    </main>
  );
}
