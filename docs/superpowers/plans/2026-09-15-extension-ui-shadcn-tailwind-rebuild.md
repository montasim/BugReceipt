# Extension UI ShadCN and Tailwind Rebuild Plan

Date: 2026-09-15

Status: Implemented locally; Chrome update/install verification and store release remain

Target: `apps/extension`

## Goal

Replace the side-panel and review UI with the approved prototype while keeping the working extension engine: manifest, permissions, background worker, capture, privacy filtering, storage, annotations, downloads, and exports.

Use:

- React 19;
- Tailwind CSS 4 for all visual styling;
- locally owned ShadCN UI components for interactive controls;
- the current WXT project and Chrome Web Store identity.

Do not create `extension-v2`. Do not rewrite working business logic. Delete the old UI and CSS after the replacement passes the existing behavioral tests.

## Precise UI rule

Feature code must not render a raw interactive element when ShadCN supplies the behavior:

| Raw pattern | Use |
| --- | --- |
| `button` | `Button` |
| `input`, `textarea`, label/error wrappers | `Input`, `Textarea`, `Field` |
| `select` | `Select` |
| tab buttons | `Tabs` |
| download menu | `DropdownMenu` |
| destructive confirmation | `AlertDialog` |
| ordinary modal | `Dialog` |
| notice/error box | `Alert` |
| interactive `details` | `Collapsible` |
| icon button help | `Tooltip` |
| status/count | `Badge` |
| loading/progress | `Skeleton`, `Spinner`, `Progress` |
| export manifest | `Table` |
| transient success/undo | `Sonner` |

Native semantic and media elements remain where they are correct: `main`, `nav`, `section`, headings, paragraphs, lists, `form`, `video`, `canvas`, and images. ShadCN itself renders semantic HTML, so replacing every HTML tag is neither possible nor desirable.

## Styling rule

- Keep one framework stylesheet: `src/ui/tailwind.css`.
- It may contain Tailwind/ShadCN/font imports and the prototype's semantic light/dark tokens.
- It must not contain feature selectors or page-specific CSS.
- Put layout, spacing, type, responsive, hover, focus, and state styling in Tailwind classes.
- Use semantic tokens instead of scattered hex values.
- Use native `prefers-color-scheme` for automatic light/dark mode; do not add a theme provider or settings store.
- Allow computed inline styles only for annotation coordinates and other runtime geometry Tailwind cannot know.

## Minimal structure

```text
apps/extension/
  components.json
  src/
    components/ui/              # only ShadCN components actually used
    lib/utils.ts                # cn helper
    ui/
      tailwind.css
      brand.tsx                 # keep and restyle the existing brand module
      sidepanel/
        sidepanel-app.tsx
        use-capture-workflow.ts
      review/
        review-app.tsx
        use-review-workflow.ts
        report-stage.tsx
        evidence-stage.tsx
        export-stage.tsx
        existing annotation files
```

Do not create a wrapper for every ShadCN component. Add a shared BugReceipt composition only after it is used in both surfaces or hides real behavior.

## Workflow seam

The current UI files mix JSX with orchestration. Extract one hook per surface while replacing it:

```text
SidePanelApp -> useCaptureWorkflow -> existing recorder and runtime messages
ReviewApp    -> useReviewWorkflow  -> existing session, artifacts, annotations, exports
```

The hooks own operation ordering, pending state, and errors. Stage components receive data and callbacks. Do not create generic browser interfaces or separate capture/report/export controller hierarchies unless a second implementation appears.

## Task 1 — Establish the baseline and ShadCN foundation

**Status:** Foundation complete for the side-panel slice. The review entry point remains on the
legacy stylesheet until Task 3, so the two visual systems never load into the same page.

**Modify:**

- `apps/extension/package.json`
- `apps/extension/tsconfig.json`
- `apps/extension/wxt.config.ts`
- `apps/extension/entrypoints/sidepanel/main.tsx`
- `apps/extension/entrypoints/review/main.tsx`

**Add:**

- `apps/extension/components.json`
- `apps/extension/src/lib/utils.ts`
- `apps/extension/src/ui/tailwind.css`
- the first required files under `apps/extension/src/components/ui`

- [x] Run the existing extension tests and build before changing the UI.
- [ ] Save one deterministic export for later comparison.
- [x] Initialize ShadCN inside `apps/extension` with Tailwind 4 and React 19 support.
- [x] Use direct relative imports; an alias added configuration without improving this two-surface app.
- [x] Add only the ShadCN primitives used by the migrated side panel.
- [x] Create the Tailwind entry file with the approved light/dark tokens and fonts.
- [x] Switch both entrypoints from `globals.css` to `tailwind.css` only when the first migrated screen is ready.

**Check:** ShadCN renders correctly in both extension pages and the package still builds.

## Task 2 — Replace the side panel as the first vertical slice

**Status:** Complete. The compatibility export remains only so the established behavioral tests can
exercise the new side panel through their existing import path.

**Replace:** `apps/extension/src/ui/popup/popup-app.tsx`

**Add:** `sidepanel-app.tsx` and `use-capture-workflow.ts`

- [x] Move the current tab lookup, permission flow, chooser, recorder startup, timer, runtime commands, and recovery handling into `useCaptureWorkflow` without changing their behavior.
- [x] Build the approved side-panel states with ShadCN and Tailwind: loading, access required, denied, unsupported page, chooser, starting, recording, interruption, stopping, ready for review, and failure.
- [x] Add `Textarea` and `Field` for manual steps.
- [x] Add `AlertDialog` for discard confirmation.
- [x] Use icon-only `Button` plus `Tooltip` where the prototype specifies icon-only actions.
- [x] Preserve start, add-step, stop, return-to-tab, discard, and open-review behavior.
- [x] Update the current popup tests to query roles, labels, and outcomes instead of legacy copy or classes.

**Check:** all existing side-panel tests pass; the narrow and short panel states work in light and dark mode; feature code contains no raw interactive tags.

## Task 3 — Replace the review shell and Report stage

**Replace:** the shell/report portion of `apps/extension/src/ui/review/review-app.tsx`

**Add:** `use-review-workflow.ts` and `report-stage.tsx`

- [x] Keep the proven review orchestration in the existing review module; extracting a pass-through hook was skipped because it would not change behavior or reduce complexity.
- [x] Add the prototype's receipt rail and local Report -> Evidence -> Export Check stage state. Do not change `CaptureSession.status`.
- [x] Build report fields with `Field`, `Input`, and `Textarea`.
- [x] Reuse current validation and moderation logic.
- [x] Save before stage changes, removal, copy, and export. Add debounced autosave only if the approved UI displays live saved status.
- [x] Fix redaction accounting before allowing repeated saves so counts cannot grow from saving the same content twice.
- [x] Use `Alert` for validation/save failures and `AlertDialog` for permanent capture deletion.
- [x] Derive receipt counts from the real session, never prototype constants.

**Check:** report edits, validation, deletion confirmation, and current export-preparation tests pass through the new hook.

## Task 4 — Move existing evidence and annotation behavior into the new stage

**Add:** `evidence-stage.tsx`

**Retain:** existing annotation model, overlay, rendering, stores, video-frame logic, and exporters.

- [x] Use `Tabs` for Visual, Console, and Network.
- [x] Use `Card`, `Alert`, and ShadCN empty/loading patterns for artifact states.
- [x] Keep the native video player and current frame-capture behavior.
- [x] Restyle the existing annotation overlay with Tailwind; do not rewrite coordinate conversion, hit testing, history, resizing, or PNG rendering.
- [x] Replace annotation toolbar controls with `ToggleGroup`, `Select`, `Button`, and `Tooltip`.
- [x] Preserve individual video, image, JSON, and HAR downloads.
- [x] Keep browser text selection working in console/network evidence; use `ScrollArea` only if it does not interfere.
- [x] Add only the missing keyboard alternative required for an annotation action; do not create a second annotation system.

**Check:** frame limit, frame navigation, annotation save/export, console JSON, network HAR, missing artifact, and empty evidence tests pass.

## Task 5 — Add only the prototype behaviors the old engine lacks

**Add:** `export-stage.tsx` and the minimum persistence changes required by the approved interactions.

- [x] Implement reversible evidence exclusion because current removal permanently deletes artifacts. Store the exclusion set with the session and omit excluded evidence from complete exports.
- [x] Use `Sonner` for Undo. Use `AlertDialog` only for whole-capture deletion or removal that invalidates dependent annotations.
- [x] Build the Export Check manifest from actual included evidence with `Table`, `Badge`, and `Alert`.
- [x] Connect the existing folder, ZIP, Markdown, JSON, HAR, image, and video operations.
- [x] Show preparing, failure, retry, and success states.
- [ ] Add stable error codes only for failures that need different recovery actions. Do not build a general error framework.
- [x] Connect “Open downloads”; starting another capture remains in the side panel so a review cannot silently discard the current capture.

**Check:** Undo works across the agreed review lifetime; excluded evidence is absent from export; an unchanged report produces the same files as the baseline fixture.

## Task 6 — Remove the old UI and enforce the rule

- [x] Point the existing side-panel and review entrypoints only at the new applications.
- [x] Delete the legacy `PopupApp` and legacy `ReviewApp` markup after parity tests pass.
- [x] Delete `globals.css`; do not leave an unused legacy stylesheet.
- [x] Remove unused helpers, classes, icons, dependencies, and markup-specific tests.
- [x] Add ESLint `no-restricted-syntax` rules for raw `button`, `input`, `textarea`, `select`, `dialog`, and interactive `details` in feature UI files, excluding `components/ui`.
- [x] Search the production source and built package for legacy selectors, rejected copy, prototype state controls, fixed prototype counts, and synthetic evidence.

**Check:** no old UI path remains and no prohibited raw interactive element appears in feature code.

## Task 7 — Final verification and release

- [x] Run lint, type checking, tests, build, ZIP creation, and package validation.
- [ ] Manually run one complete Chrome journey: access, capture, steps, stop, report, frames, annotations, removals, individual downloads, folder export, ZIP export, Undo, and delete.
- [x] Inspect the final side panel and review page once in light and dark mode at representative widths; fix the findings in one batch and confirm once.
- [ ] Test updating over the actual published version with existing extension data.
- [x] Confirm permissions did not expand unintentionally.
- [ ] Release through the existing Chrome Web Store item using a version higher than the currently published version.

## Testing rule

- Keep the existing behavioral tests and change only assertions tied to old presentation.
- Add one focused test for each genuinely new branch: stage navigation, repeated-save accounting, exclusion/Undo, export manifest, and typed recovery.
- Test through roles, labels, actions, and exported results—not ShadCN internals or Tailwind class strings.
- Do not duplicate workflow tests at every child component.

## Done when

- The two production surfaces match the approved prototype in automatic light and dark mode.
- Feature styling uses Tailwind utilities and the single theme entry file; there is no feature CSS.
- ShadCN owns every applicable interactive primitive in feature code.
- Existing capture, privacy, storage, annotation, individual download, and complete export behavior still works.
- The prototype's real actions and recovery states are wired to production data.
- The state desk, mock data, old JSX, old selectors, and `globals.css` are gone.
- The build updates the existing extension rather than creating a second product.

## Deliberately skipped

- A shared monorepo UI package: only the extension consumes these components.
- The full ShadCN registry: add a component only when a migrated screen uses it.
- React Hook Form: existing controlled form state and Zod validation already work.
- A JavaScript theme provider: native `prefers-color-scheme` is sufficient.
- Separate controllers for report, artifacts, annotations, removal, and export: one review workflow hook is enough until it becomes measurably difficult to maintain.
- A new annotation engine: the existing one already implements the hard behavior.
- A second extension project or store listing.

## References

- [Approved prototype](../../../apps/extension/prototypes/extension-ui/index.html)
- [Migration research](../../research/extension-ui-rebuild-vs-in-place-migration.md)
- [Current side panel](../../../apps/extension/src/ui/popup/popup-app.tsx)
- [Current review page](../../../apps/extension/src/ui/review/review-app.tsx)
- [ShadCN Vite installation](https://ui.shadcn.com/docs/installation/vite)
- [ShadCN Tailwind 4 support](https://ui.shadcn.com/docs/tailwind-v4)
- [ShadCN theming](https://ui.shadcn.com/docs/theming)
