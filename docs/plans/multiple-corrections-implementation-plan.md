# Multiple correction reports implementation plan

## Outcome

Extend the existing correction workflow so one page can produce a batch of translation or wording corrections without repeating the export process.

The user can:

1. Select text and choose **Suggest a correction**.
2. Edit the correction in the existing side panel.
3. Choose **Add another correction**.
4. Select another passage and use the same context-menu action.
5. Repeat as needed.
6. Export all corrections and screenshots in one local ZIP.

This remains a local-only workflow and does not change the existing bug-capture session.

## Product decisions

- Replace the single correction draft with one `CorrectionCollection` containing ordered correction items.
- Keep one active correction editor in the side panel; do not render every full form at once.
- Save drafts even when the proposed text is empty. Validate all items only when exporting.
- The context-menu action appends a new correction and makes it active instead of replacing the existing collection.
- **Add another correction** puts the current item on hold and tells the user to select another passage on the page.
- Limit the first version to 20 corrections per collection.
- Export one `corrections.json` plus numbered screenshots in one ZIP.
- Keep raw JSON download as an optional secondary action.
- Keep one page per collection initially. Starting a correction on another page may update the collection page context only if the user explicitly chooses to continue; otherwise reject it with a useful message.

## Reuse map

| Need                                          | Reuse                                                     |
| --------------------------------------------- | --------------------------------------------------------- |
| Context-menu selection and screenshot capture | Existing correction path in `background.ts`               |
| Screenshot storage and cleanup                | Existing `screenshot-store.ts`                            |
| Side-panel layout and fields                  | Existing `CorrectionState` and UI primitives              |
| Locale detection                              | Existing selection metadata and locale normalization      |
| Local filtering                               | Existing correction-store/privacy filtering               |
| Runtime validation                            | Existing `capture-model` Zod schemas and runtime protocol |
| ZIP generation                                | Existing `createReportBundle` in `report-bundle.ts`       |
| JSON serialization                            | Existing correction serializer in `packages/issue-export` |
| Theme/header behavior                         | Existing side-panel and shared navbar components          |

Do not create a second correction editor, storage system, screenshot implementation, or export package.

## Data model

Add a collection schema in `packages/capture-model/src/index.ts`:

```ts
type CorrectionCollection = {
  schemaVersion: 1;
  id: string;
  page: {
    url: string;
    title: string;
  };
  activeCorrectionId: string | null;
  corrections: CorrectionReport[];
  createdAt: string;
  updatedAt: string;
};
```

Keep `CorrectionReport` as the item schema, with these small changes:

- `status: 'draft' | 'ready-for-export'` remains per item.
- `proposedText` may be empty while `status` is `draft`.
- Keep the existing screenshot blob ID on each item.
- Add an optional stable `position` or use the array order; prefer array order unless a second caller needs explicit positioning.

Validation rules:

- Collection maximum: 20 items.
- Original text remains required and filtered before persistence.
- Proposed text is allowed to be empty in drafts, but must be non-empty and different from the original during export validation.
- Every screenshot reference is optional because capture can fail; export must record the missing screenshot without failing the whole collection.
- All locale, page context, and screenshot metadata remain bounded and filtered.

## Storage and migration

Replace the single correction storage key with a collection key:

```text
reprokit:correction-collection
```

In `correction-store.ts`:

- `loadCorrectionCollection()`
- `saveCorrectionCollection()`
- `createCorrectionCollection()`
- `appendCorrection()`
- `updateCorrectionDraft()`
- `setActiveCorrection()`
- `clearCorrectionCollection()`
- `getCorrectionExportErrors()`

Migration behavior:

- On load, check the existing `reprokit:correction-report` key.
- If a legacy report exists, wrap it as a one-item collection and persist the new collection key.
- Remove the old key only after the new collection saves successfully.
- Preserve the legacy screenshot blob ID during migration.

Cleanup behavior:

- Discard/delete must delete every screenshot blob in the collection before clearing storage.
- Replacing an individual correction screenshot must delete only the old item’s blob.
- Starting a new collection must never delete an active bug-capture session.

## Context-menu flow

Update `apps/extension/entrypoints/background.ts`:

1. Keep opening the side panel synchronously from the context-menu user gesture.
2. Read the selected text, page metadata, selection context, and detected source locale.
3. Load the current correction collection.
4. If no collection exists, create one.
5. If a collection exists, require the new selection to belong to the same page origin unless the collection is empty or the user has discarded it.
6. Capture the screenshot and append a new correction item.
7. Set the new item as `activeCorrectionId`.
8. Persist the collection and let the side panel refresh through `chrome.storage.onChanged`.

Do not overwrite the currently active correction when the context-menu action is used again.

If the maximum of 20 corrections is reached, keep the current collection and show an error explaining that it must be exported or discarded before starting another batch.

## Side-panel workflow

Update `apps/extension/src/ui/sidepanel/use-correction-workflow.ts` and `sidepanel-app.tsx`.

### State

The hook should expose:

- `collection`
- `activeCorrection`
- `corrections`
- `setActiveCorrection(id)`
- `updateDraft(fields)`
- `addAnotherCorrection()`
- `exportAllCorrections()`
- `discardAllCorrections()`
- collection-level validation errors

Draft edits should be persisted through a debounced or action-triggered runtime command. The minimum safe behavior is to persist before switching items, adding another correction, or exporting.

### UI

Reuse the current correction form for the active item:

- Original text textarea
- Suggested text textarea
- Source locale
- Target locale
- Screenshot preview

Add a compact correction list or stepper:

```text
Corrections  3/20
01  Ready
02  Needs suggestion
03  Ready
```

Add actions:

- **Add another correction** — save the active draft, show a short instruction to select another passage, and keep the side panel open.
- **Export all corrections** — validate every item and export the collection.
- **Discard all** — confirm once, then delete all collection data and screenshots.

When a new context-menu selection arrives, automatically activate the new item. If the panel is in the instruction state, replace that state with the new correction form.

## Runtime protocol

Extend the discriminated runtime request schema with collection-oriented commands:

- `correction:get-collection`
- `correction:update-draft`
- `correction:set-active`
- `correction:discard-collection`

The existing single-item commands may be retained temporarily for migration compatibility, but new UI code should use collection commands.

Background responses should return the full validated collection so the side panel has one authoritative state snapshot.

## Export

In `packages/issue-export/src/index.ts`:

- Add `renderCorrectionCollectionJson(collection)`.
- Keep `renderCorrectionJson()` only as a compatibility helper if existing callers still need it.
- Export stable array ordering based on collection order.
- Include page metadata once at the top level.
- Include each item’s original/proposed text, locale, bounded context, timestamp, and screenshot filename when available.
- Include explicit `screenshotError` or omission metadata when an image was unavailable.

Example:

```json
{
  "schemaVersion": 1,
  "type": "translation-corrections",
  "page": {
    "url": "https://example.com/settings",
    "title": "Settings"
  },
  "corrections": [
    {
      "id": "…",
      "originalText": "Willkommen in unserem App",
      "proposedText": "Willkommen in unserer App",
      "locale": { "source": "de", "target": "en" },
      "screenshot": "correction-01.png"
    }
  ]
}
```

Update `createReportBundle` or add a small generic artifact-list option so it can package:

- `corrections.json`
- `correction-01.png` through `correction-20.png`

Do not create a second ZIP implementation.

Export validation should identify every incomplete item, for example:

```text
Correction 02: add suggested text.
Correction 04: suggested text must differ from original text.
```

The export button remains disabled while any item is invalid.

## Tests

Add focused tests:

- `packages/capture-model/tests/capture-model.test.ts`
  - collection schema and maximum size;
  - empty draft proposed text is accepted;
  - runtime collection commands validate.
- `apps/extension/tests/correction-store.test.ts`
  - create and append items;
  - active item changes;
  - draft updates preserve empty/incomplete items;
  - legacy single-report migration;
  - all screenshot IDs are cleaned on discard.
- `packages/issue-export/tests/issue-export.test.ts`
  - stable collection JSON ordering;
  - numbered screenshot references;
  - explicit missing-screenshot metadata;
  - export-validation error messages.
- `apps/extension/tests/correction-workflow.test.tsx`
  - item navigation;
  - add-another instruction state;
  - new context-menu correction appears as active;
  - export stays disabled until every item is valid;
  - discard removes the whole collection.
- Extend background/context-menu tests:
  - appending does not replace the previous item;
  - the 20-item limit is enforced;
  - different-page selections are rejected or require a new collection.

Existing single-correction tests should be migrated rather than duplicated.

## Implementation order

1. Add the collection schema and collection runtime commands.
2. Implement storage migration and collection cleanup.
3. Change context-menu handling from replace to append.
4. Allow draft saves with empty proposed text.
5. Update the side-panel hook and active-item editor.
6. Add correction list, add-another state, and collection validation.
7. Add collection JSON and numbered screenshot ZIP export.
8. Add tests and migrate existing correction tests.
9. Run formatting, lint, typecheck, all tests, build, and package validation.

## Verification checklist

- First correction behaves as it does today.
- Adding a second correction does not lose the first correction’s text or screenshot.
- Repeated context-menu selections append in order.
- The side panel always displays the newly selected correction.
- Switching between items preserves draft edits.
- One export contains all valid corrections and available screenshots.
- An incomplete correction prevents export with a specific error.
- Discard removes every correction and screenshot but does not affect bug captures.
- A legacy single correction remains recoverable after upgrade.

## Deferred

- Multiple pages in one collection.
- Bulk editing or applying one target locale to all items.
- Automatic duplicate detection.
- Automatic i18n-key discovery.
- Remote submission or team collaboration.
