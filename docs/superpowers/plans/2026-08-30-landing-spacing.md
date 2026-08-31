# Landing Page Vertical Rhythm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply approved generous vertical-rhythm scale to landing page sections and update pinned test literals.

**Architecture:** Pure spacing pass over `src/routes/index.tsx` — no structural changes. Tests in `tests/landing-page.test.tsx` pin exact spacing literals, so test updates accompany the spacing changes in the same task.

**Tech Stack:** React + TanStack Router, Tailwind CSS v4 arbitrary values, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-landing-spacing-design.md`

## Global Constraints

- Rhythm tiers: primary `py-[clamp(6rem,9vw,8rem)]`, supporting `py-[clamp(5rem,7vw,6rem)]`, mobile `py-16`.
- No structural or component changes; spacing classes only (plus test literal updates).
- Keep nav `scroll-mt-[76px]` values unchanged.
- Do not break other pinned test strings (copy, version, hrefs).

---

### Task 1: Hero and trace section spacing

**Files:**

- Modify: `apps/web/src/routes/index.tsx` (hero section ~line 117-126, trace section ~line 156-157)
- Test: `apps/web/tests/landing-page.test.tsx` ("keeps the hero, timeline, and evidence trace visually separated" test ~line 69)

**Interfaces:**

- Consumes: existing `shell`, `cn` helpers.
- Produces: hero classes `pt-12 pb-[clamp(5rem,8vw,7rem)]`, trace section `scroll-mt-[76px] pt-2` — Task 3's test update depends on these exact strings.

- [ ] **Step 1: Update pinned literals in the hero/timeline test**

In `apps/web/tests/landing-page.test.tsx`, replace in the "keeps the hero, timeline, and evidence trace visually separated" test:

```ts
expect(source).toContain('pt-8');
expect(source).toContain('scroll-mt-[76px] pt-5');
```

with:

```ts
expect(source).toContain('pt-12');
expect(source).toContain('scroll-mt-[76px] pt-2');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/montasim/Work/Personal/BugReceipt && pnpm --filter web test`
Expected: FAIL — source has `pt-8`, not `pt-12`.

- [ ] **Step 3: Apply hero spacing**

In `apps/web/src/routes/index.tsx`, hero section className:

```tsx
            'grid min-h-[444px] grid-cols-[minmax(0,0.94fr)_minmax(420px,0.76fr)] items-center gap-[clamp(3rem,6vw,5rem)] pt-8',
            'max-[1180px]:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)] max-[1180px]:gap-14',
            'max-[900px]:grid-cols-1 max-[900px]:gap-10 max-[900px]:py-14',
            'max-[620px]:min-h-0 max-[620px]:py-10',
```

becomes:

```tsx
            'grid min-h-[444px] grid-cols-[minmax(0,0.94fr)_minmax(420px,0.76fr)] items-center gap-[clamp(3rem,6vw,5rem)] pt-12 pb-[clamp(5rem,8vw,7rem)]',
            'max-[1180px]:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)] max-[1180px]:gap-14',
            'max-[900px]:grid-cols-1 max-[900px]:gap-10 max-[900px]:py-14 max-[900px]:pb-16',
            'max-[620px]:min-h-0 max-[620px]:py-10 max-[620px]:pb-14',
```

- [ ] **Step 4: Apply trace section spacing**

Trace section className `'scroll-mt-[76px] pt-5 max-[900px]:pt-1'` becomes `'scroll-mt-[76px] pt-2 max-[900px]:pt-1'`.

- [ ] **Step 5: Run tests to verify pass**

Run: `cd /home/montasim/Work/Personal/BugReceipt && pnpm --filter web test`
Expected: PASS all.

- [ ] **Step 6: Commit**

```bash
cd /home/montasim/Work/Personal/BugReceipt && git add apps/web/src/routes/index.tsx apps/web/tests/landing-page.test.tsx && git commit -m "style(web): open up hero and trace section spacing"
```

### Task 2: Privacy strip spacing

**Files:**

- Modify: `apps/web/src/routes/index.tsx` (privacy section ~line 240-271)

**Interfaces:**

- Consumes: nothing from other tasks.
- Produces: privacy section `mt-[clamp(7rem,10vw,12rem)]` — Task 4's spacing test pins this string.

- [ ] **Step 1: Apply privacy spacing**

Privacy section: `mt-[200px]` → `mt-[clamp(7rem,10vw,12rem)]`.

Privacy h2: `px-0 py-6 pr-8` → `px-0 py-8 pr-8`.

PrivacyPrinciple article: `p-5` → `p-6`.

- [ ] **Step 2: Run tests**

Run: `cd /home/montasim/Work/Personal/BugReceipt && pnpm --filter web test`
Expected: PASS all (no test pins the old `mt-[200px]`; verified against test file).

- [ ] **Step 3: Commit**

```bash
cd /home/montasim/Work/Personal/BugReceipt && git add apps/web/src/routes/index.tsx && git commit -m "style(web): breathe privacy strip spacing"
```

### Task 3: Chapter tiers, interior rows, test updates

**Files:**

- Modify: `apps/web/src/routes/index.tsx` (ledger ~line 274-312, install ~line 314-357, questions ~line 359-396, closing ~line 398-424)
- Test: `apps/web/tests/landing-page.test.tsx` ("uses normalized responsive Tailwind spacing" test ~line 57-64)

**Interfaces:**

- Consumes: privacy `mt-[clamp(7rem,10vw,12rem)]` from Task 2.
- Produces: final rhythm; page complete.

- [ ] **Step 1: Update spacing test literals**

In the "uses normalized responsive Tailwind spacing without oversized mobile sections" test, replace:

```ts
expect(source).toContain('py-[clamp(4.5rem,7vw,6rem)]');
expect(source).toContain('py-[clamp(4rem,6vw,5rem)]');
```

with:

```ts
expect(source).toContain('py-[clamp(6rem,9vw,8rem)]');
expect(source).toContain('py-[clamp(5rem,7vw,6rem)]');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/montasim/Work/Personal/BugReceipt && pnpm --filter web test`
Expected: FAIL — clamps not yet in source.

- [ ] **Step 3: Apply ledger spacing**

Ledger section: `'scroll-mt-[76px] py-[clamp(4.5rem,7vw,6rem)] max-[620px]:py-16'` → `'scroll-mt-[76px] py-[clamp(6rem,9vw,8rem)] max-[620px]:py-16'`.

Ledger heading row: `gap-[clamp(3rem,6vw,5rem)] border-b border-line pb-6` → `... pb-8`.

Ledger content grid: `gap-12 pt-8` → `gap-12 pt-10`.

Evidence rows: `gap-4 border-b border-line py-5` → `gap-4 border-b border-line py-6`.

- [ ] **Step 4: Apply install spacing**

Install section: `'grid scroll-mt-[76px] grid-cols-[0.82fr_1.18fr] gap-[clamp(3rem,6vw,5rem)] border-t border-line py-[clamp(4.5rem,7vw,6rem)]'` → `... py-[clamp(6rem,9vw,8rem)] ...`.

- [ ] **Step 5: Apply questions spacing**

Questions section: `'scroll-mt-[76px] border-y border-line bg-paper py-[clamp(4rem,6vw,5rem)] max-[620px]:py-16'` → `py-[clamp(5rem,7vw,6rem)]`.

FAQ summary: `py-5 pr-12` → `py-6 pr-12`; the `+`/`−` icon spans `top-[17px]` stay unchanged (visual alignment still fine at py-6... actually bump: `top-[17px]` → `top-[21px]`).

- [ ] **Step 6: Apply closing spacing**

Closing section: `py-[clamp(4rem,6vw,5rem)]` → `py-[clamp(5rem,7vw,6rem)]`.

- [ ] **Step 7: Run tests**

Run: `cd /home/montasim/Work/Personal/BugReceipt && pnpm --filter web test`
Expected: PASS all.

- [ ] **Step 8: Commit**

```bash
cd /home/montasim/Work/Personal/BugReceipt && git add apps/web/src/routes/index.tsx apps/web/tests/landing-page.test.tsx && git commit -m "style(web): apply chapter rhythm tiers to remaining sections"
```

### Task 4: Visual verification

**Files:**

- Verify: rendered page, desktop + mobile.

**Interfaces:**

- Consumes: final page from Task 3.

- [ ] **Step 1: Screenshot desktop and mobile**

Run: `cd /home/montasim/Work/Personal/BugReceipt/apps/web && pnpm build && pnpm preview` (or dev server), screenshot 1280px and 390px widths. Compare against `.impeccable/review/desktop.png` / `mobile.png`.

- [ ] **Step 2: Check section gaps**

Hero→timeline separation clear (dashed arrow free), privacy strip scaled margin, chapter tiers visibly airier.

- [ ] **Step 3: Commit screenshots (if project tracks them)**

`.impeccable/review/` screenshots already tracked in git — refresh only if that's the established flow; skip otherwise.

---

Self-review: spec items 1-8 all covered (Tasks 1-3 map to spec changes 1-7, Task 3 step 1 + Task 1 step 1 cover spec item 8). No placeholders. Type consistency: class strings match spec exactly.
