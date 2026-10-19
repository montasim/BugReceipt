# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the BugReceipt landing page with the product-first design from `docs/superpowers/specs/2026-10-19-landing-redesign-design.md`, keeping `/guide` as it is.

**Architecture:** The web app (`apps/web`, TanStack Start + Vite) gets one shared stylesheet (`site.css`: tokens, fonts, header, footer, guide rules) and one landing stylesheet (`landing.css`). The landing page is a static React page built from a content module and three components: a `Receipt` that renders real `issue.md` output generated at build time from the same synthetic capture that produced the guide screenshots, an `EvidenceTabs` component that swaps real captures, and plain sections. No new runtime dependencies.

**Tech Stack:** React 19, TanStack Start, Vite, plain CSS with custom properties, `@fontsource-variable/geist`, `@fontsource-variable/jetbrains-mono`, Vitest, Node 24 (runs the TypeScript renderer directly).

## Global Constraints

- Sans: `Geist Variable`; mono: `JetBrains Mono Variable`. No other families.
- Palette tokens exactly: bg `#f6f8f9`, surface `#ffffff`, ink `#13242f`, muted `#5d6d76`, line `#dde4e7`, amber `#e8a13f`, mint `#168f80`, danger `#b83c24`. One dark surface on the page: the console excerpt inside the receipt (`#13242f`).
- Radii: 12px containers, 8px controls, 999px only for status chips.
- One shadow: `0 20px 50px rgb(19 36 47 / 0.08)`, hero receipt and browser frames only.
- Motion: hero receipt entrance (fade + 12px rise, 500ms, once); evidence tab cross-fade 150ms; all removed under `prefers-reduced-motion`.
- Light only. No theme toggle, no dark marketing composites (`/brand/bugreceipt-slide-*.png` unused on the site).
- Layout: 1200px container, 24px gutters (16px below 560px), sections 112px desktop / 72px mobile, two-column sections collapse at 900px.
- Body copy never below 15px. Max measure 64ch.
- Copy: sentence case, plain verbs, no "powerful / seamless / effortless". Never imply guaranteed redaction or automatic issue creation.
- `/guide` content and `guide-page.tsx` are not edited. Its CSS class names (`.clean-site`, `.clean-shell`, `.content-section`, `.section-heading`, `.guide-*`) keep working.
- All checks: `pnpm --filter @bugreceipt/web check` must pass at the end of every task.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## File map

| Path                                                     | Responsibility                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `apps/web/src/styles.css`                                | Tailwind theme for the 404/500 pages; font imports (modify)                                               |
| `apps/web/src/prototypes/landing/site.css`               | Tokens, base, header, footer, section heading, guide rules (create; rules moved from `clean-landing.css`) |
| `apps/web/src/prototypes/landing/landing.css`            | Landing-only section styles (create)                                                                      |
| `apps/web/src/prototypes/landing/site-shell.tsx`         | Header + footer (rewrite)                                                                                 |
| `apps/web/src/prototypes/landing/landing-content.ts`     | All landing copy and data (create)                                                                        |
| `apps/web/src/prototypes/landing/receipt.tsx`            | Renders generated `issue.md` as HTML (create)                                                             |
| `apps/web/src/prototypes/landing/evidence-tabs.tsx`      | Visual / Console / Network tab switcher (create)                                                          |
| `apps/web/src/prototypes/landing/landing-page.tsx`       | Page composition and sections (create)                                                                    |
| `apps/web/src/prototypes/landing/receipt-session.json`   | Synthetic capture session dumped by the screenshot script (generated, committed)                          |
| `apps/web/src/prototypes/landing/receipt.generated.json` | `{ markdown, files }` rendered from the session (generated, committed)                                    |
| `apps/web/scripts/render-receipt.mjs`                    | Renders the session to the JSON above (create)                                                            |
| `apps/web/scripts/capture-guide-screenshots.mjs`         | Add a session dump at the end (modify)                                                                    |
| `apps/web/src/routes/index.tsx`                          | Point `/` at `LandingPage` (modify)                                                                       |
| `apps/web/src/routes/guide.tsx`                          | Import `site.css` instead of `clean-landing.css` (modify)                                                 |
| `apps/web/src/routes/__root.tsx`                         | Meta, remove support widget script (modify)                                                               |
| `apps/web/tests/landing-page.test.tsx`                   | Rewrite assertions per task (modify)                                                                      |
| `apps/web/tests/receipt.test.ts`                         | Receipt determinism and renderer tests (create)                                                           |
| `apps/web/package.json`                                  | Font deps, `receipt` script (modify)                                                                      |
| `DESIGN.md`                                              | Describe the product-matched system (modify, last task)                                                   |
| Deleted at Task 3                                        | `clean-landing.tsx`, `clean-landing.css`                                                                  |

---

### Task 1: Fonts, tokens, and shared shell

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/web/src/styles.css`
- Create: `apps/web/src/prototypes/landing/site.css`
- Modify: `apps/web/src/prototypes/landing/clean-landing.css` (remove rules that move to `site.css`)
- Rewrite: `apps/web/src/prototypes/landing/site-shell.tsx`
- Modify: `apps/web/src/routes/guide.tsx`, `apps/web/src/routes/index.tsx`, `apps/web/src/routes/__root.tsx`
- Test: `apps/web/tests/landing-page.test.tsx`

**Interfaces:**

- Produces: `SiteShell({ children })` default export-less named component, light only. CSS classes `.clean-site`, `.clean-shell`, `.site-header`, `.site-footer`, `.content-section`, `.section-heading`, `.eyebrow`, `.btn-primary`, `.btn-link`. Tokens on `.clean-site`: `--bg --surface --ink --muted --line --amber --amber-hover --mint --danger --shadow --radius --radius-control`.

- [ ] **Step 1: Write the failing tests**

Replace the `supports light and dark themes` test and the `loads the BugReceipt favicon and SupportKori widget` test in `apps/web/tests/landing-page.test.tsx` with:

```tsx
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
```

Also change the guide-route test line `expect(route).toContain('clean-landing.css');` to `expect(route).toContain('site.css');` and, in the guide test, `expect(shell).toContain('<a href="/guide">Guide</a>');` stays.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm exec vitest run`
Expected: FAIL, `site.css` does not exist, `styles.css` still imports bricolage.

- [ ] **Step 3: Swap the font packages**

In `apps/web/package.json` replace `"@fontsource-variable/bricolage-grotesque": "^5.2.8",` with `"@fontsource-variable/geist": "^5.3.0",`. Then run `pnpm install` from the repository root.

- [ ] **Step 4: Update the root stylesheet**

Replace the two font imports and `--font-sans` in `apps/web/src/styles.css`:

```css
@import '@fontsource-variable/geist';
@import '@fontsource-variable/jetbrains-mono';
@import 'tailwindcss';

@theme {
  --font-sans: 'Geist Variable', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', monospace;
```

Leave the rest of the file as is (the error pages keep their Tailwind tokens).

- [ ] **Step 5: Create `site.css`**

Create `apps/web/src/prototypes/landing/site.css`:

```css
/* Shared site system: tokens, base, header, footer, section scaffolding, guide page. */
.clean-site {
  --bg: #f6f8f9;
  --surface: #ffffff;
  --ink: #13242f;
  --muted: #5d6d76;
  --line: #dde4e7;
  --amber: #e8a13f;
  --amber-hover: #d88c29;
  --mint: #168f80;
  --danger: #b83c24;
  --shadow: 0 20px 50px rgb(19 36 47 / 0.08);
  --radius: 12px;
  --radius-control: 8px;
  --section: 112px;
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Geist Variable', system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.clean-site * {
  box-sizing: border-box;
}
.clean-site ::selection {
  background: var(--amber);
  color: var(--ink);
}
.clean-site a {
  color: inherit;
}
.clean-site button,
.clean-site a {
  -webkit-tap-highlight-color: transparent;
}
.clean-site button:focus-visible,
.clean-site a:focus-visible,
.clean-site summary:focus-visible,
.clean-site [role='tab']:focus-visible {
  outline: 3px solid var(--mint);
  outline-offset: 3px;
}
.clean-site h1,
.clean-site h2,
.clean-site h3 {
  margin: 0;
  font-weight: 600;
  text-wrap: balance;
}
.clean-site h1 {
  font-size: clamp(40px, 4.4vw, 56px);
  line-height: 1.05;
  letter-spacing: -0.02em;
}
.clean-site h2 {
  font-size: clamp(28px, 3vw, 36px);
  line-height: 1.15;
  letter-spacing: -0.015em;
}
.clean-site h3 {
  font-size: 20px;
  line-height: 1.3;
}
.clean-site p {
  margin: 0;
}
.clean-site code,
.clean-site .mono {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.6;
}
.clean-shell {
  width: min(1200px, calc(100% - 48px));
  margin-inline: auto;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 22px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--amber);
  color: var(--ink);
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms ease-out;
}
.btn-primary:hover {
  background: var(--amber-hover);
}
.btn-primary svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.btn-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
  text-underline-offset: 4px;
}
.btn-link:hover {
  text-decoration: underline;
}
.btn-link svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Header */
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.site-header .clean-shell {
  display: flex;
  align-items: center;
  gap: 32px;
  min-height: 64px;
}
.clean-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;
  text-decoration: none;
}
.clean-brand img {
  width: 26px;
  height: 26px;
}
.site-header nav {
  margin-left: auto;
  display: flex;
  gap: 28px;
}
.site-header nav a {
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}
.site-header nav a:hover {
  color: var(--ink);
}
.site-header .btn-primary {
  min-height: 40px;
  padding-inline: 16px;
  font-size: 14px;
}

/* Sections */
.content-section {
  padding-block: var(--section);
}
.section-heading {
  max-width: 640px;
}
.section-heading h2 + p,
.section-heading h3 + p {
  margin-top: 16px;
  color: var(--muted);
  font-size: 18px;
}
.eyebrow {
  margin: 0 0 14px;
  color: var(--mint);
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Footer */
.site-footer {
  border-top: 1px solid var(--line);
  background: var(--surface);
}
.site-footer .clean-shell {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 40px;
  padding-block: 56px;
}
.site-footer p {
  margin-top: 12px;
  max-width: 36ch;
  color: var(--muted);
  font-size: 15px;
}
.site-footer h3 {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink);
}
.site-footer ul {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}
.site-footer a {
  color: var(--muted);
  font-size: 15px;
  text-decoration: none;
}
.site-footer a:hover {
  color: var(--ink);
}
.site-footer .version {
  margin-top: 18px;
  color: var(--muted);
}

/* Guide page (moved verbatim from clean-landing.css; class names unchanged) */
.guide-section + .guide-section {
  padding-top: 0;
}
.guide-section .section-heading a {
  color: var(--mint);
}
.guide-section .section-heading .eyebrow {
  margin: 0 0 14px;
}
.guide-list {
  margin: 50px 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}
.guide-list > li {
  padding-block: 44px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 40px;
  align-items: center;
  border-bottom: 1px solid var(--line);
  scroll-margin-top: 90px;
}
.guide-copy > span {
  display: block;
  margin-bottom: 10px;
  color: var(--mint);
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.5;
}
.guide-copy h3 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-weight: 700;
}
.guide-copy p {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}
.guide-copy ul {
  margin: 14px 0 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.55;
}
.guide-copy ul li {
  margin-top: 7px;
}
.guide-copy ul li::marker {
  color: var(--mint);
}
.guide-figure {
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  overflow: hidden;
}
.guide-figure img {
  display: block;
  width: 100%;
  max-height: 520px;
  object-fit: contain;
  object-position: top;
}

@media (max-width: 900px) {
  .site-header nav {
    display: none;
  }
  .site-footer .clean-shell {
    grid-template-columns: 1fr 1fr;
  }
  .guide-list > li {
    grid-template-columns: 1fr;
    gap: 24px;
    padding-block: 36px;
  }
}
@media (max-width: 560px) {
  .clean-site {
    --section: 72px;
  }
  .clean-shell {
    width: calc(100% - 32px);
  }
  .site-header .btn-primary span {
    display: none;
  }
  .site-footer .clean-shell {
    grid-template-columns: 1fr;
    gap: 28px;
    padding-block: 40px;
  }
  .guide-figure {
    border-radius: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .clean-site,
  .clean-site * {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Trim `clean-landing.css`**

Delete these blocks from `apps/web/src/prototypes/landing/clean-landing.css` (they now live in `site.css`): the `.clean-site { ... }` token block and the `.clean-site[data-theme='dark']` block, `.clean-site *`, `::selection`, `a`, focus rules, `.clean-shell`, everything from `.clean-header` through `.header-actions` and `.theme-toggle`, `.content-section`, `.section-heading` rules, the `.guide-*` rules, the whole `footer` block, and the `@media (prefers-reduced-motion)` block. Keep every landing-only rule (hero, carousel, trust row, features, demo, privacy, changelog, FAQ, final section) and the two width media queries for them. The old page is deleted in Task 3, so this only has to keep it rendering.

- [ ] **Step 7: Rewrite `SiteShell`**

Replace `apps/web/src/prototypes/landing/site-shell.tsx` with:

```tsx
import type { ReactNode } from 'react';

export const storeUrl =
  'https://chromewebstore.google.com/detail/bugreceipt/dcjbnkadoenmkcimidcbhhckdpaondae';
export const siteVersion = '0.3.0';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="clean-site">
      <header className="site-header">
        <div className="clean-shell">
          <a className="clean-brand" href="/" aria-label="BugReceipt home">
            <img src="/brand/bugreceipt-mark.svg" alt="" />
            <span>BugReceipt</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="/guide">Guide</a>
            <a href="/#privacy">Privacy</a>
            <a href="/#faq">FAQ</a>
            <a href="https://github.com/montasim/BugReceipt" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
          <a className="btn-primary" href={storeUrl} target="_blank" rel="noreferrer">
            <ChromeIcon />
            <span>Add to Chrome</span>
          </a>
        </div>
      </header>

      {children}

      <footer className="site-footer">
        <div className="clean-shell">
          <div>
            <a className="clean-brand" href="/">
              <img src="/brand/bugreceipt-mark.svg" alt="" />
              <span>BugReceipt</span>
            </a>
            <p>
              Local-first bug reports for Chrome. No account, no automatic uploads, review before
              you share.
            </p>
            <p className="version mono">Version {siteVersion}</p>
          </div>
          <div>
            <h3>Product</h3>
            <ul>
              <li>
                <a href={storeUrl} target="_blank" rel="noreferrer">
                  Add to Chrome
                </a>
              </li>
              <li>
                <a href="/guide">User guide</a>
              </li>
              <li>
                <a
                  href="https://github.com/montasim/BugReceipt/releases"
                  target="_blank"
                  rel="noreferrer"
                >
                  Releases
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Project</h3>
            <ul>
              <li>
                <a href="https://github.com/montasim/BugReceipt" target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/montasim/BugReceipt/blob/main/SECURITY.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Security policy
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/montasim/BugReceipt/blob/main/SUPPORT.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Help the project</h3>
            <ul>
              <li>
                <a href="https://www.supportkori.com/montasim" target="_blank" rel="noreferrer">
                  Support BugReceipt on SupportKori
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/montasim/BugReceipt/issues/new/choose"
                  target="_blank"
                  rel="noreferrer"
                >
                  Report a bug or request a feature
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function ChromeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <path d="M8.53 14 4.03 6M11.5 21.5l4-7.5M12 8h9" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}
```

- [ ] **Step 8: Update the routes and root document**

`apps/web/src/routes/guide.tsx`: change `import '../prototypes/landing/clean-landing.css';` to `import '../prototypes/landing/site.css';`.

`apps/web/src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { CleanLanding } from '../prototypes/landing/clean-landing';
import '../prototypes/landing/site.css';
import '../prototypes/landing/clean-landing.css';

export const Route = createFileRoute('/')({ component: CleanLanding });
```

`apps/web/src/routes/__root.tsx`: delete the `<script src="https://www.supportkori.com/widget.js" ... />` element and every `[&_.sk-widget-...]` class string from the `<body>` className (keep `'m-0 min-w-80 bg-fog font-sans text-base leading-[1.6] [font-synthesis:none]'` and the selection classes). Change `theme-color` to `#f6f8f9`. Change `title` to `'BugReceipt · Bug reports developers can reproduce'` and `description` to `'BugReceipt records the Chrome tab you are testing, keeps console and network evidence with your steps, and exports a report you review before sharing. Nothing leaves your machine until you share it.'`.

In `clean-landing.tsx`, remove the `<ChromeIcon />`, `MoonIcon`, and `SunIcon` references only if they now fail lint; the file is deleted in Task 3 so do the minimum that keeps `pnpm check` green.

- [ ] **Step 9: Run the full check**

Run: `pnpm --filter @bugreceipt/web check`
Expected: PASS. Then run `pnpm dev:web`-equivalent preview (`.claude/launch.json` entry `web`, port 3100) and confirm `/guide` renders in Geist with the new header and four-column footer, and that `/` still renders the old page without errors.

- [ ] **Step 10: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): adopt Geist and the shared light site shell

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Receipt data pipeline

**Files:**

- Modify: `apps/web/scripts/capture-guide-screenshots.mjs` (dump the session after the review captures)
- Create: `apps/web/scripts/render-receipt.mjs`
- Create: `apps/web/src/prototypes/landing/receipt-session.json` (generated)
- Create: `apps/web/src/prototypes/landing/receipt.generated.json` (generated)
- Modify: `apps/web/package.json` (scripts, workspace deps)
- Test: `apps/web/tests/receipt.test.ts`

**Interfaces:**

- Produces: `receipt.generated.json` with shape `{ "markdown": string, "files": Array<{ "name": string, "label": string, "included": boolean }> }`. `markdown` is the exact output of `renderGitHubIssue(session)` from `@bugreceipt/issue-export`.

- [ ] **Step 1: Add workspace dependencies**

In `apps/web/package.json` `dependencies`, add:

```json
    "@bugreceipt/capture-model": "workspace:*",
    "@bugreceipt/issue-export": "workspace:*",
```

Add scripts:

```json
    "receipt": "node scripts/render-receipt.mjs",
```

and change `"build"` to `"pnpm receipt && tsr generate && vite build"` and `"check"` to start with `tsr generate && pnpm receipt && ` in place of `tsr generate && `. Run `pnpm install` from the root.

- [ ] **Step 2: Write the failing test**

Create `apps/web/tests/receipt.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { captureSessionSchema } from '@bugreceipt/capture-model';
import { renderGitHubIssue } from '@bugreceipt/issue-export';

const read = (file: string) =>
  JSON.parse(readFileSync(new URL(`../src/prototypes/landing/${file}`, import.meta.url), 'utf8'));

describe('landing receipt', () => {
  it('is the real issue.md rendered from the committed capture session', () => {
    const session = captureSessionSchema.parse(read('receipt-session.json'));
    const receipt = read('receipt.generated.json');

    expect(receipt.markdown).toBe(renderGitHubIssue(session));
    expect(receipt.markdown).toContain('# Checkout fails after applying a discount');
    expect(receipt.markdown).toContain('## Steps to reproduce');
    expect(receipt.markdown).toContain('[REDACTED]');
  });

  it('lists the export manifest in the same order as the review page', () => {
    const receipt = read('receipt.generated.json');
    expect(receipt.files.map((file: { name: string }) => file.name)).toEqual([
      'issue.md',
      'recording.webm',
      'selected-frame.png',
      'console.json',
      'network.har',
    ]);
    expect(receipt.files.filter((file: { included: boolean }) => file.included)).toHaveLength(4);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/web && pnpm exec vitest run tests/receipt.test.ts`
Expected: FAIL, `receipt-session.json` not found.

- [ ] **Step 4: Dump the session from the screenshot script**

In `apps/web/scripts/capture-guide-screenshots.mjs`, directly after the line `await review.close();` (end of the review captures, before `// Part 2 · text corrections`), add:

```js
// Persist the exact session so the landing receipt renders from the same capture.
await writeFile(
  resolve(import.meta.dirname, '../src/prototypes/landing/receipt-session.json'),
  `${JSON.stringify(await readSession(), null, 2)}\n`,
);
console.log('wrote receipt-session.json');
```

Run `pnpm --filter @bugreceipt/web guide:screenshots` (needs `pnpm build:extension` first and Google Chrome on the machine). Expected: the 14 PNGs are rewritten and `receipt-session.json` exists. Open it and confirm `summary` is `"Checkout fails after applying a discount"` and `network` contains the `/api/orders` entry with `"email": "[REDACTED]"` in its request body.

- [ ] **Step 5: Write the renderer script**

Create `apps/web/scripts/render-receipt.mjs`:

```js
// Renders the landing receipt from the committed capture session using the real exporter.
// Node 24 strips TypeScript types, so the workspace packages load directly from source.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { captureSessionSchema } from '@bugreceipt/capture-model';
import { renderGitHubIssue } from '@bugreceipt/issue-export';

const dir = resolve(import.meta.dirname, '../src/prototypes/landing');
const session = captureSessionSchema.parse(
  JSON.parse(await readFile(resolve(dir, 'receipt-session.json'), 'utf8')),
);
const frames = session.page?.selectedFrames?.length ?? 0;
const receipt = {
  markdown: renderGitHubIssue(session),
  files: [
    { name: 'issue.md', label: 'Issue report', included: true },
    {
      name: 'recording.webm',
      label: 'Screen recording',
      included: Boolean(session.page?.recording),
    },
    { name: 'selected-frame.png', label: 'Selected frames', included: frames > 0 },
    { name: 'console.json', label: 'Console evidence', included: session.diagnostics.length > 0 },
    { name: 'network.har', label: 'Network evidence', included: session.network.length > 0 },
  ],
};
await writeFile(resolve(dir, 'receipt.generated.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log('wrote receipt.generated.json');
```

Run: `cd apps/web && pnpm receipt`
Expected: `wrote receipt.generated.json`. If Node reports it cannot resolve `@bugreceipt/issue-export`, the workspace install from Step 1 did not run; run `pnpm install` at the root and retry.

- [ ] **Step 6: Run the tests**

Run: `cd apps/web && pnpm exec vitest run`
Expected: PASS for both receipt tests and the existing landing tests.

- [ ] **Step 7: Full check and commit**

Run: `pnpm --filter @bugreceipt/web check` — Expected: PASS.

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): render the landing receipt from the real capture session

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Content module, hero with the receipt, new landing route

**Files:**

- Create: `apps/web/src/prototypes/landing/landing-content.ts`
- Create: `apps/web/src/prototypes/landing/receipt.tsx`
- Create: `apps/web/src/prototypes/landing/landing-page.tsx`
- Create: `apps/web/src/prototypes/landing/landing.css`
- Modify: `apps/web/src/routes/index.tsx`
- Delete: `apps/web/src/prototypes/landing/clean-landing.tsx`, `apps/web/src/prototypes/landing/clean-landing.css`
- Test: `apps/web/tests/landing-page.test.tsx`

**Interfaces:**

- Produces: `LandingPage()` component; `Receipt()` component (no props; reads `receipt.generated.json`); `landing-content.ts` exports `hero`, `steps`, `evidenceTabs`, `deliverables`, `privacyColumns`, `corrections`, `audiences`, `faqs` (shapes shown below; later tasks consume them).

- [ ] **Step 1: Write the failing tests**

In `apps/web/tests/landing-page.test.tsx`, change the `page` constant to read `../src/prototypes/landing/landing-page.tsx`, and replace the two tests `promotes the approved landing page at the root route` and `links to the Chrome Web Store and uses the real extension desktop UI` and `explains the product with a demo, privacy details, changelog, and FAQs` with:

```tsx
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
  expect(page).toContain('Bug reports developers can reproduce.');
  expect(page).toContain('<Receipt />');
  expect(receipt).toContain('receipt.generated.json');
  expect(page).not.toContain('bugreceipt-slide-');
  expect(page).not.toContain('carousel');
  expect(page).toContain('chromewebstore.google.com/detail/bugreceipt');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm exec vitest run tests/landing-page.test.tsx`
Expected: FAIL, `landing-page.tsx` not found.

- [ ] **Step 3: Create the content module**

Create `apps/web/src/prototypes/landing/landing-content.ts`:

```ts
export const hero = {
  title: 'Bug reports developers can reproduce.',
  lead: 'BugReceipt records the Chrome tab you are testing, keeps the console and network evidence with your steps, and exports a report you review first. Nothing leaves your machine until you share it.',
  finePrint: 'Chrome desktop 125 and newer · Free · No account',
  receiptCaption: 'Exported from the capture shown in the screens below.',
} as const;

export const steps = [
  {
    title: 'Choose the tab',
    body: 'Open the side panel on the page where the problem happens and select Choose tab to record. Nothing is recorded until you confirm the tab in Chrome’s share dialog.',
    image: { src: '/guide/01-side-panel.png', alt: 'BugReceipt side panel ready to record' },
  },
  {
    title: 'Reproduce and add steps',
    body: 'Use the page normally. The panel counts console messages and requests as they happen; type each action you take so the report carries human steps next to the evidence.',
    image: {
      src: '/guide/03-recording.png',
      alt: 'BugReceipt side panel recording with three recorded steps',
    },
  },
  {
    title: 'Stop and review',
    body: 'Stop & review opens the workbench. Finish the report, remove anything private from the evidence, then download one ZIP.',
    image: {
      src: '/guide/05-report-details.png',
      alt: 'BugReceipt review page with the report details stage',
      frame: true,
    },
  },
] as const;

export const demoVideo = {
  src: 'https://www.youtube-nocookie.com/embed/BVdi7FF21Sg?rel=0',
  title: 'BugReceipt product demo',
  caption: 'The 45-second demo follows one capture from the failing page to the downloaded report.',
} as const;

export const evidenceTabs = [
  {
    id: 'visual',
    label: 'Visual',
    title: 'Play the recording, keep the frames that matter',
    body: 'The WebM recording of the selected tab plays inside the review. Pause on the failure, save up to 20 frames, and annotate them with marker, highlight, border, and notes. Remove the video or any frame before export.',
    image: {
      src: '/guide/06-visual-evidence.png',
      alt: 'Visual evidence tab with the screen recording of the checkout page',
    },
  },
  {
    id: 'console',
    label: 'Console',
    title: 'Every message since recording started',
    body: 'Logs, warnings, errors, uncaught exceptions, and rejected promises, each with a timestamp. Search, filter by type, highlight the exact text the developer should read, and remove entries you do not want to share. The count of sensitive values redacted locally is shown above the list.',
    image: {
      src: '/guide/07-console-evidence.png',
      alt: 'Console evidence tab listing seven captured messages',
    },
  },
  {
    id: 'network',
    label: 'Network',
    title: 'The failing request, with its body',
    body: 'Fetch, XHR, and page resources with method, status, and timing. API calls come first. Open a request to read its headers with credentials redacted and its request and response bodies as formatted JSON or raw text.',
    image: {
      src: '/guide/08-network-evidence.png',
      alt: 'Network evidence tab with a failed POST request expanded to its JSON response',
    },
  },
] as const;

export const deliverables = {
  title: 'What the developer gets',
  lead: 'One ZIP under Chrome Downloads. The report is GitHub-ready Markdown; the evidence files sit beside it.',
  paragraphs: [
    'issue.md carries the title, description, numbered steps, expected and current behavior, the page and browser context, and the console and network excerpts you kept.',
    'console.json and network.har hold the full filtered diagnostics for tools that read them. Console and network evidence can also be downloaded on their own from the review.',
    'recording.webm and selected-frame PNGs carry the visual proof. Annotated frames are rendered into the PNG.',
    'BugReceipt does not open or submit a GitHub issue for you. You attach what you reviewed.',
  ],
  image: {
    src: '/guide/09-choose-files.png',
    alt: 'Choose files stage listing the report files with Included badges',
  },
} as const;

export const privacyColumns = [
  {
    title: 'Captured after you start',
    items: [
      'Video of the selected tab, without audio',
      'Console messages and exceptions',
      'Requests with status, timing, headers, and bodies',
      'Your reproduction steps',
      'Page URL and title, browser, platform',
    ],
  },
  {
    title: 'Filtered before storage',
    items: [
      'URL query strings',
      'Email addresses',
      'Bearer tokens and secret-shaped values',
      'Recognized sensitive request headers',
      'Oversized or binary bodies are bounded or omitted',
    ],
  },
  {
    title: 'Never read',
    items: [
      'Cookies and browser storage',
      'Page HTML or DOM snapshots',
      'Form values and keystrokes',
      'Clipboard contents',
      'Microphone or tab audio',
    ],
  },
] as const;

export const privacyFootnote =
  'Filtering reduces risk; it does not recognize every secret. Recordings and screenshots show whatever was on screen, so review the evidence before you share it.';

export const corrections = {
  title: 'Wrong wording? Send that too.',
  body: 'Select text on any page, right-click, and choose Suggest a correction. The side panel keeps the original text, takes your suggested wording and locale, and collects up to 20 corrections from one site into a local ZIP with a marked screenshot for each.',
  link: { href: '/guide#corrections', label: 'See the correction workflow in the guide' },
  images: [
    {
      src: '/guide/11-select-text.png',
      alt: 'Checkout page with a sentence selected',
      frame: true,
    },
    {
      src: '/guide/14-correction-batch.png',
      alt: 'BugReceipt side panel with two corrections in a batch',
    },
  ],
} as const;

export const audiences = [
  {
    title: 'QA engineers',
    body: 'One capture replaces a screenshot, a DevTools export, and a paragraph of guesses. The steps you type land next to the requests that failed.',
  },
  {
    title: 'Support teams',
    body: 'Ask a customer for one ZIP instead of a screen-share. They review what is in it before sending; you forward it to engineering as is.',
  },
  {
    title: 'Open-source maintainers',
    body: 'Issues arrive with console output, the failing request, and the browser version attached, so the first reply can be a fix instead of a question.',
  },
] as const;

export const faqs = [
  {
    question: 'Which browsers are supported?',
    answer:
      'Chrome desktop 125 and newer. The extension uses Chrome’s side panel and debugger APIs, so Firefox and Safari are not supported.',
  },
  {
    question: 'What happens if the page navigates during a capture?',
    answer:
      'A same-origin reload stays in the session. Leaving the recorded site or closing the tab ends the capture, and the report records why it stopped.',
  },
  {
    question: 'How long is evidence kept?',
    answer:
      'In extension-owned local storage until you delete the capture, start a new one, or download it. Only one capture exists at a time.',
  },
  {
    question: 'Does it work on localhost and staging?',
    answer:
      'Yes. Any regular HTTP or HTTPS page can be captured, including local development servers. Chrome settings pages and other restricted pages cannot.',
  },
  {
    question: 'What is the unpacked ZIP on GitHub Releases?',
    answer:
      'A manual install for people who cannot use the Chrome Web Store. It needs Developer mode and Load unpacked, and it does not update automatically.',
  },
] as const;
```

- [ ] **Step 4: Create the Receipt component**

Create `apps/web/src/prototypes/landing/receipt.tsx`:

````tsx
import receipt from './receipt.generated.json';

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; text: string };

// Minimal reader for the fixed issue.md shape produced by @bugreceipt/issue-export.
export function parseReceipt(markdown: string): { title: string; blocks: Block[] } {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let title = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      title = line.slice(2);
      i += 1;
    } else if (line.startsWith('## ')) {
      blocks.push({ kind: 'heading', text: line.slice(3) });
      i += 1;
    } else if (line.startsWith('```')) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      blocks.push({ kind: 'code', text: code.join('\n') });
      i += 1;
    } else if (/^(\d+\. |- )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(\d+\. |- )/.test(lines[i])) {
        items.push(lines[i].replace(/^(\d+\. |- )/, ''));
        i += 1;
      }
      blocks.push({ kind: 'list', ordered, items });
    } else if (line.trim() === '' || line.startsWith('---') || line.startsWith('>')) {
      i += 1;
    } else {
      blocks.push({ kind: 'paragraph', text: line.replace(/^_|_$/g, '') });
      i += 1;
    }
  }
  return { title, blocks };
}

const shownSections = new Set([
  'Steps to reproduce',
  'Expected behavior',
  'Current behavior',
  'Environment',
  'Console messages',
]);

export function Receipt() {
  const { title, blocks } = parseReceipt(receipt.markdown);
  const visible: Block[] = [];
  let keep = false;
  for (const block of blocks) {
    if (block.kind === 'heading') keep = shownSections.has(block.text);
    if (keep) visible.push(block);
  }
  return (
    <article className="receipt" aria-label="Example exported report">
      <header className="receipt-head">
        <span className="mono">issue.md</span>
        <span className="mono">Local export</span>
      </header>
      <h2 className="receipt-title">{title}</h2>
      {visible.map((block, index) => {
        if (block.kind === 'heading') return <h3 key={index}>{block.text}</h3>;
        if (block.kind === 'code')
          return (
            <pre key={index}>
              <code>{block.text.split('\n').slice(0, 4).join('\n')}</code>
            </pre>
          );
        if (block.kind === 'list')
          return block.ordered ? (
            <ol key={index}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          ) : (
            <ul key={index}>
              {block.items.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        return <p key={index}>{block.text}</p>;
      })}
      <footer className="receipt-files">
        {receipt.files.map((file) => (
          <span key={file.name} className={file.included ? 'is-included' : undefined}>
            <code>{file.name}</code>
            {file.included ? 'Included' : 'Not included'}
          </span>
        ))}
      </footer>
    </article>
  );
}
````

If `tsc` rejects the JSON import, add `"resolveJsonModule": true` to `apps/web/tsconfig.json` `compilerOptions` (TanStack's template usually has it already).

- [ ] **Step 5: Create the landing page with the hero**

Create `apps/web/src/prototypes/landing/landing-page.tsx`:

```tsx
import { ArrowIcon, ChromeIcon, SiteShell, storeUrl } from './site-shell';
import { Receipt } from './receipt';
import { hero } from './landing-content';

export function LandingPage() {
  return (
    <SiteShell>
      <main id="top">
        <section className="clean-shell hero">
          <div className="hero-copy">
            <h1>{hero.title}</h1>
            <p className="hero-lead">{hero.lead}</p>
            <div className="hero-actions">
              <a className="btn-primary" href={storeUrl} target="_blank" rel="noreferrer">
                <ChromeIcon /> Add to Chrome
              </a>
              <a className="btn-link" href="/guide">
                Read the user guide <ArrowIcon />
              </a>
            </div>
            <p className="hero-fine">{hero.finePrint}</p>
          </div>
          <figure className="hero-receipt">
            <Receipt />
            <figcaption>{hero.receiptCaption}</figcaption>
          </figure>
        </section>
      </main>
    </SiteShell>
  );
}
```

- [ ] **Step 6: Create `landing.css` with hero and receipt styles**

Create `apps/web/src/prototypes/landing/landing.css`:

```css
/* Landing-only sections. Shared tokens live in site.css. */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 64px;
  align-items: center;
  padding-block: 96px var(--section);
}
.hero-lead {
  margin-top: 24px;
  max-width: 52ch;
  color: var(--muted);
  font-size: 18px;
}
.hero-actions {
  margin-top: 32px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
}
.hero-fine {
  margin-top: 20px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
}
.hero-receipt {
  margin: 0;
  animation: receipt-enter 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.hero-receipt figcaption {
  margin-top: 14px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
@keyframes receipt-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

/* Receipt */
.receipt {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.receipt-head {
  display: flex;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
}
.receipt-head span:last-child {
  color: var(--mint);
}
.receipt-title {
  padding: 20px 24px 0;
  font-size: 22px;
  letter-spacing: -0.01em;
}
.receipt h3 {
  margin: 20px 24px 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--muted);
}
.receipt p,
.receipt ol,
.receipt ul {
  margin: 8px 24px 0;
  font-size: 15px;
  line-height: 1.55;
}
.receipt ol,
.receipt ul {
  padding-left: 22px;
}
.receipt ol li,
.receipt ul li {
  margin-top: 4px;
}
.receipt ul {
  list-style: none;
  padding-left: 0;
  color: var(--muted);
  font-size: 14px;
}
.receipt pre {
  margin: 10px 24px 0;
  padding: 14px 16px;
  border-radius: var(--radius-control);
  background: var(--ink);
  color: #e6edf0;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 12.5px;
  line-height: 1.55;
  overflow-x: auto;
  white-space: pre;
}
.receipt-files {
  margin-top: 20px;
  padding: 14px 24px;
  border-top: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  font-size: 12px;
  color: var(--muted);
}
.receipt-files span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.receipt-files span.is-included {
  color: var(--mint);
}
.receipt-files code {
  color: var(--ink);
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 48px;
    padding-top: 64px;
  }
}
@media (max-width: 560px) {
  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .hero-actions .btn-primary {
    width: 100%;
  }
  .receipt-title,
  .receipt h3,
  .receipt p,
  .receipt ol,
  .receipt ul,
  .receipt pre {
    margin-inline: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .hero-receipt {
    animation: none;
  }
}
```

- [ ] **Step 7: Switch the route and delete the old page**

`apps/web/src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '../prototypes/landing/landing-page';
import '../prototypes/landing/site.css';
import '../prototypes/landing/landing.css';

export const Route = createFileRoute('/')({ component: LandingPage });
```

Delete `apps/web/src/prototypes/landing/clean-landing.tsx` and `apps/web/src/prototypes/landing/clean-landing.css`.

- [ ] **Step 8: Run tests and the full check**

Run: `cd apps/web && pnpm exec vitest run` — Expected: PASS.
Run: `pnpm --filter @bugreceipt/web check` — Expected: PASS.
Preview `/` at 1280px and 375px: hero copy left, receipt right (stacked on mobile), receipt shows title, steps, environment lines, a four-line dark console excerpt, and the file row with four "Included" chips.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): rebuild the landing hero around the exported receipt

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: How it works and the demo video

**Files:**

- Modify: `apps/web/src/prototypes/landing/landing-page.tsx`
- Modify: `apps/web/src/prototypes/landing/landing.css`
- Test: `apps/web/tests/landing-page.test.tsx`

**Interfaces:**

- Consumes: `steps`, `demoVideo` from `landing-content.ts`.
- Produces: `BrowserFrame({ src, alt })` component exported from `landing-page.tsx`; CSS classes `.browser-frame`, `.steps`, `.step`, `.panel-shot`, `.video-frame`.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/tests/landing-page.test.tsx`:

```tsx
it('walks through capture in three steps and reuses the demo video', () => {
  expect(page).toContain('id="how-it-works"');
  expect(page).toContain('youtube-nocookie.com/embed/BVdi7FF21Sg');
  const content = readFileSync(
    new URL('../src/prototypes/landing/landing-content.ts', import.meta.url),
    'utf8',
  );
  expect(content).toContain('/guide/01-side-panel.png');
  expect(content).toContain('/guide/03-recording.png');
  expect(content).toContain('/guide/05-report-details.png');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && pnpm exec vitest run tests/landing-page.test.tsx`
Expected: FAIL on `id="how-it-works"`.

- [ ] **Step 3: Add the section and the BrowserFrame component**

In `landing-page.tsx`, extend the imports to `import { demoVideo, hero, steps } from './landing-content';` and add after the hero section inside `<main>`:

```tsx
<section className="clean-shell content-section" id="how-it-works">
  <div className="section-heading">
    <p className="eyebrow">How it works</p>
    <h2>Three actions. One report.</h2>
    <p>Capture is intentional: it starts when you choose a tab and ends when you stop it.</p>
  </div>
  <ol className="steps">
    {steps.map((step, index) => (
      <li className="step" key={step.title}>
        <div className="step-copy">
          <span className="mono">0{index + 1}</span>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </div>
        {'frame' in step.image && step.image.frame ? (
          <BrowserFrame src={step.image.src} alt={step.image.alt} />
        ) : (
          <img className="panel-shot" src={step.image.src} alt={step.image.alt} loading="lazy" />
        )}
      </li>
    ))}
  </ol>
  <figure className="video-frame">
    <iframe
      src={demoVideo.src}
      title={demoVideo.title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      loading="lazy"
    />
    <figcaption>{demoVideo.caption}</figcaption>
  </figure>
</section>
```

Add at the bottom of `landing-page.tsx`:

```tsx
export function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="browser-frame">
      <div className="browser-frame-bar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}
```

- [ ] **Step 4: Add the styles**

Append to `landing.css`:

```css
/* How it works */
.steps {
  margin: 56px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 24px;
}
.step {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 48px;
  align-items: center;
  padding: 32px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}
.step-copy > .mono {
  display: block;
  margin-bottom: 12px;
  color: var(--mint);
}
.step-copy p {
  margin-top: 10px;
  max-width: 44ch;
  color: var(--muted);
}
.panel-shot {
  display: block;
  width: 100%;
  max-width: 360px;
  margin-inline: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.browser-frame {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.browser-frame-bar {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
}
.browser-frame-bar span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--line);
}
.browser-frame img {
  display: block;
  width: 100%;
}
.video-frame {
  margin: 56px 0 0;
}
.video-frame iframe {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--ink);
}
.video-frame figcaption {
  margin-top: 12px;
  color: var(--muted);
  font-size: 14px;
}
@media (max-width: 900px) {
  .step {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 24px;
  }
}
```

- [ ] **Step 5: Run tests, full check, preview**

Run: `pnpm --filter @bugreceipt/web check` — Expected: PASS. Preview: three cards alternate copy and a real capture; the video sits below at container width.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the how-it-works sequence and demo video

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Evidence tabs

**Files:**

- Create: `apps/web/src/prototypes/landing/evidence-tabs.tsx`
- Modify: `apps/web/src/prototypes/landing/landing-page.tsx`
- Modify: `apps/web/src/prototypes/landing/landing.css`
- Test: `apps/web/tests/evidence-tabs.test.tsx`

**Interfaces:**

- Consumes: `evidenceTabs` from `landing-content.ts`, `BrowserFrame` from `landing-page.tsx` (move `BrowserFrame` into `evidence-tabs.tsx` and re-export it from there to avoid an import cycle; update the Task 4 import in `landing-page.tsx` to `import { BrowserFrame, EvidenceTabs } from './evidence-tabs';`).
- Produces: `EvidenceTabs()` component with WAI-ARIA tabs (roving tabindex, ArrowLeft/ArrowRight/Home/End).

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/evidence-tabs.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EvidenceTabs } from '../src/prototypes/landing/evidence-tabs';

afterEach(cleanup);

describe('EvidenceTabs', () => {
  it('shows the visual tab first and switches with arrow keys', () => {
    render(<EvidenceTabs />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Play the recording');

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Console' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Every message since recording started');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Console' }), { key: 'End' });
    expect(screen.getByRole('tabpanel')).toHaveTextContent('The failing request');
  });

  it('switches on click', () => {
    render(<EvidenceTabs />);
    fireEvent.click(screen.getByRole('tab', { name: 'Network' }));
    expect(screen.getByRole('img', { name: /Network evidence tab/ })).toBeTruthy();
  });
});
```

Add the test dependencies to `apps/web/package.json` `devDependencies`: `"@testing-library/react": "^16.3.2"`, `"@testing-library/jest-dom": "^6.9.1"`, `"happy-dom": "^20.10.6"`. Create `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

and `apps/web/tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Run `pnpm install` at the root.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && pnpm exec vitest run tests/evidence-tabs.test.tsx`
Expected: FAIL, module `evidence-tabs` not found.

- [ ] **Step 3: Create the component**

Create `apps/web/src/prototypes/landing/evidence-tabs.tsx`:

```tsx
import { useId, useRef, useState } from 'react';
import { evidenceTabs } from './landing-content';

export function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="browser-frame">
      <div className="browser-frame-bar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

export function EvidenceTabs() {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = evidenceTabs[active];

  const focusTab = (index: number) => {
    const next = (index + evidenceTabs.length) % evidenceTabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight') focusTab(index + 1);
    else if (event.key === 'ArrowLeft') focusTab(index - 1);
    else if (event.key === 'Home') focusTab(0);
    else if (event.key === 'End') focusTab(evidenceTabs.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div className="evidence">
      <div className="evidence-copy">
        <div role="tablist" aria-label="Evidence views" className="evidence-tablist">
          {evidenceTabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={index === active}
              aria-controls={`${baseId}-panel`}
              tabIndex={index === active ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <h3>{current.title}</h3>
        <p>{current.body}</p>
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        className="evidence-panel"
        key={current.id}
      >
        <span className="visually-hidden">{current.title}</span>
        <BrowserFrame src={current.image.src} alt={current.image.alt} />
      </div>
    </div>
  );
}
```

Remove `BrowserFrame` from `landing-page.tsx` and import it from `./evidence-tabs` there.

- [ ] **Step 4: Add the section**

In `landing-page.tsx`, after the how-it-works section:

```tsx
<section className="evidence-section" id="evidence">
  <div className="clean-shell content-section">
    <div className="section-heading">
      <p className="eyebrow">Review evidence</p>
      <h2>Inspect everything before it leaves.</h2>
      <p>
        Three views over the same capture. Remove what should not be shared; the count of sensitive
        values redacted locally stays visible while you do.
      </p>
    </div>
    <EvidenceTabs />
  </div>
</section>
```

- [ ] **Step 5: Add the styles**

Append to `landing.css`:

```css
/* Evidence tabs */
.evidence-section {
  background: var(--surface);
  border-block: 1px solid var(--line);
}
.evidence {
  margin-top: 48px;
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
  gap: 48px;
  align-items: start;
}
.evidence-tablist {
  display: inline-flex;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--bg);
}
.evidence-tablist [role='tab'] {
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.evidence-tablist [role='tab'][aria-selected='true'] {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 2px rgb(19 36 47 / 0.08);
}
.evidence-copy h3 {
  margin-top: 28px;
}
.evidence-copy p {
  margin-top: 12px;
  color: var(--muted);
}
.evidence-panel {
  animation: evidence-fade 150ms ease-out both;
}
@keyframes evidence-fade {
  from {
    opacity: 0;
  }
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
@media (max-width: 900px) {
  .evidence {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .evidence-panel {
    animation: none;
  }
}
```

- [ ] **Step 6: Run tests, full check, preview**

Run: `pnpm --filter @bugreceipt/web check` — Expected: PASS, including the two new component tests. Preview: clicking Console and Network swaps the browser frame; Tab then ArrowRight moves selection with a visible focus ring.

- [ ] **Step 7: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): add the evidence tabs section with keyboard support

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Developer deliverable and privacy table

**Files:**

- Modify: `apps/web/src/prototypes/landing/landing-page.tsx`
- Modify: `apps/web/src/prototypes/landing/landing.css`
- Test: `apps/web/tests/landing-page.test.tsx`

**Interfaces:**

- Consumes: `deliverables`, `privacyColumns`, `privacyFootnote` from `landing-content.ts`; `BrowserFrame`.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/tests/landing-page.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && pnpm exec vitest run tests/landing-page.test.tsx`
Expected: FAIL on `id="deliverable"`.

- [ ] **Step 3: Add the sections**

Extend the `landing-content` import in `landing-page.tsx` with `deliverables, privacyColumns, privacyFootnote` and add after the evidence section:

```tsx
        <section className="clean-shell content-section deliverable" id="deliverable">
          <div>
            <p className="eyebrow">Export</p>
            <h2>{deliverables.title}</h2>
            <p className="deliverable-lead">{deliverables.lead}</p>
            <div className="deliverable-copy">
              {deliverables.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <BrowserFrame src={deliverables.image.src} alt={deliverables.image.alt} />
        </section>

        <section className="privacy-section" id="privacy">
          <div className="clean-shell content-section">
            <div className="section-heading">
              <p className="eyebrow">Privacy</p>
              <h2>Privacy by construction.</h2>
              <p>
                Filtering happens before anything is stored. You inspect the capture and choose
                which local files to export.
              </p>
            </div>
            <div className="privacy-table" role="table" aria-label="What BugReceipt captures">
              {privacyColumns.map((column) => (
                <div role="rowgroup" key={column.title}>
                  <h3 role="columnheader">{column.title}</h3>
                  <ul>
                    {column.items.map((item) => (
                      <li role="cell" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="privacy-footnote">{privacyFootnote}</p>
          </div>
        </section>
```

- [ ] **Step 4: Add the styles**

Append to `landing.css`:

```css
/* Deliverable */
.deliverable {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 64px;
  align-items: center;
}
.deliverable-lead {
  margin-top: 16px;
  color: var(--muted);
  font-size: 18px;
}
.deliverable-copy {
  margin-top: 24px;
  display: grid;
  gap: 14px;
  max-width: 52ch;
}
.deliverable-copy p:last-child {
  font-weight: 600;
  color: var(--ink);
}

/* Privacy */
.privacy-section {
  background: var(--surface);
  border-block: 1px solid var(--line);
}
.privacy-table {
  margin-top: 48px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}
.privacy-table > div {
  padding: 24px;
}
.privacy-table > div + div {
  border-left: 1px solid var(--line);
}
.privacy-table h3 {
  font-size: 15px;
  font-weight: 600;
}
.privacy-table > div:first-child h3 {
  color: var(--mint);
}
.privacy-table > div:last-child h3 {
  color: var(--danger);
}
.privacy-table ul {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
  color: var(--muted);
  font-size: 15px;
}
.privacy-footnote {
  margin-top: 20px;
  max-width: 64ch;
  color: var(--muted);
  font-size: 14px;
}
@media (max-width: 900px) {
  .deliverable {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  .privacy-table {
    grid-template-columns: 1fr;
  }
  .privacy-table > div + div {
    border-left: 0;
    border-top: 1px solid var(--line);
  }
}
```

- [ ] **Step 5: Run tests, full check, preview**

Run: `pnpm --filter @bugreceipt/web check` — Expected: PASS. Preview: deliverable copy beside the Choose files capture; the privacy table has three ruled columns that stack on mobile.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the export deliverable and privacy table sections

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Corrections, audiences, FAQ

**Files:**

- Modify: `apps/web/src/prototypes/landing/landing-page.tsx`
- Modify: `apps/web/src/prototypes/landing/landing.css`
- Test: `apps/web/tests/landing-page.test.tsx`

**Interfaces:**

- Consumes: `corrections`, `audiences`, `faqs` from `landing-content.ts`; `BrowserFrame`, `ArrowIcon`.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/tests/landing-page.test.tsx`:

```tsx
it('closes with corrections, audiences, and a five-question FAQ', () => {
  expect(page).toContain('id="corrections"');
  expect(page).toContain('id="audiences"');
  expect(page).toContain('id="faq"');
  expect(page).not.toContain('id="changelog"');
  const content = readFileSync(
    new URL('../src/prototypes/landing/landing-content.ts', import.meta.url),
    'utf8',
  );
  expect(content.match(/question: '/g)).toHaveLength(5);
  expect(content).toContain('/guide#corrections');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && pnpm exec vitest run tests/landing-page.test.tsx`
Expected: FAIL on `id="corrections"`.

- [ ] **Step 3: Add the sections**

Extend the `landing-content` import with `audiences, corrections, faqs` and add after the privacy section:

```tsx
        <section className="clean-shell content-section corrections" id="corrections">
          <div>
            <p className="eyebrow">Text corrections</p>
            <h2>{corrections.title}</h2>
            <p className="corrections-body">{corrections.body}</p>
            <a className="btn-link" href={corrections.link.href}>
              {corrections.link.label} <ArrowIcon />
            </a>
          </div>
          <div className="corrections-shots">
            <BrowserFrame src={corrections.images[0].src} alt={corrections.images[0].alt} />
            <img
              className="panel-shot"
              src={corrections.images[1].src}
              alt={corrections.images[1].alt}
              loading="lazy"
            />
          </div>
        </section>

        <section className="audiences-section" id="audiences">
          <div className="clean-shell content-section">
            <div className="section-heading">
              <p className="eyebrow">Built for</p>
              <h2>Whoever has to explain the failure.</h2>
            </div>
            <div className="audiences">
              {audiences.map((audience) => (
                <div key={audience.title}>
                  <h3>{audience.title}</h3>
                  <p>{audience.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="clean-shell content-section faq" id="faq">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Questions before you install.</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>
                  {faq.question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="clean-shell content-section closing">
          <h2>Install it before the next bug.</h2>
          <p>Free, local-first, no account. Works on Chrome desktop 125 and newer.</p>
          <div className="hero-actions">
            <a className="btn-primary" href={storeUrl} target="_blank" rel="noreferrer">
              <ChromeIcon /> Add to Chrome
            </a>
            <a className="btn-link" href="/guide">
              Read the user guide <ArrowIcon />
            </a>
          </div>
        </section>
```

- [ ] **Step 4: Add the styles**

Append to `landing.css`:

```css
/* Corrections */
.corrections {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 64px;
  align-items: center;
}
.corrections-body {
  margin: 16px 0 20px;
  max-width: 52ch;
  color: var(--muted);
  font-size: 17px;
}
.corrections-shots {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.corrections-shots .panel-shot {
  max-width: none;
}

/* Audiences */
.audiences-section {
  background: var(--surface);
  border-block: 1px solid var(--line);
}
.audiences {
  margin-top: 48px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 40px;
}
.audiences p {
  margin-top: 10px;
  color: var(--muted);
}

/* FAQ */
.faq {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
  gap: 64px;
}
.faq-list {
  border-top: 1px solid var(--line);
}
.faq-list details {
  border-bottom: 1px solid var(--line);
}
.faq-list summary {
  padding: 20px 0;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  cursor: pointer;
  list-style: none;
  font-weight: 600;
}
.faq-list summary::-webkit-details-marker {
  display: none;
}
.faq-list summary span {
  color: var(--mint);
  font-size: 22px;
  line-height: 1;
  transition: transform 160ms ease-out;
}
.faq-list details[open] summary span {
  transform: rotate(45deg);
}
.faq-list details p {
  margin: -6px 40px 22px 0;
  color: var(--muted);
}

/* Closing */
.closing {
  text-align: center;
}
.closing p {
  margin-top: 14px;
  color: var(--muted);
  font-size: 18px;
}
.closing .hero-actions {
  justify-content: center;
}
@media (max-width: 900px) {
  .corrections,
  .faq {
    grid-template-columns: 1fr;
    gap: 36px;
  }
  .corrections-shots {
    grid-template-columns: 1fr;
  }
  .audiences {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
```

- [ ] **Step 5: Run tests, full check, preview**

Run: `pnpm --filter @bugreceipt/web check` — Expected: PASS. Preview top to bottom at 1280px and 375px; every section present, no horizontal scroll, FAQ disclosures open and close.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add corrections, audiences, FAQ, and closing sections

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Quality floor, design record, cleanup

**Files:**

- Modify: `apps/web/src/prototypes/landing/landing.css` (only if the checks below find defects)
- Modify: `DESIGN.md`
- Modify: `apps/web/tests/landing-page.test.tsx` (remove any assertion that references deleted files)
- Delete: `apps/web/public/brand/bugreceipt-slide-1.png` … `-5.png`, `bugreceipt-extension-tour.gif`, `bugreceipt-extension-tour-poster.jpg`, `bugreceipt-review-latest.jpg`, `bugreceipt-extension-latest.png` (no longer referenced; confirm with `grep -rn "bugreceipt-slide\|tour\|review-latest\|extension-latest" apps/web/src` returning nothing). Keep `bugreceipt-extension-real*.png` only if still referenced; otherwise delete too.

- [ ] **Step 1: Responsive and accessibility pass**

Start the preview (`.claude/launch.json` entry `web`) and check at 375, 768, and 1280px:

- no horizontal overflow (`document.documentElement.scrollWidth === window.innerWidth`);
- Tab order: header links, Add to Chrome, hero actions, evidence tabs, FAQ summaries, footer links, each with the mint focus ring;
- `prefers-reduced-motion: reduce` (emulate via `resize_window` colorScheme is not enough; use the browser's `Emulation.setEmulatedMedia` through the javascript tool is unavailable, so toggle the OS setting or temporarily add `@media (prefers-reduced-motion: no-preference)` guards and verify the two animations are the only ones);
- every `<img>` below the hero has `loading="lazy"`.
  Fix defects in `landing.css`; do not touch `site.css` guide rules.

- [ ] **Step 2: Lighthouse**

Run: `npx lighthouse http://localhost:3100 --only-categories=performance,accessibility,best-practices --quiet --chrome-flags="--headless=new"`
Expected: accessibility ≥ 95, performance ≥ 90 on the local build (`pnpm build:web && pnpm --filter @bugreceipt/web preview` serves the production build on port 4173; use that URL for the real number). If performance is below 90 because of the 2x captures, add `width`/`height` attributes to each `<img>` from the PNG dimensions (side panel 880×1520, desktop 2880×1800) and re-run.

- [ ] **Step 3: Update `DESIGN.md`**

Replace the frontmatter `colors`, `typography`, `rounded`, `spacing`, and `components` blocks with the Task 1 tokens (sans `Geist Variable`, mono `JetBrains Mono Variable`, radii 12/8/999, the eight colors, section 112/72, `button-primary` amber on ink). Replace the "Overview", "Colors", "Typography", "Shapes", "Elevation & Depth", and "Components" prose with a description of the product-matched system: the site uses the extension's light theme so real captures sit on the page without a seam; one amber action color; mint for state; one shadow for proof frames; the receipt as the signature component; numbered markers only for the capture sequence. Delete the "Extension Prototype: Midnight Evidence Console" subsection (the extension is light now). Keep the "Do's and Don'ts" section and change "Don't introduce rounded pills" to "Don't introduce gradients, dark marketing composites, or a second accent color."

- [ ] **Step 4: Delete unused assets and run everything**

Delete the files listed above after the grep confirms they are unreferenced. Run:

```bash
pnpm check
```

Expected: PASS across the workspace (format, lint, typecheck, tests, builds, extension package validation).

- [ ] **Step 5: Commit**

```bash
git add -A apps/web DESIGN.md
git commit -m "chore(web): finish the landing redesign quality pass and record the design system

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

- **Spec coverage.** Header (T1 §5.1), hero and receipt (T2–T3 §5.2), how it works and video (T4 §5.3), evidence tabs (T5 §5.4), deliverable (T6 §5.5), privacy table (T6 §5.6), corrections (T7 §5.7), built for (T7 §5.8), FAQ (T7 §5.9), footer (T1 §5.10), removed blocks (T3 deletes the old page; T8 deletes composites), copy direction (content module in T3), quality floor and `DESIGN.md` (T8), support widget decision (T1 removes the floating script and adds the footer link).
- **Placeholders.** None; every code step is complete.
- **Type consistency.** `BrowserFrame` is defined in T4 in `landing-page.tsx` and moved to `evidence-tabs.tsx` in T5 with the import updated; `storeUrl`, `ChromeIcon`, `ArrowIcon` come from `site-shell.tsx` (T1) and are used in T3 and T7; `receipt.generated.json` shape (T2) matches `receipt.tsx` (T3); content exports (T3) match their consumers (T4–T7).
