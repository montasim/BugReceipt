import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NotFound, ServerError } from '../src/routes/__root';

describe('extension landing page', () => {
  it('offers the packaged extension and explains how to install it', () => {
    const source = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');

    expect(source).toContain(
      "const releaseUrl = 'https://github.com/montasim/BugReceipt/releases/latest'",
    );
    expect(source).toContain('href={releaseUrl}');
    expect(source).toContain('Download BugReceipt');
    expect(source).toContain('Load unpacked');
    expect(source).toContain('What does BugReceipt capture?');
    expect(source).toContain('BugReceipt-v0.1.3-chrome-unpacked.zip');
    expect(source).toContain('manifest.json');
    expect(source).toContain('/brand/bugreceipt-review-latest.jpg');
    expect(source).toContain('Current review workspace · Latest');
  });

  it('loads the BugReceipt favicon and SupportKori widget from the root document', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

    expect(source).toContain('/brand/bugreceipt-mark.svg');
    expect(source).toContain('/brand/bugreceipt-32.png');
    expect(source).toContain('/brand/bugreceipt-180.png');
    expect(source).toContain('https://www.supportkori.com/widget.js');
    expect(source).toContain('data-id="montasim"');
    expect(source).toContain('data-message="Support montasim"');
    expect(source).toContain('data-color="#FFDD00"');
    expect(source).toContain('data-position="right"');
    expect(styles).not.toContain('.sk-widget-btn');
  });

  it('publishes crawler-visible social preview metadata', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');

    expect(source).toContain("const siteUrl = 'https://bugreceipt.netlify.app'");
    expect(source).toContain("property: 'og:image'");
    expect(source).toContain("content: '1200'");
    expect(source).toContain("content: '630'");
    expect(source).toContain("name: 'twitter:card', content: 'summary_large_image'");
    expect(source).toContain("rel: 'canonical'");
  });

  it('provides themed 404 and 500 recovery pages', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

    expect(source).toContain('notFoundComponent: NotFound');
    expect(source).toContain('errorComponent: ServerError');
    expect(source).toContain('code="404"');
    expect(source).toContain('code="500"');
    expect(source).toContain('Try again');
    expect(source).toContain('Nothing uploaded');
    expect(styles).toContain('.error-page');
    expect(styles).toContain('.error-receipt');

    const notFoundMarkup = renderToStaticMarkup(<NotFound />);
    const serverErrorMarkup = renderToStaticMarkup(
      <ServerError error={new Error('test failure')} reset={() => undefined} />,
    );

    expect(notFoundMarkup).toContain('This page left no trace.');
    expect(notFoundMarkup).toContain('Status / 404');
    expect(serverErrorMarkup).toContain('The page hit an unexpected failure.');
    expect(serverErrorMarkup).toContain('Status / 500');
  });
});
