---
target: the whole BugReceipt extension UI
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 5
timestamp: 2026-09-14T14-58-38Z
slug: entrypoints-sidepanel-main-tsx
---
## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2/4 | Many pending labels exist, but review has no dedicated initial loading state and important notices are remote from their triggers. |
| 2 | Match System / Real World | 3/4 | Evidence language is mostly clear; HAR, visual annotations, and raw runtime errors leak implementation concepts. |
| 3 | User Control and Freedom | 2/4 | Whole-capture deletion is confirmed, but discard and most evidence removals have no confirmation or undo. |
| 4 | Consistency and Standards | 2/4 | Shared tokens exist, but actions, notices, empty states, loading states, and removals are composed ad hoc. |
| 5 | Error Prevention | 2/4 | Validation and limits help, while destructive evidence changes and annotation invalidation lack adequate guardrails. |
| 6 | Recognition Rather Than Recall | 3/4 | Tabs and labels are visible; shortcuts, annotation rules, and export readiness require discovery or memory. |
| 7 | Flexibility and Efficiency | 2/4 | Some keyboard support exists, but no surfaced shortcut system or bulk evidence management exists. |
| 8 | Aesthetic and Minimalist Design | 2/4 | The visual language is coherent, but the review workbench presents too many concurrent jobs and repeated chrome. |
| 9 | Error Recovery | 2/4 | Messages are often specific, but failed artifacts lack retry paths and no-session handling can expose raw errors. |
| 10 | Help and Documentation | 1/4 | Support links exist; task-level guidance for permissions, evidence, annotation, and export choices is sparse. |
| **Total** |  | **21/40** | **Acceptable — significant redesign needed** |

## Design Specificity Verdict

**Partially authored, not yet unmistakably BugReceipt.** The Evidence Desk identity is present in the paper/fog surfaces, square rules, ink/coral/teal palette, editorial typography, mono metadata, and evidence panes. Yet the structure still reads as a generic QA console. The product name promises a receipt, but the interface never turns that into a persistent evidence manifest, capture-completeness ledger, chain-of-custody trace, or final proof of exactly what will leave the device.

The deterministic scan reported zero rule findings across 12 TSX files, but it explicitly ran in degraded regex mode because its parser modules were unavailable. It could not evaluate selectors, CSS variables, computed contrast, layout, or runtime state transitions; zero findings is an undercount, not a clean bill of health. No reliable browser overlay was available because the extension requires Chrome APIs unavailable in the inspection browser.

## Overall Impression

BugReceipt has stronger product thinking and edge-case coverage than its UI communicates. The active-capture state feels purposeful and trustworthy, while the review experience feels like a dense collection of capable tools without a visible operating sequence. The biggest opportunity is to make the entire experience behave like an evidence receipt: capture progress, evidence health, redaction, review, removal, and export should read as one continuous chain.

## What's Working

1. **Privacy appears at consequential moments.** The side panel and review header repeatedly clarify that evidence stays local and export is explicit.
2. **Interaction semantics are better than the surface suggests.** Evidence tabs and download menus support arrow keys, Home/End, Escape, focus management, live regions, and reduced motion.
3. **The state model is unusually broad.** Permission denial, chooser cancellation, recording fallback, interrupted capture, missing artifacts, validation, annotation history, and export failures already exist in the implementation.

## Cognitive Load

**High: 4 of 8 checks fail.** Grouping, chunking, basic hierarchy, and some progressive disclosure pass. Single focus, one-decision-at-a-time flow, minimal visible choices, and working-memory support fail. The annotation toolbar alone can expose five tools, colors, stroke widths, undo, redo, clear, cancel, and save. In review, users must coordinate report editing, evidence triage, annotation, deletion, validation, copy, and download without a persistent sequence or readiness model.

## Emotional Journey

- **Start:** “Record the failure. Keep the evidence.” establishes a confident promise.
- **Permission valley:** site access and tab selection are two distinct commitments, but the boundary is not previewed clearly enough before Chrome prompts.
- **Capture peak:** timer, origin, event count, steps, and privacy reassurance make the session feel controlled.
- **Review valley:** export validation, destructive actions, report fields, evidence tabs, and annotation compete immediately.
- **Weak ending:** export explains folder versus ZIP, but completion is only a notice. The interface never celebrates or proves what was captured, removed, redacted, and saved.

## Priority Issues

### [P1] The review workbench lacks a clear operating sequence

**Why it matters:** Users must infer whether to complete the report, inspect evidence, annotate, remove sensitive content, or export first.

**Fix:** Prototype a three-stage model: **Report → Evidence → Export check**. Keep global progress and readiness persistent; show task controls only within the active stage. The final stage should present a bundle manifest, redaction summary, missing/failed evidence, and output choice.

**Suggested command:** `$impeccable shape`

### [P1] State and recovery UI is not a coherent system

**Why it matters:** Loading, no-session, permission denial, interrupted capture, missing recording, and failures use unrelated layouts and recovery behaviors. A fresh non-extension render exposed a raw runtime exception; the side panel could fail blank.

**Fix:** Define shared `StatePage`, `InlineNotice`, `ErrorNotice`, `LoadingState`, `EmptyState`, and `RecoveryAction` patterns. Separate loading, empty, unsupported, permission-denied, recoverable failure, degraded capture, terminal failure, and completion. Hide exception text behind optional technical details.

**Suggested command:** `$impeccable harden`

### [P1] Destructive actions can erase evidence without informed recovery

**Why it matters:** Whole-capture deletion is confirmed, but side-panel discard, frame removal, screenshot removal, diagnostic removal, and annotation clearing are immediate. Removing diagnostics can invalidate visual annotations after the fact.

**Fix:** Use one destructive-action contract: low-cost removal with Undo; impact confirmation when annotations are invalidated; explicit modal confirmation for whole-capture deletion; compact confirmation for side-panel discard.

**Suggested command:** `$impeccable harden`

### [P1] Shared UI is too shallow to support a whole-product redesign

**Why it matters:** `ReviewApp` and the global stylesheet are monolithic, while similar controls and states are repeated through string/class combinations. Visual drift is already visible between the side panel and review workbench.

**Fix:** Prototype and later implement shared primitives: `AppHeader`, `WorkspaceHeader`, `Button`, `AsyncButton`, `IconButton`, `StatusBadge`, `CountBadge`, `InlineNotice`, `Toast`, `ErrorNotice`, `EmptyState`, `LoadingState`, `ArtifactState`, `ConfirmDialog`, `UndoToast`, `Field`, `ValidationSummary`, `Tabs`, `Menu`, `EvidencePanel`, `EvidenceItem`, `BundleManifest`, `ExportReadiness`, and `AnnotationWorkspace`.

**Suggested command:** `$impeccable extract`

### [P1] Annotation is capable but overloaded and pointer-first

**Why it matters:** Creating, moving, and resizing most annotations depends on pointer events. Narrow controls can shrink below 44px, and the toolbar asks users to parse too many choices at once.

**Fix:** Make annotation a focused sub-workspace with a short sequence, 44px controls, keyboard nudging/resizing, an accessible alternative for region creation, shortcut help, undo for Clear all, and a responsive overflow pattern.

**Suggested command:** `$impeccable adapt`

## Persona Red Flags

### Alex — power user

- Ctrl/Cmd+Enter exists for steps but is visible only in a tooltip.
- No surfaced shortcuts for stop, review, copy, download, tab changes, annotation, or removal.
- Evidence cleanup is one item at a time; there is no batch path.
- Dense scrolling and tab switching obstruct a fast anomaly-to-export workflow.

### Jordan — first-timer

- “Allow site access” then “Choose tab & start” creates a two-step permission flow without a clear preview of why both are required.
- Console, Network, HAR, Markdown, and annotation terminology lack contextual explanations.
- Export readiness is summarized away from fields that need attention.
- Failed visual evidence offers no clear retry or recommended fallback action.

### Sam — keyboard and screen-reader user

- Tabs, menus, labels, live regions, and reduced motion are positive.
- Annotation creation, movement, and resizing remain pointer-driven despite `role="application"`.
- Narrow annotation targets can shrink to 34px.
- Footer notices are visually remote; fixed errors can cover content.
- No-session errors lack a recovery action and technical-detail separation.

### Riley — stress tester

- Raw runtime errors can become the primary no-session heading; the side panel can fail blank outside its expected runtime.
- Evidence removal may clear dependent annotations without warning before the click.
- Failed stored frames, recordings, and screenshots lack repair or retry paths.
- Long URLs, user agents, diagnostics, RTL text, 50 long steps, storage failures, and narrow-height collisions need explicit prototype coverage.

### Quinn — QA reporter

- The side panel shows a raw event total rather than evidence health by category.
- Review tabs hide completeness; there is no persistent evidence manifest.
- No “ready to hand off” checklist shows what the developer will receive.

### Dev — receiving developer

- There is no compact synopsis linking reported behavior to the strongest frame, console error, and failed request.
- Visual overlays and exact text highlights are different evidence concepts but are not clearly distinguished.
- Export leads with folder versus ZIP before answering what evidence is included.

## Prototype State Matrix

### Side panel

- Initial loading and restored-session loading.
- First-run explanation and permission disclosure.
- Ready with access; ready without access.
- Requesting access; granted; denied; request failed.
- Unsupported/restricted tab; missing active tab; background worker unavailable.
- Tab chooser pending; chooser cancelled.
- Starting capture; start failed; recording fallback warning.
- Recording current tab with zero/populated/max steps.
- Step typing, moderation checking/error, adding, and add failure.
- Recording another tab; returning; recorded tab unavailable.
- Stop/preparing review; successful evidence summary.
- Discard confirmation, discarding, failure, and undo.
- Ready for review; origin-change interruption; tab-closed interruption.
- Opening review and open failure.
- Long origin, long steps, narrow/short side panel, zoom, RTL, and restored-after-restart stress states.

### Review workbench

- Initial skeleton; no capture; load failure; malformed/unavailable session.
- Three-stage Report, Evidence, and Export-check states with persistent readiness.
- Autosaving, saved, save failed, dirty, and close-with-unsaved-change handling.
- Validation summary plus field-local missing/moderation errors.
- Interrupted capture variants.
- Visual evidence: recording loading/ready/missing/failed; screenshot fallback; total absence; retry and recommended fallback.
- Frame capture unavailable/pending/success/failure/limit; no frame; frame loading/ready/failed; single/multiple navigation.
- Console/network populated, empty, large dataset, failed request, long payload, redacted data, downloads, and failures.
- Image annotation, console markup, network markup, exact text highlighting, save/cancel/history/error, keyboard alternatives, and clear-all confirmation.
- Single removal, removal with dependent-annotation warning, batch removal, undo, and permanent capture deletion.
- Export manifest; validation blocked; preparing; folder/ZIP selection; permission denied; clipboard unavailable; success with filenames/location and next action.
- Storage quota, corrupt artifact, permission revoked, duplicate review tab, offline/runtime unavailable, browser zoom, forced colors, reduced motion, RTL, and localization expansion.

## Minor Observations

- Fixed bottom errors have no dismiss action and can obscure content.
- Support and “Report an issue” compete with the operational task in the review header.
- “Visual annotations” is unclear for console/network; distinguish overlay markup from exact text highlights.
- Review fields have hard limits but no visible character counts.
- “Report stays local” should become a live bundle-status control.
- Responsive behavior has accumulated across duplicate CSS layers instead of being governed by one system.

## Questions to Consider

- What if every capture produced a literal receipt: **4 steps · 1 recording · 3 console errors · 2 failed requests · 5 redactions · 2 removals**?
- What if export were a final review stage rather than a permanently competing action?
- Should first-time reporters ever need to understand “HAR” before choosing a download?
- Are frame markup, console highlighting, and network callouts truly one annotation tool—or three distinct workflows?
- What would disappear if the only promise were: “Hand a developer enough evidence to reproduce this in five minutes”?
