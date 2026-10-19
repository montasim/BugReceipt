// @vitest-environment node
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NotFound, ServerError } from '../src/routes/__root';

describe('extension landing page', () => {
  const route = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');
  const page = readFileSync(
    new URL('../src/prototypes/landing/landing-page.tsx', import.meta.url),
    'utf8',
  );

  it('serves the product-first landing page at the root route', () => {
    expect(route).toContain("createFileRoute('/')");
    expect(route).toContain('LandingPage');
    expect(route).toContain('site.css');
    expect(route).toContain('landing.css');
  });

  it('opens with a real receipt instead of marketing composites', () => {
    const receipt = readFileSync(
      new URL('../src/prototypes/landing/receipt.tsx', import.meta.url),
      'utf8',
    );
    const content = readFileSync(
      new URL('../src/prototypes/landing/landing-content.ts', import.meta.url),
      'utf8',
    );
    expect(content).toContain('Bug reports developers can reproduce.');
    expect(page).toContain('{hero.title}');
    expect(page).toContain('<Receipt />');
    expect(receipt).toContain('receipt.generated.json');
    expect(page).not.toContain('bugreceipt-slide-');
    expect(page).not.toContain('carousel');
    const shell = readFileSync(
      new URL('../src/prototypes/landing/site-shell.tsx', import.meta.url),
      'utf8',
    );
    expect(shell).toContain('chromewebstore.google.com/detail/bugreceipt');
    expect(page).toContain('href={storeUrl}');
  });

  it('publishes the user guide as its own route with a screenshot for every step', () => {
    const guideRoute = readFileSync(new URL('../src/routes/guide.tsx', import.meta.url), 'utf8');
    const guidePage = readFileSync(
      new URL('../src/prototypes/landing/guide-page.tsx', import.meta.url),
      'utf8',
    );
    const shell = readFileSync(
      new URL('../src/prototypes/landing/site-shell.tsx', import.meta.url),
      'utf8',
    );

    expect(guideRoute).toContain("createFileRoute('/guide')");
    expect(guideRoute).toContain('GuidePage');
    expect(guideRoute).toContain('site.css');
    expect(shell).toContain('<a href="/guide">Guide</a>');
    expect(guidePage.match(/src: '\/guide\//g)).toHaveLength(14);
    expect(guidePage).toContain('loading="lazy"');
    for (const title of [
      'Install and open the side panel',
      'Start a capture',
      'Reproduce the problem and add steps',
      'Stop and open the review workbench',
      'Write the report details',
      'Curate visual evidence',
      'Inspect console evidence',
      'Inspect network evidence',
      'Choose files and export',
      'Select the wording on the page',
      'Right-click and choose Suggest a correction',
      'Enter the suggested wording',
      'Collect more corrections from the same page',
      'Check the screenshot and export',
    ]) {
      expect(guidePage).toContain(title);
    }
  });

  it('uses Geist and a single light theme across the site shell', () => {
    const siteStyles = readFileSync(
      new URL('../src/prototypes/landing/site.css', import.meta.url),
      'utf8',
    );
    const rootStyles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
    const shell = readFileSync(
      new URL('../src/prototypes/landing/site-shell.tsx', import.meta.url),
      'utf8',
    );

    expect(rootStyles).toContain("@import '@fontsource-variable/geist'");
    expect(rootStyles).not.toContain('bricolage');
    expect(siteStyles).toContain("font-family: 'Geist Variable'");
    expect(siteStyles).toContain('--amber: #e8a13f');
    expect(siteStyles).not.toContain("data-theme='dark'");
    expect(shell).not.toContain('theme');
    expect(shell).toContain('<a href="/guide">Guide</a>');
    expect(shell).toContain('https://www.supportkori.com/montasim');
    expect(siteStyles).toContain('@media (max-width: 900px)');
    expect(siteStyles).toContain('@media (max-width: 560px)');
  });

  it('loads the BugReceipt favicon without a floating support widget', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');

    expect(source).toContain('/brand/bugreceipt-mark.svg');
    expect(source).toContain('/brand/bugreceipt-32.png');
    expect(source).toContain('/brand/bugreceipt-180.png');
    expect(source).not.toContain('supportkori.com/widget.js');
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

  it('walks through capture in three steps and reuses the demo video', () => {
    expect(page).toContain('id="how-it-works"');
    const content = readFileSync(
      new URL('../src/prototypes/landing/landing-content.ts', import.meta.url),
      'utf8',
    );
    expect(content).toContain('youtube-nocookie.com/embed/BVdi7FF21Sg');
    expect(content).toContain('/guide/01-side-panel.png');
    expect(content).toContain('/guide/03-recording.png');
    expect(content).toContain('/guide/05-report-details.png');
  });

  it('states the deliverable and the privacy boundaries as a table, not icon cards', () => {
    expect(page).toContain('id="deliverable"');
    expect(page).toContain('id="privacy"');
    const content = readFileSync(
      new URL('../src/prototypes/landing/landing-content.ts', import.meta.url),
      'utf8',
    );
    expect(content).toContain('Never read');
    expect(content).toContain('does not open or submit a GitHub issue');
    expect(content).toContain('does not recognize every secret');
  });
});
