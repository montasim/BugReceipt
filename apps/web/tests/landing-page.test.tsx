// @vitest-environment node
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LandingPage, storeUrl, themeScript, videoId } from '../src/landing/landing-page';
import { NotFound, ServerError } from '../src/routes/__root';

describe('extension landing page', () => {
  const route = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/landing/landing-page.tsx', import.meta.url), 'utf8');
  const markup = renderToStaticMarkup(<LandingPage />);

  it('serves the new landing page at the root route', () => {
    expect(route).toContain("createFileRoute('/')");
    expect(route).toContain('LandingPage');
    expect(route).toContain('landing/landing.css');
  });

  it('sends every install button to the Chrome Web Store listing', () => {
    expect(storeUrl).toBe(
      'https://chromewebstore.google.com/detail/bugreceipt/dcjbnkadoenmkcimidcbhhckdpaondae',
    );
    expect(markup.split(`href="${storeUrl}"`).length - 1).toBeGreaterThanOrEqual(4);
    expect(markup).toContain('Add to Chrome');
  });

  it('features the latest launch video, loading YouTube only on click', () => {
    expect(videoId).toBe('QkJJBP71Ze0');
    expect(markup).toContain('id="demo"');
    expect(markup).toContain('/video/launch-poster.jpg');
    expect(markup).toContain(`https://youtu.be/${videoId}`);
    expect(markup).not.toContain('<iframe');
    expect(page).toContain('youtube-nocookie.com/embed/${videoId}');
    expect(page).not.toContain('BVdi7FF21Sg');
  });

  it('covers the problem, four features, privacy, the real receipt and an FAQ', () => {
    for (const id of ['features', 'privacy', 'faq']) expect(markup).toContain(`id="${id}"`);
    expect(markup.match(/class="lp-feature[" ]/g)).toHaveLength(4);
    expect(markup).toContain('Without BugReceipt');
    expect(markup).toContain('[REDACTED]');
    expect(markup).toContain('aria-label="Example exported report"');
    expect(markup.match(/<details>/g)).toHaveLength(5);
    expect(markup).toContain('Filtering cannot recognize every secret');
    expect(markup).toContain('does not open or submit an issue');
  });

  it('offers a light and dark theme toggle and scrolls only below the header', () => {
    expect(markup).toContain('aria-label="Switch between light and dark theme"');
    expect(markup).toMatch(/<\/header><div class="lp-scroll">/);
    expect(themeScript).toContain('localStorage');
    expect(themeScript).toContain('prefers-color-scheme: light');
    expect(route).toContain('themeScript');
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
    expect(source).not.toContain("rel: 'canonical'");
    expect(route).toContain("rel: 'canonical'");
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
