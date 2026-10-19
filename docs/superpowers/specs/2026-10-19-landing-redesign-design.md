# Landing page redesign — design

Date: 2026-10-19
Scope: `apps/web` landing page (`/`). The guide page (`/guide`) stays as it is; only the shared header and footer it inherits from `SiteShell` change.
Status: approved 2026-10-19 — direction B, Geist. Implementation plan: `docs/superpowers/plans/2026-10-19-landing-redesign.md`.

## 1. Audit: why the current page reads as cheap

Checked at 1280px and 375px on 2026-10-19.

**Structure is a template.** Hero split, four-check trust strip, six one-line features in two columns, video, three icon cards, two-entry changelog, FAQ accordion, CTA band. Every block is a known SaaS pattern and none of them is specific to a bug-reporting tool. A reader cannot tell from the page what the product actually produces.

**No real product on the page.** The hero carousel shows dark marketing composites that carry their own headlines inside the image, fighting the page headline. The only genuine UI lives on `/guide`. Auto-rotating carousels are a strong "template" signal on their own.

**No type scale.** Bricolage Grotesque at weight 650–700 nearly everywhere, tight tracking on all headings, sizes 11/13/14/15/17/22/40 with no ratio. Everything bold means nothing is important. Body copy is 14px gray.

**Two visual systems collide.** `DESIGN.md` describes a square, paper-and-ink editorial system (zero radius, coral/teal). The landing CSS uses 9/10/14/999px radii, amber/mint, pill badges. Neither matches the extension, which is now a light, rounded, amber-action interface. The site does not look like the product it sells.

**Content is thin or duplicated.** "Everything needed to reproduce the problem" is a claim with no artifact. The changelog has two entries and reads as filler. The FAQ repeats the privacy section. "Version 0.3.0 is the latest version" is a release note where a value proposition should be. The final band, "Report bugs with proof", is interchangeable with any product.

**Details.** Third-party support widget overlaps content; "Add to Chrome" appears three times above the fold; the theme toggle is an app affordance, not a marketing one; the footer is two lines.

## 2. Goal

A page that looks like the work of a company that ships careful software: quiet, specific, proof-led. The reader should understand within one screen what BugReceipt captures, what the developer receives, and that nothing leaves the machine. Success: the hero shows real output, every claim sits beside a real artifact, one typeface system, one accent, no template blocks.

## 3. Three directions

### A. Evidence Desk (implement `DESIGN.md` as written)

Paper and fog grounds, square geometry, thin rules, mono labels, coral/teal inks, Bricolage display.
Pro: already documented; strong, editorial. Con: the user has rejected the current font family; square broadsheet styling is now a recognisable AI default; it does not match the rounded extension UI, so screenshots would look foreign on the page.

### B. Product-first, quiet (recommended)

The website adopts the extension's own visual language: light neutral surfaces, 10–14px radii, amber as the only action color, mint for state. Real light-mode captures and the real exported report are the content. One neutral sans with a real scale, mono reserved for evidence. Signature element: **the receipt**, the actual `issue.md` the developer receives, rendered live from a real capture and shown beside the screen it came from.
Pro: the site and the product become one object; every section has a proof artifact we already own; nothing to fabricate. Con: requires replacing the font system and rewriting all copy; the hero depends on rendering a real report (feasible, see 5.2).

### C. Documentary dark

Near-black, terminal-styled, single bright accent.
Con: the extension and the guide are light; dark-with-accent is the second AI default; "professional" for a QA/dev-tools audience today reads lighter and calmer. Not recommended.

**Recommendation: B.** The rest of this document specifies B.

## 4. Visual system

### Typography

Replace Bricolage Grotesque. One sans for display and body, with weight and size doing the hierarchy work, not tracking.

- **Sans:** Geist Variable (`@fontsource-variable/geist`). Fallback choice if rejected: Inter Variable. Both are neutral, professional, and read well at 16–18px.
- **Mono:** keep JetBrains Mono Variable, used only for evidence content, file names, counts, and version strings.

Scale (desktop → mobile), weights in parentheses:

| Role    | Size      | Weight | Line height | Tracking |
| ------- | --------- | ------ | ----------- | -------- |
| Display | 56 → 40px | 600    | 1.05        | -0.02em  |
| H2      | 36 → 28px | 600    | 1.15        | -0.015em |
| H3      | 20px      | 600    | 1.3         | 0        |
| Body L  | 18px      | 400    | 1.6         | 0        |
| Body    | 16px      | 400    | 1.6         | 0        |
| Caption | 13px      | 500    | 1.5         | 0        |
| Mono    | 13px      | 500    | 1.6         | 0        |

Only Display and H2 use negative tracking. Body copy never drops below 15px. Max measure 64ch.

### Color

Derived from the extension's light theme so screenshots sit on the page without a visible seam.

| Token   | Value     | Use                                     |
| ------- | --------- | --------------------------------------- |
| bg      | `#f6f8f9` | Page ground                             |
| surface | `#ffffff` | Cards, report, browser frames           |
| ink     | `#13242f` | Headings, body                          |
| muted   | `#5d6d76` | Secondary copy, captions                |
| line    | `#dde4e7` | Hairlines, frames                       |
| amber   | `#e8a13f` | Primary action only (matches extension) |
| mint    | `#168f80` | Status, "included", local-only markers  |
| danger  | `#b83c24` | Error excerpts inside evidence only     |

One dark surface is allowed on the whole page: the console excerpt inside the receipt. No gradients, no glows, no dark marketing composites.

### Shape, depth, motion

- Radii: 12px containers, 8px controls, 999px only for status chips that mirror the extension's own badges.
- Depth: 1px `line` borders. One shadow, `0 20px 50px rgb(19 36 47 / 0.08)`, used on the hero receipt and the browser frames only.
- Motion: one entrance on the hero receipt (fade + 12px rise, 500ms, once). Evidence tab switch cross-fades 150ms. Nothing on scroll. All motion removed under `prefers-reduced-motion`.
- Light only. Remove the theme toggle from the marketing site. (The guide inherits this; its images are light.)

### Layout

1200px container, 24px gutters (16px below 560px), 12-column grid. Section rhythm 112px desktop, 72px mobile. Two-column sections pair copy (5 cols) with proof (7 cols) and collapse at 900px with proof below copy.

## 5. Page structure

Section order and what each one proves. Numbered markers are used only in "How it works", because that content is a sequence.

```
┌──────────────────────────────────────────────────────────────┐
│ Header: mark · Guide · Privacy · FAQ · GitHub      [Add to Chrome]
├──────────────────────────────────────────────────────────────┤
│ 1 Hero                                                        │
│   Bug reports developers        ┌──────────────────────────┐ │
│   can reproduce.                │  issue.md  (the receipt) │ │
│   Record the tab, keep console  │  title · steps · env ·   │ │
│   and network evidence, review  │  console excerpt · files │ │
│   and export locally.           └──────────────────────────┘ │
│   [Add to Chrome] Read the guide   caption: exported from the │
│   Chrome desktop 125+ · free ·     capture shown below        │
│   no account                                                  │
├──────────────────────────────────────────────────────────────┤
│ 2 How it works (3 steps, real panel captures, 45s video)      │
│ 3 Evidence, inspected (tabs: Visual / Console / Network)      │
│ 4 What the developer gets (report + ZIP manifest)             │
│ 5 Privacy by construction (captured / filtered / never)       │
│ 6 Text corrections (two captures, link to guide part 2)       │
│ 7 Built for (QA · support · open source maintainers)          │
│ 8 FAQ (5 questions, no duplicates of section 5)               │
│ 9 Footer: install · guide · GitHub · security · version       │
└──────────────────────────────────────────────────────────────┘
```

### 5.1 Header

Sticky, 64px, white at 92% with blur, 1px bottom line. Left: mark + wordmark. Center-right: Guide, Privacy, FAQ, GitHub. Right: one amber "Add to Chrome". Below 900px: mark, Guide, Add to Chrome. No theme toggle.

### 5.2 Hero and the receipt (signature)

Headline: "Bug reports developers can reproduce." Subline: "BugReceipt records the tab you are testing, keeps the console and network evidence with your steps, and exports a report you review first. Nothing leaves your machine until you share it." Primary action "Add to Chrome", secondary text link "Read the user guide". Fine print in caption size: Chrome desktop 125+, free, no account.

The receipt is a rendered `issue.md`: title, environment block, numbered steps, a console excerpt (the one dark surface), and the file list from the export manifest. It is **real output**: at build time a script renders it with `renderGitHubIssue` from `packages/issue-export` using the same synthetic capture session that produced the guide screenshots, so the receipt and the screenshots agree line for line. The receipt is static HTML on the page (no iframe, no image), so it stays crisp and selectable. Caption under it: "Exported from the capture in the screens below."

### 5.3 How it works

Three rows, each a step number, a short title, two sentences, and a real light-mode capture at panel width: Choose the tab (01-side-panel), Reproduce and add steps (03-recording), Stop and review (05-report-details, shown in a plain browser frame). The 45-second YouTube demo sits at the end of this section, full container width, with a sentence that says what it shows. The video is reused as is.

### 5.4 Evidence, inspected

One component: a tab bar (Visual · Console · Network) above a browser frame that swaps between 06, 07, 08 captures with a 150ms cross-fade. Copy on the left names what each tab lets you do: save frames and annotate; search, filter, and remove console entries; open a request and read the filtered body. The sentence "8 sensitive values redacted locally" from the real screenshot is called out in the copy because it is the privacy story made visible.

### 5.5 What the developer gets

Left: the ZIP manifest as a list with mono file names and "Included" chips, taken from the real Choose files screen (09). Right: three short paragraphs on the Markdown report, the HAR and console JSON, and the WebM and frames. Ends with "BugReceipt does not open or submit a GitHub issue for you; you attach what you reviewed."

### 5.6 Privacy by construction

A three-column table, not icon cards: **Captured after you start** (tab video, console, requests, steps, page and browser context), **Filtered before storage** (query strings, emails, bearer tokens, secret-shaped fields, sensitive headers), **Never read** (cookies, local storage, DOM, form values, keystrokes, clipboard, audio). Footnote: recordings and screenshots show whatever was on screen; review before sharing. This replaces both the trust strip and the icon-card section.

### 5.7 Text corrections

Short two-column section: copy on the left, captures 11 (selection on page) and 14 (batch in panel) on the right. Link: "See the correction workflow in the guide."

### 5.8 Built for

Three columns, text only, no icons: QA engineers (one capture replaces screenshot plus DevTools export), support teams (ask a customer for one ZIP), open-source maintainers (issues arrive with console and network attached). Each is two sentences and names what changes for that person.

### 5.9 FAQ

Five disclosures, answers rewritten to avoid repeating section 5.6: supported browsers; what happens on cross-origin navigation; how long evidence is kept; whether it works on localhost and staging; what the unpacked ZIP from GitHub Releases is for.

### 5.10 Footer

Four columns: product (Add to Chrome, user guide, changelog as a link to GitHub Releases), project (GitHub, security policy, support), boundaries (one line: local-first, no account, no automatic uploads), and the version string in mono. Replaces the changelog section.

### Removed

Carousel, trust strip, six-item feature list, icon cards, changelog section, "Report bugs with proof" band, theme toggle, marketing composites (`bugreceipt-slide-*.png` stay in the repo for the store listing but are no longer used on the site).

## 6. Copy direction

Sentence case. Plain verbs. Every heading states a fact about the product, not a slogan. No "powerful", "seamless", "effortless". Name the actual files and screens the reader will see. Keep the privacy boundaries phrased as the product does in `PRODUCT.md`: do not imply guaranteed redaction or automatic issue creation.

## 7. Implementation outline

1. **Tokens and shell.** New `landing.css` with the tokens above; swap `@fontsource-variable/bricolage-grotesque` for `@fontsource-variable/geist`; restyle `SiteShell` header and footer; remove the theme toggle and its storage key. The guide page picks these up unchanged.
2. **Receipt renderer.** `apps/web/scripts/render-receipt.mjs` uses `renderGitHubIssue` on the shared synthetic session to emit `src/prototypes/landing/receipt.html` (or a JSON block the component maps). Hook into `generate-routes` so the build cannot drift from the renderer.
3. **Hero, How it works, video.**
4. **Evidence tabs** component with keyboard support (arrow keys, roving tabindex).
5. **Developer deliverable, privacy table, corrections, built for, FAQ, footer.**
6. **Quality floor.** 375/768/1280 checks, keyboard focus visible, reduced motion, Lighthouse accessibility and performance at or above 95, image sizes (serve the 2x captures at bounded widths, lazy below the fold).
7. **Housekeeping.** Update `tests/landing-page.test.tsx` for the new sections; update `DESIGN.md` to describe the product-matched system so the next change does not revive the square system.

Each numbered item is one commit.

## 8. Open decisions

1. Direction: B as specified, or A/C. (Recommended: B.)
2. Sans: Geist (recommended) or Inter.
3. Whether the SupportKori support widget stays on the marketing page. Recommended: move it to the footer as a plain "Support" link and drop the floating button.
