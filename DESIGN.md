---
name: BugReceipt
description: Evidence-led browser diagnostics presented as a precise technical review document.
colors:
  ink: '#102332'
  muted: '#61737d'
  paper: '#f8fbfc'
  fog: '#eef3f5'
  line: '#bacbd2'
  signal: '#ff5c3a'
  trace: '#1f9fae'
typography:
  display:
    fontFamily: 'Bricolage Grotesque Variable, system-ui, sans-serif'
    fontSize: 'clamp(48px, 4.8vw, 60px)'
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: '-0.04em'
  headline:
    fontFamily: 'Bricolage Grotesque Variable, system-ui, sans-serif'
    fontSize: 'clamp(34px, 3.2vw, 40px)'
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: '-0.03em'
  title:
    fontFamily: 'Bricolage Grotesque Variable, system-ui, sans-serif'
    fontSize: '22px'
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: '-0.02em'
  body:
    fontFamily: 'Bricolage Grotesque Variable, system-ui, sans-serif'
    fontSize: '17px'
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: 'JetBrains Mono Variable, monospace'
    fontSize: '11.5px'
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: '0.08em'
rounded:
  none: '0px'
spacing:
  control: '14px 18px'
  page-gutter: '24px'
  content-gap: '48px'
  section: '130px'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '#ffffff'
    typography: '{typography.body}'
    rounded: '{rounded.none}'
    padding: '{spacing.control}'
  button-primary-hover:
    backgroundColor: '#1a3444'
    textColor: '#ffffff'
    rounded: '{rounded.none}'
    padding: '{spacing.control}'
  button-secondary:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.none}'
    padding: '{spacing.control}'
---

# Design System: BugReceipt

## Overview

**Creative North Star: "The Evidence Desk"**

BugReceipt feels like a carefully assembled technical review copy: cool paper and fog surfaces, deep ink structure, and diagnostic annotations that make evidence easy to inspect. The identity is editorial in scale but operational in detail, balancing oversized, tightly set headlines with compact mono metadata.

The system stays flat and document-like by default. Thin rules, numbered ledgers, file trees, and square evidence panels carry the structure; limited ambient shadows identify the few objects that behave like physical review artifacts. Teal traces progress and trustworthy diagnostic state, while coral signals action, exceptions, and human attention.

**Key Characteristics:**

- Cool fog and paper grounds with deep ink structure.
- Oversized editorial type paired with compact diagnostic mono labels.
- Square controls, ruled containers, and evidence-led proof patterns.
- Teal trace and coral signal accents used by role, not as decoration.
- Restrained ambient depth with one evidence-preview settle motion.

## Colors

The palette reads like a cool technical document marked up with two deliberate diagnostic inks.

### Primary

- **Deep Ink:** The structural voice for body text, borders with emphasis, dark evidence fields, and high-contrast action surfaces.

### Secondary

- **Teal Trace:** Identifies diagnostic metadata, progress markers, local-state reassurance, focus, and cool technical highlights.

### Tertiary

- **Coral Signal:** Marks primary emphasis, exceptions, numbered evidence, active affordances, and warm error detail.

### Neutral

- **Cool Paper:** The clean reading surface for headers, panels, and alternating sections.
- **Evidence Fog:** The page ground and default ambient canvas.
- **Measured Gray:** Secondary body copy and supporting metadata.
- **Rule Blue:** Dividers, borders, and document structure.

### Named Rules

**The Two-Ink Rule.** Teal communicates trace, state, and technical continuity; coral communicates signal, action, or exception. Do not swap their roles casually.

**The Paper-and-Ink Rule.** Build hierarchy with the paper, fog, ink, and line neutrals before reaching for either accent.

## Typography

**Display Font:** Bricolage Grotesque Variable (with system UI and sans-serif fallbacks)  
**Body Font:** Bricolage Grotesque Variable (with system UI and sans-serif fallbacks)  
**Label/Mono Font:** JetBrains Mono Variable (with monospace fallback)

**Character:** Bricolage Grotesque supplies a compact, assertive editorial voice without losing utility. JetBrains Mono makes timestamps, counts, file trees, privacy boundaries, and diagnostic labels feel explicit and inspectable.

### Hierarchy

- **Display:** Very large, tightly tracked, and compressed vertically; reserve it for the dominant landing statement.
- **Headline:** Large, tightly tracked section statements with compact line height.
- **Title:** Strong 22px Bricolage titles for evidence records, workflow steps, and disclosures.
- **Body:** Comfortable 17px reading copy with a 1.6–1.65 line height and restrained line lengths around 520–680px.
- **Label:** Small mono text, usually uppercase with tracked letters, for navigation, numbers, statuses, versions, and boundaries.

### Named Rules

**The Diagnostic Register Rule.** Use mono typography for evidence metadata and system state, never as a substitute for readable body copy.

## Layout

The primary shell is capped at 1280px and keeps 24px desktop gutters. Major sections commonly use 120–135px vertical breathing room, while ruled rows and component interiors use denser 13–28px spacing. Layouts favor asymmetric two-column grids that let editorial statements sit beside concrete proof.

At 900px, major two-column regions and three-column workflows collapse to one column, the trust strip stacks, and navigation retains only its final action-oriented link. At 560px, the shell gutter becomes 15px, hero actions stack full-width, major section padding reduces to 85px, and dense proof containers reduce their internal padding. These are system breakpoints, not instructions about the order of sections on future pages.

**The Proof-Beside-Claim Rule.** When space permits, pair explanatory copy with an inspectable artifact, ledger, or procedure rather than another decorative content block.

## Elevation & Depth

The system is flat by default. Borders, dark tonal fields, and alternating paper/fog surfaces establish most hierarchy. Ambient shadows are reserved for the primary action and proof objects: the primary button carries a warm coral cast, while evidence and bundle panels use broad low-opacity ink shadows. The sticky header gains separation through a translucent paper fill and 12px backdrop blur rather than a drop shadow.

### Shadow Vocabulary

- **Signal Action:** `5px 7px 18px rgb(255 92 58 / 0.22)` at rest and `4px 10px 24px rgb(255 92 58 / 0.28)` on hover; use only for the primary action.
- **Evidence Artifact:** `12px 18px 42px rgb(16 35 50 / 0.14)`; use for the featured review-copy preview.
- **Ink Bundle:** `10px 18px 38px rgb(16 35 50 / 0.16)`; use for substantial dark proof containers.

**The Ambient-Only Rule.** Shadows suggest a review artifact resting above the page; they do not replace borders, rules, or tonal structure.

## Shapes

BugReceipt uses square corners throughout. Buttons, evidence panels, code blocks, ledgers, and disclosure rows rely on straight edges, one-pixel rules, and occasional heavy top strokes. The skewed three-bar brand mark and the evidence preview's slight desktop rotation are the rare angled silhouettes; the preview returns to an unrotated rectangle on narrow screens.

**The Squared Evidence Rule.** Keep interactive controls and proof containers unrounded so the interface reads as technical documentation rather than a soft consumer dashboard.

## Components

### Buttons

- **Shape:** Square, compact, and weighty, with 14px vertical and 18px horizontal padding.
- **Primary:** Deep ink with white text and a low coral-cast shadow.
- **Hover / Focus:** Hover rises 2px, deepens the ink surface, and expands the warm shadow over 180ms; active returns to the baseline. Keyboard focus uses a 3px teal outline offset by 4px.
- **Secondary:** Cool paper with a one-pixel rule-blue border and no resting shadow; it shares the same lift behavior.

### Cards / Containers

- **Corner Style:** Square.
- **Background:** Paper for review artifacts; ink for proof bundles and privacy-critical sections.
- **Shadow Strategy:** Flat by default, with ambient depth only for featured evidence objects.
- **Border:** One-pixel rules organize rows and edges; featured evidence uses a one-pixel ink frame.
- **Internal Padding:** Dense rows use 13–27px; substantial proof containers use 44px by 48px on desktop and 30px by 24px on small screens.

### Navigation

The header is a 72px sticky paper strip with a one-pixel bottom rule and light blur. The brand uses bold Bricolage; links use uppercase 11px JetBrains Mono with 0.06em tracking and turn coral on hover. Below 900px, keep only the final action-oriented link visible.

### Evidence Preview

The signature proof component is a square paper review copy with an ink frame, ruled rows, compact mono metadata, a dark console excerpt, and a coral label pinned above its top edge. On larger screens it rests at a 1.2-degree angle and enters once with a 700ms settle using `cubic-bezier(0.16, 1, 0.3, 1)`. At 560px it is unrotated. Reduced-motion preferences collapse animation and transition durations to 0.01ms.

### Ledgers and Disclosure Rows

Evidence ledgers, install steps, privacy statements, and questions are structured as full-width ruled rows. Use mono numbers or short labels as anchors, Bricolage for the human-readable title, and muted body copy for explanation. Disclosure summaries use a coral plus/minus marker rather than a rounded icon button.

## Do's and Don'ts

### Do:

- **Do** lead with claims that are backed by an inspectable artifact, ledger, file tree, or explicit boundary.
- **Do** use thin rules, square geometry, and tonal contrast as the default hierarchy tools.
- **Do** reserve JetBrains Mono for diagnostic metadata, counts, paths, versions, status, and navigation labels.
- **Do** preserve the 900px and 560px responsive behavior and reduced-motion handling when extending this web identity.

### Don't:

- **Don't** introduce rounded pills or soft card radii into the established square form language.
- **Don't** scatter coral and teal decoratively; keep their signal and trace roles distinct.
- **Don't** use shadows on every container or create a generic floating-card dashboard aesthetic.
- **Don't** turn this landing page's current section sequence into a global layout requirement.
