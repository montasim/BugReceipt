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
    expect(source).toContain('BugReceipt-v0.1.5-chrome-unpacked.zip');
    expect(source).toContain('manifest.json');
    expect(source).toContain('/brand/bugreceipt-extension-tour.gif');
    expect(source).toContain('/brand/bugreceipt-extension-tour-poster.jpg');
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain("'IntersectionObserver' in window");
    expect(source).toContain('Extension workflow · Live preview');
    expect(source).toContain('Turn broken into');
    expect(source).toContain('Evidence trace');
    expect(source).toContain('Local until you choose to');
  });

  it('keeps the landing-page design contract in the rendered response', () => {
    const source = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');

    expect(source).toContain('Failure Trace Timeline');
    expect(source).toContain('seed a8f5b8a7');
    expect(source).toContain('unreviewed and undocumented is unfinished');
    expect(source).toContain('html.replace(/<body([^>]*)>/');
  });

  it('labels the sample trace and keeps extension preview controls truthful', () => {
    const source = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

    expect(source).toContain('Illustrative example · sample checkout failure');
    expect(source).toContain('extension-start-control');
    expect(source).toContain('distributed through GitHub as an unpacked Chrome');
    expect(source).not.toContain('verified unpacked Chrome');
    expect(styles).toContain('--color-muted-text: #536873');
    expect(styles).toContain('--color-trace-text: #0b6f7a');
    expect(styles).toContain('--color-signal-text: #c33b24');
  });

  it('uses the documented responsive typography scale through Tailwind utilities', () => {
    const source = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

    expect(source).toContain('text-[clamp(3rem,4.8vw,3.75rem)]');
    expect(source).toContain('text-[clamp(2.125rem,3.2vw,2.5rem)]');
    expect(source).toContain('max-[620px]:text-base');
    expect(source).toContain('text-[0.6875rem]');
    expect(styles).not.toContain(':root');
  });

  it('uses normalized responsive Tailwind spacing without oversized mobile sections', () => {
    const source = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');

    expect(source).toContain('py-[clamp(6rem,9vw,8rem)]');
    expect(source).toContain('py-[clamp(5rem,7vw,6rem)]');
    expect(source).toContain('max-[620px]:py-16');
    expect(source).not.toContain('py-[125px]');
    expect(source).not.toContain('min-h-[400px]');
  });

  it('keeps the hero, timeline, and evidence trace visually separated', () => {
    const source = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');

    expect(source).toContain('pt-12');
    expect(source).toContain('scroll-mt-[76px] pt-2');
    expect(source).toContain('after:h-18');
    expect(source).toContain('py-8 pt-10');
    expect(source).toContain('absolute top-3 right-0');
    expect(source).toContain('max-[900px]:pt-14');
  });

  it('centers desktop progress nodes on the horizontal rail', () => {
    const source = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');

    expect(source).toContain('absolute top-[45.5px] left-1/2');
    expect(source).toContain(
      'max-[900px]:static max-[900px]:translate-x-0 max-[900px]:row-span-2 max-[900px]:m-0',
    );
  });

  it('loads the BugReceipt favicon and SupportKori widget from the root document', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

    expect(source).toContain('/brand/bugreceipt-mark.svg');
    expect(source).toContain('/brand/bugreceipt-32.png');
    expect(source).toContain('/brand/bugreceipt-180.png');
    expect(source).toContain('https://www.supportkori.com/widget.js');
    expect(source).toContain('data-id="montasim"');
    expect(source).toContain('data-message="Support"');
    expect(source).toContain('data-color="#ff5c3a"');
    expect(source).toContain('data-position="right"');
    expect(source).toContain('[&_.sk-widget-btn]:bg-signal');
    expect(source).toContain('[&_.sk-widget-btn]:text-white');
    expect(source).toContain('[&_.sk-widget-btn_svg]:text-white');
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

    expect(source).toContain('notFoundComponent: NotFound');
    expect(source).toContain('errorComponent: ServerError');
    expect(source).toContain('code="404"');
    expect(source).toContain('code="500"');
    expect(source).toContain('Try again');
    expect(source).toContain('Nothing uploaded');
    expect(source).toContain('shadow-[0_22px_48px_rgb(16_35_50_/_0.14)]');

    const notFoundMarkup = renderToStaticMarkup(<NotFound />);
    const serverErrorMarkup = renderToStaticMarkup(
      <ServerError error={new Error('test failure')} reset={() => undefined} />,
    );

    expect(notFoundMarkup).toContain('This page left no trace.');
    expect(notFoundMarkup).toContain('Status / 404');
    expect(serverErrorMarkup).toContain('The page hit an unexpected failure.');
    expect(serverErrorMarkup).toContain('Status / 500');
  });

  it('uses Tailwind CSS and shadcn-style components without handwritten selector CSS', () => {
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
    const button = readFileSync(
      new URL('../src/components/ui/button.tsx', import.meta.url),
      'utf8',
    );
    const config = readFileSync(new URL('../components.json', import.meta.url), 'utf8');

    expect(styles).toContain("@import 'tailwindcss'");
    expect(styles).toContain('@theme');
    expect(styles).not.toContain(':root');
    expect(styles).not.toMatch(/\.(site-header|trace-events|error-page|button)\s*\{/);
    expect(button).toContain("from 'class-variance-authority'");
    expect(button).toContain('data-slot="button"');
    expect(button).toContain('buttonVariants');
    expect(config).toContain('"style": "new-york"');
  });
});
