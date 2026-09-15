---
version: 1
slug: 'prototypes-extension-ui-index-html'
primary_target: 'prototypes/extension-ui/index.html'
related_targets: []
---

# BugReceipt extension UI prototype

- Scope and mode: Throwaway interactive prototype for the complete Chrome extension UI; Operate.
- Audience and job: QA reporters must capture a browser failure, verify evidence, remove sensitive material, and export a developer-ready local bundle with confidence.
- Creative north star: **Midnight Evidence Console** — a code-led, local-first workbench whose interface reads as one inspectable chain of custody rather than a generic dashboard.
- Primary task: Complete the continuous journey from site access → tab selection → capture → step entry → stop → report → evidence review/annotation/removal → export success.
- Workflow anchor: A persistent receipt rail orders **Report → Evidence → Export check** and keeps stage completion, evidence counts, redactions, removals, and export readiness visible. The active stage owns the main canvas and exposes only contextual actions.
- Visual world: Layered near-black and navy surfaces (`#050b11`, `#08121b`, `#0d1823`, `#0f1b26`) with translucent white dividers. Warm amber (`#f0b35a`) is the single primary action and active-state color. Mint (`#55d6be`) communicates completion, included evidence, local-only safety, and successful export. Soft red is reserved for failure and destructive actions.
- Typography: Bricolage supplies the compact 12–27px operational hierarchy; JetBrains Mono is restrained to receipt IDs, state labels, timestamps, dimensions, counts, paths, and diagnostics. Body copy stays compact, plain, and readable rather than adopting the mono register.
- Shape and depth: Buttons and fields use 10px corners, workflow rows 11px, notices 12px, tab groups 13px, panels 15px, and dialogs/state cards 16px. Low-contrast borders carry most separation; neutral soft shadows are limited to primary actions, the side panel, dialogs, and the light captured-page artifact.
- First viewport: The desktop review opens as a quiet two-column workbench with a 258px receipt rail, a compact task heading, three evidence tabs, and one amber continuation action. The warm off-white captured-page preview remains the focal proof object inside the midnight shell.
- Responsive behavior: At 1000px and below the receipt rail becomes a horizontal three-stage workflow above the canvas. At 700px and below the Screen, Console, and Network tabs retain an equal three-column fit; diagnostic/error strings wrap; action groups remain contained; and the collapsed Edge cases trigger moves into the header area instead of obscuring content.
- Interaction model: Site access, chooser, recording, manual steps, stop/review, report editing, evidence selection, annotation, exact-text highlighting, removal, export preparation, success, and restart are wired into one in-memory flow. User-entered steps and report fields survive surface transitions for the life of the page.
- Shareable state: `surface` and `state` query parameters mirror the current prototype location, so normal-flow and edge-case views can be linked directly.
- Evidence behavior: Screen, Console, and Network are adjacent review tabs. Frame markup and diagnostic exact-text highlighting are separate explicit modes. Removal changes the evidence receipt and export manifest; destructive capture deletion requires confirmation; undo and recovery states remain visible where applicable.
- Edge-case policy: The state atlas covers loading, empty, failed, interrupted, permission, storage, destructive, export, RTL, zoom, reduced-motion, forced-color, and long-content cases. Its selector stays collapsed and visually secondary during the normal journey.
- Accessibility contract: Interactive controls use real button/select semantics, visible amber focus treatment, 40px core task controls, status announcements, modal labeling, reduced-motion handling, and responsive containment down to a 320px viewport. The collapsed mobile Edge cases utility is intentionally more compact at 34px.
- Prototype boundary: The UI uses illustrative synthetic evidence. It does not call extension APIs, upload data, or persist beyond the page session; production architecture remains out of scope.
- Source-of-truth captures: `.impeccable/review/desktop.png`, `.impeccable/review/user-1128.png`, and `.impeccable/review/mobile.png` reflect the shipped implementation. The earlier receipt-spine comp is provenance, not the current visual contract.
- Finish review: **Ship.** Four previously scored issues are resolved in the built artifact: controls are interactive, mobile diagnostic text wraps, mobile evidence tabs remain contained in three columns, and the mobile Edge cases control no longer covers task content.
