---
version: 1
slug: 'apps-extension-src-ui-review-review-app-tsx'
primary_target: 'apps/extension/src/ui/review/review-app.tsx'
related_targets: ['apps/extension/src/ui/globals.css']
---

mode: Operate
direction: Evidence Console

The review page is a post-capture workbench for a QA reporter. Its primary task sequence is: verify the issue description, inspect the recording, capture and annotate a decisive frame, inspect diagnostics when needed, and export a local report.

Preserve BugReceipt's Evidence Desk palette, typography, square geometry, privacy boundaries, report fields, artifacts, diagnostics, annotation behavior, and export actions. Replace the marketing-style hero and vertically scattered cards with a compact sticky command bar, a persistent report inspector, one dominant visual-evidence studio, and compact diagnostics navigation.

The primary download action opens a compact two-choice menu: save every unzipped report file into one user-selected folder through a single directory picker, or download the existing ZIP bundle. Report edits are applied automatically when an export or share action starts; do not add a separate local-save action or saved-state badge.

On wide screens, use an asymmetric workspace: the issue-report inspector stays sticky beside a dominant, integrated recording → frame capture → selected-frame annotation studio, with tabbed console and network evidence below. At 980px and below, move evidence ahead of the full report editor and provide a compact issue-report verification link into that editor. On mobile, keep export controls visible, stack dense editing controls when needed, and preserve touch-safe action targets.

Success means the recording and frame workflow dominate the first viewport, export is always findable, report edits remain close at hand, empty diagnostics do not consume whole screens, and the layout structurally adapts from wide desktop to mobile without hiding evidence or actions.
