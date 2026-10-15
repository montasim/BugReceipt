# Translation correction workflow implementation plan

## Outcome

Add a second workflow to the existing BugReceipt Chrome extension:

1. A user selects text on any HTTP/HTTPS page.
2. The user chooses **Suggest a correction** from the browser context menu.
3. BugReceipt opens the existing side panel with the selected text and page context.
4. The user enters the proposed wording and optionally confirms the locale.
5. BugReceipt captures one visible-viewport screenshot with the selected area marked when possible.
6. The user reviews the correction and exports a ZIP containing `correction.json` and `correction.png`.

This is a local-only, single-selection report. It does not upload data, create an issue, inspect project i18n files, or change the existing bug-capture workflow.

## Decisions for the first version

- Keep correction reports separate from `CaptureSession`; the existing session is a long-running recording state machine and should not be overloaded.
- Allow one correction draft at a time, independently of a bug capture. Never overwrite an active capture session.
- Capture the visible viewport, not a stitched full-page screenshot. The existing extension already treats `captureVisibleTab` as its screenshot boundary.
- Capture one selected passage per correction report. Multiple corrections can be exported as separate reports.
- Make locale metadata optional. Arbitrary websites will not reliably expose their i18n locale.
- Export a ZIP by default, reusing the existing report-bundle path. Also offer raw JSON download for developers who do not need the image.

## Reuse map

Use existing code instead of introducing parallel infrastructure:

| Need                               | Reuse                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Side-panel shell and layout        | `SidePanelApp`, `Brand`, `SupportLink`, existing state switching                                                                       |
| Form controls and feedback         | `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `Textarea`, `Input`, `Select`, `Button`, `Card`, `Alert`, `Spinner`, `Sonner` |
| Runtime message validation         | `packages/capture-model` Zod schemas and `sendRuntimeMessage`                                                                          |
| Local text/privacy filtering       | `@bugreceipt/privacy` through a correction-specific session-store function                                                             |
| Page metadata                      | `withTabMetadata` / `getTabWithMetadata`                                                                                               |
| Screenshot persistence             | `screenshot-store.ts` and existing IndexedDB blob lifecycle                                                                            |
| Local artifact packaging           | `report-bundle.ts` and `JSZip`                                                                                                         |
| Deterministic export formatting    | `packages/issue-export`; add a correction serializer there                                                                             |
| Existing review/export conventions | `review-app.tsx` naming, validation, download helpers, and delete/discard patterns                                                     |

Do not add a new UI library, storage library, state library, or export package.

## Data model

Add a versioned `CorrectionReport` to `packages/capture-model/src/index.ts`:

```ts
type CorrectionReport = {
  schemaVersion: 1;
  id: string;
  status: 'draft' | 'ready-for-export';
  originalText: string;
  proposedText: string;
  locale?: { source?: string; target?: string };
  page: {
    url: string;
    title: string;
    capturedAt: string;
    screenshotBlobId?: string;
    screenshotError?: string;
  };
  context?: {
    before?: string;
    after?: string;
    element?: string;
    selector?: string;
    rect?: { x: number; y: number; width: number; height: number };
  };
  environment?: { userAgent: string; platform: string; reproKitVersion: string };
};
```

Rules:

- `originalText` comes from Chrome's context-menu `selectionText` and is filtered before persistence.
- `proposedText`, locale, surrounding text, and selector are filtered/validated before persistence.
- Keep context bounded; do not store full HTML, DOM snapshots, cookies, form values, or page storage.
- `selector` and `rect` are helpful hints only, never the sole way to identify the text later.
- Store the report separately from `reprokit:capture-session`, using a dedicated session key so a correction cannot replace a capture.
- Store screenshot bytes in the existing screenshot IndexedDB store and retain only the blob ID in the report.

## Runtime flow

### Context-menu entry

In `apps/extension/entrypoints/background.ts`:

- Create one context-menu item during `chrome.runtime.onInstalled` and on worker startup if missing.
- Use `contexts: ['selection']` and a clear label such as **Suggest a correction**.
- On click, validate `tab.id`, `tab.windowId`, `selectionText`, and an HTTP/HTTPS URL.
- Create a correction draft with the selected text and page metadata.
- Use a short-lived page script to read the current selection range, bounded surrounding text, element tag, and rectangle. Treat all returned values as untrusted and validate them with the shared schema.
- Capture the visible tab immediately while the selection is still stable. If the highlight path fails, retain the screenshot without a highlight and record a non-fatal screenshot warning.
- Open the existing side panel with `chrome.sidePanel.open({ tabId })`.

Add only the permissions required for this flow to `apps/extension/wxt.config.ts`:

- `contextMenus`
- `scripting`

Keep `host_permissions` empty. Continue relying on the existing `activeTab` grant from the user gesture.

### Side-panel correction mode

In `apps/extension/src/ui/sidepanel/sidepanel-app.tsx`:

- Read both `session:get` and a new `correction:get` during initialization.
- Render a small mode switch/state branch before the current capture states:
  - `correction draft` → correction form
  - no correction → existing capture UI unchanged
- Reuse the current header, cards, fields, buttons, alerts, loading state, and support link.
- Show the original text as read-only, the proposed text as a textarea, optional source/target locale inputs, and a compact page URL/title/screenshot preview.
- Validate that proposed text is non-empty and different from the original text.
- Use the existing offensive-language validation hook for user-entered proposed text.
- Provide **Export correction**, **Discard**, and **Open page** actions. Do not add a new review page for this one-screen workflow.

Add correction actions to `apps/extension/src/ui/sidepanel/use-capture-workflow.ts` only if keeping them there remains readable; otherwise create a small sibling hook such as `use-correction-workflow.ts` that uses the same runtime protocol and UI conventions. Do not duplicate screenshot or download helpers.

### Background commands

Extend the discriminated runtime protocol in `packages/capture-model/src/index.ts` and handle it in `background.ts`:

- `correction:get`
- `correction:update`
- `correction:exported` only if export lifecycle cleanup needs a background command
- `correction:discard`

Keep screenshot deletion and report cleanup in one background-owned correction store function, mirroring the current capture cleanup behavior. Export itself can remain in the side panel because Blob downloads already originate from the UI.

## Export

In `packages/issue-export/src/index.ts` add a deterministic `renderCorrectionJson(report)` function. It should:

- return stable, pretty-printed JSON;
- include `schemaVersion`, original/proposed text, optional locale, page metadata, bounded context, timestamp, and screenshot filename;
- omit absent optional values rather than emitting misleading empty structures;
- never include raw DOM HTML or unfiltered page data.

In the side-panel export handler:

1. Validate the draft and run the existing text privacy filter one final time.
2. Read the screenshot blob through `screenshot-store`.
3. Create `correction.json` and `correction.png` entries with `createReportBundle`.
4. Start a local download using the existing Blob download pattern.
5. Keep the draft until the user explicitly chooses **Delete correction** or **Discard**, matching the current review safety boundary.

Offer a second **Download JSON only** action using the same serializer. Do not create a second ZIP implementation.

## Files to touch

Expected implementation surface:

- `apps/extension/wxt.config.ts` — add the two permissions.
- `apps/extension/entrypoints/background.ts` — context menu, selection metadata, screenshot capture, correction commands.
- `apps/extension/src/application/protocol.ts` — no new logic; continue parsing the shared schema.
- `apps/extension/src/application/correction-store.ts` — new small store module for the separate correction draft.
- `apps/extension/src/ui/sidepanel/sidepanel-app.tsx` — correction mode and form, reusing existing primitives.
- `apps/extension/src/ui/sidepanel/use-correction-workflow.ts` — only if extracting the correction state keeps the existing capture hook focused.
- `packages/capture-model/src/index.ts` — correction schema and runtime request/response variants.
- `packages/issue-export/src/index.ts` — correction JSON serializer.
- `apps/extension/src/infrastructure/report-bundle.ts` — only if the existing filename union needs `correction.png` support.
- `README.md` and `PRODUCT.md` — document the new local correction workflow and privacy limits after implementation.

Do not modify the existing capture session schema or rewrite `review-app.tsx` unless a shared helper is genuinely required.

## Tests

Add focused tests beside existing tests:

- `packages/capture-model/tests/correction-model.test.ts`
  - valid/invalid correction shapes;
  - bounds on text/context/rect values;
  - runtime command parsing.
- `packages/issue-export/tests/issue-export.test.ts`
  - stable correction JSON;
  - omission of absent optional fields;
  - escaping and filtered values.
- `apps/extension/tests/correction-store.test.ts`
  - create, update, load, discard;
  - separate storage key from capture session;
  - screenshot cleanup.
- `apps/extension/tests/context-menu-correction.test.ts`
  - selection menu registration;
  - unsupported pages and empty selections are rejected;
  - side-panel open receives the correct tab.
- `apps/extension/tests/correction-workflow.test.tsx`
  - original text is read-only;
  - proposed text validation;
  - export/discard actions use the runtime protocol.
- Extend the existing package/build validation to assert `contextMenus` and `scripting` are declared and no host permissions are introduced.

The existing capture tests must continue to pass unchanged; specifically verify that a correction cannot clear or alter an active `CaptureSession`.

## Implementation order

1. Add the correction schema, storage key, and protocol variants.
2. Add pure correction JSON serialization and tests.
3. Add context-menu registration and selection metadata capture.
4. Add screenshot capture and cleanup, with a no-highlight fallback.
5. Add the side-panel correction mode using existing components.
6. Add ZIP/raw JSON download actions using existing export helpers.
7. Add tests, update permissions validation, and run the full extension check.
8. Update product/readme documentation only after the behavior is verified.

## Verification checklist

- Existing capture start/record/stop/review/export behavior is unchanged.
- Selecting text on a normal HTTP/HTTPS page creates a correction draft and opens the side panel.
- Empty selections, restricted pages, and unsupported URLs fail with a useful message.
- The screenshot is captured once at selection time and does not silently include a second page state.
- Closing/reopening the side panel does not lose the correction draft.
- Discard removes both report state and screenshot bytes.
- Export contains only filtered, user-reviewable correction data.
- No upload, host permission, account, or remote issue creation is introduced.
- `pnpm --filter @bugreceipt/extension check` and the relevant package tests pass.

## Explicitly deferred

- Full-page stitched screenshots.
- Multiple selected passages in one report.
- Automatic locale detection from page internals.
- Automatic i18n-key discovery or source-code edits.
- Direct GitHub/Linear submission.
- Backend storage, team inboxes, or analytics.
- Cross-browser support.
