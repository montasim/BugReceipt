# Landing Page Vertical Rhythm — Design

Date: 2026-08-30
Scope: `apps/web/src/routes/index.tsx`, `apps/web/tests/landing-page.test.tsx`

## Problem

Landing page sections sit too close together. Hero has no bottom padding (dashed arrow under the extension panel collides with the timeline), the trace section opens with 20px, the privacy strip uses a fixed 200px top margin on all viewports, and section interiors sit at the dense end of the scale.

## Goal

Consistent vertical rhythm following UI/UX best practice, per the approved "Generous" scale.

## Rhythm Tiers

| Tier               | Desktop                                                   | Mobile (≤620px) | Usage                                       |
| ------------------ | --------------------------------------------------------- | --------------- | ------------------------------------------- |
| Primary chapter    | `py-[clamp(6rem,9vw,8rem)]` (96→128px)                    | `py-16`         | Ledger, Install                             |
| Supporting chapter | `py-[clamp(5rem,7vw,6rem)]` (80→96px)                     | `py-16`         | Questions, Closing                          |
| Interiors          | 24–32px rows, unchanged range but one step up where dense | —               | Evidence rows, FAQ rows, privacy principles |

## Changes

1. **Hero** — `pt-8` → `pt-12`; add `pb-[clamp(5rem,8vw,7rem)]`. Frees the dashed arrow and separates hero from timeline.
2. **Trace section** — `pt-5` → `pt-2` (hero bottom padding now supplies the gap). Desktop evidence-strip `mt-8` and mobile `pt-14` unchanged.
3. **Privacy strip** — `mt-[200px]` → `mt-[clamp(7rem,10vw,12rem)]`; h2 `py-6` → `py-8`; principles `p-5` → `p-6`.
4. **Ledger** — heading row `pb-6` → `pb-8`, content `pt-8` → `pt-10`; captured-evidence rows `py-5` → `py-6`.
5. **Install** — to primary tier; runbook steps unchanged.
6. **Questions** — to supporting tier; FAQ rows `py-5` → `py-6`.
7. **Closing** — to supporting tier.
8. **Tests** — update pinned literals in `tests/landing-page.test.tsx` (spacing test, hero/timeline test).

## Non-goals

- No structural or component changes; pure spacing.
- No design-token refactor for a single page (YAGNI). Existing arbitrary-value Tailwind idiom stays.
- Nav `scroll-mt` values unchanged.

## Verification

- `pnpm test` green.
- Desktop + mobile screenshots before/after.
