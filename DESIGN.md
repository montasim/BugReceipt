---
name: BugReceipt
description: A light, product-matched site for a Chrome extension that exports reproducible bug reports; real captures sit on the page without a seam.
colors:
  bg: '#f6f8f9'
  surface: '#ffffff'
  ink: '#13242f'
  muted: '#5d6d76'
  line: '#dde4e7'
  amber: '#e8a13f'
  mint: '#0f7a6d'
  danger: '#b83c24'
typography:
  display:
    fontFamily: 'Geist Variable, system-ui, sans-serif'
    fontSize: 'clamp(40px, 4.4vw, 56px)'
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: '-0.02em'
  headline:
    fontFamily: 'Geist Variable, system-ui, sans-serif'
    fontSize: 'clamp(28px, 3vw, 36px)'
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: '-0.015em'
  title:
    fontFamily: 'Geist Variable, system-ui, sans-serif'
    fontSize: '20px'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: 'Geist Variable, system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: 'JetBrains Mono Variable, monospace'
    fontSize: '13px'
    fontWeight: 500
    lineHeight: 1.6
rounded:
  card: '12px'
  control: '8px'
  pill: '999px'
spacing:
  control: '0 22px'
  page-gutter: '24px'
  section: '112px'
  section-small: '72px'
components:
  button-primary:
    backgroundColor: '{colors.amber}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '{spacing.control}'
  button-primary-hover:
    backgroundColor: '#d88c29'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '{spacing.control}'
---

# Design System: BugReceipt

## Overview

The site uses the extension's own light theme, so real product captures sit on the page without a seam. There is no marketing layer between the page and the product: the hero shows the actual exported issue.md as a receipt, and every later section shows a real capture of the screen it describes. Amber is the single action color, mint marks state, and one shadow is shared by all proof frames. Numbered markers appear only where the page shows the capture sequence.

## Colors

Eight tokens, declared once on `.clean-site` in `site.css`.

- **Ink `#13242f`:** Body text, headings, and text on amber.
- **Muted `#5d6d76`:** Secondary copy and captions.
- **Bg `#f6f8f9`:** The page ground and alternating section bands.
- **Surface `#ffffff`:** The receipt, browser frames, and bands that carry proof.
- **Line `#dde4e7`:** Borders and dividers.
- **Amber `#e8a13f`:** The one action color. Used for Add to Chrome and nothing else; hover is `#d88c29`.
- **Mint `#0f7a6d`:** State: included files, eyebrows, step numbers, and the keyboard focus ring.
- **Danger `#b83c24`:** Reserved for failed or destructive detail.

## Typography

Geist Variable for text, JetBrains Mono Variable for evidence data.

- **h1:** `clamp(40px, 4.4vw, 56px)`, 600, 1.05, -0.02em.
- **h2:** `clamp(28px, 3vw, 36px)`, 600, 1.15, -0.015em.
- **h3:** 20px, 600, 1.3.
- **Body:** 16px, 1.6.
- **Mono (`code`, `.mono`):** 13px, 500. Used for filenames, counts, step numbers, and the receipt, not for reading copy.

## Layout

The shell is `min(1200px, 100% - 48px)`; at 560px the gutter is 16px. Section padding is 112px, 72px at 560px. At 900px the header nav hides and multi-column grids collapse; landing grids use `minmax(0, 1fr)` tracks so wide captures cannot widen the page.

## Elevation & Depth

Flat by default. A single shadow, `0 20px 50px rgb(19 36 47 / 0.08)`, belongs to proof frames: the receipt and the browser frames around desktop captures. Cards, bands, and the header use borders only.

## Shapes

Radii are 12px for frames, receipt, and cards; 8px for controls; 999px only for the three dots in the browser frame bar.

## Components

### Buttons

Primary: amber background, ink text, 48px high, 8px radius, 150ms background transition to the hover amber. The header variant is 40px high. The secondary action is a text link with an arrow and an underline on hover.

### Receipt

The signature component. It renders the real issue.md produced by `@bugreceipt/issue-export` from the demo capture: title, numbered steps, expected and current behavior, console and network excerpts, and a footer listing the exported files with mint Included badges. It uses the surface fill, the 12px radius, and the proof shadow, and enters once with a 500ms rise that is disabled under `prefers-reduced-motion`.

### Browser frame

Wraps desktop captures: three-dot bar, one-pixel line border, 12px radius, proof shadow. Side-panel captures are shown bare with a line border and are height-bounded inside the how-it-works cards. All images carry intrinsic width and height and load lazily below the hero.

### Numbered markers

Mono numbers 01 to 03 mark the three capture steps. They are not used for features, benefits, or FAQ items.

### Evidence tabs

A three-tab group (Visual, Console, Network) with arrow-key, Home, and End navigation. The panel is focusable and the active capture fades in over 150ms, also disabled under reduced motion.

### Guide page

The guide at `/guide` is part of the same shell: the same header, footer, tokens, and frames, with a numbered list of captures that follows the product flow from the side panel to export.

### Focus

Buttons, links, summaries, tabs, and the tab panel show a 3px mint outline offset by 3px.

## Do's and Don'ts

### Do:

- **Do** lead with claims that are backed by an inspectable artifact, ledger, file tree, or explicit boundary.
- **Do** use thin rules, 12px and 8px radii, and tonal contrast as the default hierarchy tools.
- **Do** reserve JetBrains Mono for diagnostic metadata, counts, paths, versions, status, and navigation labels.
- **Do** preserve the 900px and 560px responsive behavior and the reduced-motion guards on the two animations.

### Don't:

- **Don't** introduce gradients, dark marketing composites, or a second accent color.
- **Don't** use amber for state or mint for actions; keep their roles distinct.
- **Don't** put the proof-frame shadow on every container; it belongs to the receipt and the capture frames.
- **Don't** use numbered markers outside the capture sequence.
- **Don't** turn this landing page's current section sequence into a global layout requirement.
