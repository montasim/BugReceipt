import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NotFound, ServerError } from '../src/routes/__root';

describe('extension landing page', () => {
  const route = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');
  const page = readFileSync(
    new URL('../src/prototypes/landing/clean-landing.tsx', import.meta.url),
    'utf8',
  );
  const pageStyles = readFileSync(
    new URL('../src/prototypes/landing/clean-landing.css', import.meta.url),
    'utf8',
  );

  it('promotes the approved landing page at the root route', () => {
    expect(route).toContain("createFileRoute('/')");
    expect(route).toContain('CleanLanding');
    expect(route).toContain('clean-landing.css');
  });

  it('links to the Chrome Web Store and uses the real extension desktop UI', () => {
    expect(page).toContain('chromewebstore.google.com/detail/bugreceipt');
    expect(page).toContain('<ChromeIcon /> Add to Chrome');
    expect(page).toContain('/brand/bugreceipt-extension-real-desktop.png');
    expect(page).toContain('Version 0.2.0 is the latest version.');
  });

  it('explains the product with a demo, privacy details, changelog, and FAQs', () => {
    expect(page).toContain('youtube-nocookie.com/embed/KdrGAhvUyoY');
    expect(page).toContain('Everything needed to reproduce the problem.');
    expect(page).toContain('Your report stays under your control.');
    expect(page).toContain('<h2>Changelog</h2>');
    expect(page).toContain('Frequently asked questions');
    expect(page).toContain('Report bugs with proof.');
  });

  it('supports light and dark themes with responsive layouts', () => {
    expect(page).toContain("useState<'light' | 'dark'>('light')");
    expect(page).toContain('bugreceipt-prototype-theme');
    expect(pageStyles).toContain(".clean-site[data-theme='dark']");
    expect(pageStyles).toContain('@media (max-width: 900px)');
    expect(pageStyles).toContain('@media (max-width: 620px)');
  });

  it('loads the BugReceipt favicon and SupportKori widget from the root document', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');

    expect(source).toContain('/brand/bugreceipt-mark.svg');
    expect(source).toContain('/brand/bugreceipt-32.png');
    expect(source).toContain('/brand/bugreceipt-180.png');
    expect(source).toContain('https://www.supportkori.com/widget.js');
    expect(source).toContain('data-id="montasim"');
    expect(source).toContain('data-message="Support"');
  });

  it('publishes crawler-visible social preview metadata', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');

    expect(source).toContain("const siteUrl = 'https://bugreceipt.netlify.app'");
    expect(source).toContain("property: 'og:image'");
    expect(source).toContain("name: 'twitter:card', content: 'summary_large_image'");
    expect(source).toContain("rel: 'canonical'");
  });

  it('provides themed 404 and 500 recovery pages', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');

    expect(source).toContain('notFoundComponent: NotFound');
    expect(source).toContain('errorComponent: ServerError');

    const notFoundMarkup = renderToStaticMarkup(<NotFound />);
    const serverErrorMarkup = renderToStaticMarkup(
      <ServerError error={new Error('test failure')} reset={() => undefined} />,
    );

    expect(notFoundMarkup).toContain('This page left no trace.');
    expect(serverErrorMarkup).toContain('The page hit an unexpected failure.');
  });
});
