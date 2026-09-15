# Extension UI rebuild versus in-place migration

Date: 2026-09-15  
Scope: BugReceipt's Chrome extension in `apps/extension` and the approved interactive prototype in `apps/extension/prototypes/extension-ui`.

## Decision

Replace the production UI **inside the existing extension package**, but implement the replacement as new React screens and shared UI components rather than incrementally restyling the old JSX.

This is the least-work, lowest-risk route:

- preserve the current WXT project, manifest, background worker, session schema, capture pipeline, artifact stores, exporters, permissions, release validation, and store item;
- extract the behavior currently embedded in the two large UI components into controllers/hooks where necessary;
- build the prototype's side-panel and review screens as new presentation code;
- switch the existing `sidepanel.html` and `review.html` entrypoints to the new screens;
- delete the legacy UI and CSS after behavioral parity is proven.

A separate “new extension” that imports all of the old business modules would duplicate packaging, release, manifest, entrypoint, migration, and integration work while ending with almost the same architecture. A genuinely from-scratch extension would also need to re-prove privacy filtering, recording lifecycle, interruption recovery, artifact cleanup, annotations, and export correctness. Neither variant is less work.

## Why the existing extension is a valuable foundation

The current code is not merely a visual shell. It already implements the platform-specific and failure-prone parts of the product:

- The WXT configuration defines Chrome 120+, the toolbar action, icons, side-panel support, seven required permissions, and optional HTTP/HTTPS host access. These are release behavior, not UI details. [Repository: WXT manifest configuration](../../apps/extension/wxt.config.ts#L4-L38)
- The background worker serializes runtime mutations, owns tab-navigation and tab-close interruption handling, starts sessions, injects capture instrumentation, manages recording fallbacks, and cleans up prior artifacts. [Repository: background lifecycle and protocol dispatch](../../apps/extension/entrypoints/background.ts#L47-L146)
- The capture model is already a validated contract for recordings, screenshots, up to 20 selected frames, 50 manual steps, 500 console events, 500 network events, environment details, filtering counts, and the runtime message union. [Repository: capture session schema](../../packages/capture-model/src/index.ts#L55-L115), [Repository: runtime request/response schemas](../../packages/capture-model/src/index.ts#L213-L270)
- Session mutations filter user text, URLs, request/response bodies, and diagnostics before persistence, enforce capture limits, and store only schema-valid records. [Repository: session persistence and filtering](../../apps/extension/src/application/session-store.ts#L14-L163)
- Recording, screenshots, selected frames, annotations, text annotations, diagnostic serialization, ZIP creation, and folder downloads already have dedicated application/infrastructure modules under `src/application` and `src/infrastructure`.
- Production tests already exercise the side-panel and review journeys. The two main UI test files contain approximately 1,650 lines and cover permission flow, recording, moderation, review editing, frame extraction, annotation, individual downloads, and report export. [Repository: side-panel tests](../../apps/extension/tests/popup-app.test.tsx), [Repository: review tests](../../apps/extension/tests/review-app.test.tsx)
- The release validator checks version alignment, side-panel output, required permissions, optional origins, and packaged icons. Rebuilding elsewhere would require reproducing this release contract. [Repository: package validator](../../apps/extension/scripts/validate-package.mjs#L5-L58)

WXT itself supports this replacement shape. It treats files under `entrypoints/` as build inputs, generates manifest entries from them, and supports a side-panel HTML entrypoint plus unlisted pages such as the review page. The existing entrypoints are already thin React mounts, so their rendered applications can be replaced without changing the extension topology. [WXT: Entrypoints](https://wxt.dev/guide/essentials/entrypoints)

## Where the UI and behavior are coupled

The existing modules provide strong reuse seams, but the top-level UI components are not presentation-only.

### Side panel

`PopupApp` directly performs active-tab lookup, permission checks and requests, tab chooser handling, desktop recorder startup/abort, runtime messaging, timer management, tab activation listening, and every state transition. Its imports and first state/effect block demonstrate that coupling. [Repository: current side-panel controller and UI](../../apps/extension/src/ui/popup/popup-app.tsx#L1-L73)

The new UI therefore should not copy only its JSX. First extract a `useCaptureController` (or equivalent small controller module) whose public state is based on facts such as:

- current session;
- current tab and whether it is capturable;
- current-origin access;
- pending operation;
- typed recoverable error;
- elapsed recording time.

The prototype view resolver can then render from those facts. The existing recorder and runtime calls remain unchanged.

### Review

`ReviewApp` is a 2,301-line component that imports the domain model, moderation, runtime protocol, annotation stores, recording/screenshot stores, frame capture, diagnostic exporters, ZIP/folder exporters, and annotation UI. It also owns more than 30 pieces of local UI and artifact state. [Repository: review dependencies](../../apps/extension/src/ui/review/review-app.tsx#L1-L64), [Repository: review state](../../apps/extension/src/ui/review/review-app.tsx#L84-L184)

This is the main migration risk. The practical seam is to retain or extract the existing handlers and artifact loaders, then feed them into new stage components:

1. Report
2. Evidence
3. Export check
4. Export result

The existing annotation overlay and toolbar are substantial working interaction systems and should be restyled/wrapped, not rewritten. A visual rewrite of canvas hit-testing, resize behavior, annotation history, and PNG rendering would provide no product benefit and would increase regression risk.

### Styling

The current `globals.css` is 2,562 lines and contains two visual generations: the original global rules begin at the top, while a later “Review workspace: Evidence Console” override starts at line 1643. [Repository: original tokens and base styles](../../apps/extension/src/ui/globals.css#L1-L34), [Repository: later review override](../../apps/extension/src/ui/globals.css#L1643-L1704)

The prototype should not become a third override layer. Introduce new token, primitive, side-panel, and review style files, point the new screens at them, then remove the legacy selectors and `globals.css` once the entrypoint cutover is complete.

## Prototype parity is not entirely a UI-only change

The prototype defines 35 side-panel states and 56 review states, including autosave, undoable removal, export preflight/result, storage errors, corrupt artifacts, and duplicate review handling. [Repository: prototype state atlas](../../apps/extension/prototypes/extension-ui/index.html#L784-L876)

Most are derived views over existing behavior, but four areas require deliberate behavior work:

1. **Review stages.** The current review is one workspace. Report → Evidence → Export Check should be local UI navigation, not new persistent capture statuses.
2. **Save semantics.** Current report edits are flushed before export and destructive actions. Truthful “saving/saved/save failed” feedback requires a defined save policy. Repeated autosave cannot simply call the current `updateReview`: that function adds each save's redactions to the previous cumulative total and would overcount repeated edits. [Repository: current review update accounting](../../apps/extension/src/application/session-store.ts#L170-L199)
3. **Removal and undo.** Current removal operations mutate the session immediately, and visual artifact handlers delete the corresponding IndexedDB blobs. The prototype's undo state therefore needs persisted export exclusions or a recoverable trash model; it cannot be achieved safely by presentation code alone. [Repository: current session removal mutations](../../apps/extension/src/application/session-store.ts#L202-L269), [Repository: background artifact deletion](../../apps/extension/entrypoints/background.ts#L176-L206)
4. **Typed recovery.** The worker currently returns the broad code `capture-failed` for thrown failures. Rendering reliable permission, storage, corruption, and runtime recovery cards requires stable error codes rather than matching message strings. [Repository: current error response](../../apps/extension/entrypoints/background.ts#L61-L67)

These changes are needed under either strategy. Starting a second extension does not avoid them.

## Comparison

The following is a relative estimate based on the concrete code paths above, not a calendar commitment. “1.0x” is the recommended in-place shell replacement.

| Strategy | Relative effort | Regression risk | Release/store risk | Assessment |
| --- | ---: | --- | --- | --- |
| Incrementally restyle existing JSX and append CSS | 0.8–1.0x initially | High | Low | Fastest first screenshots, but the monolith and existing layered CSS make full prototype parity hard to reason about. Likely to leave legacy UI traces. |
| **New screens in the existing extension, reusing current controllers/services** | **1.0x** | **Medium-low** | **Low** | Recommended. Clean UI implementation with the current package, extension behavior, storage, permissions, and release pipeline preserved. |
| New `apps/extension-v2` project importing/extracting existing core modules | 1.4–1.8x | Medium | Medium-high | Duplicates WXT configuration, manifest, assets, entrypoints, mocks, build scripts, package validation, and release wiring. The “shared core” extraction still has to happen. |
| True from-scratch rewrite based only on observed behavior | 2.5–4.0x | Very high | High | Reimplements and revalidates recorder lifecycle, page injection, privacy filtering, storage, cleanup, annotations, downloads, schema migration, and error recovery. No justified benefit for this redesign. |

The first option looks slightly cheaper only until the requirement “no trace of the old UI” is applied. At that point, the second option is the better total-cost choice: a clean-slate presentation implementation with an in-place platform/core migration.

## Extension identity and Chrome Web Store implications

If BugReceipt is already a Chrome Web Store item, the redesign should be uploaded as a new version of that existing item. Chrome's official process requires a higher manifest version and a new complete package; after review it updates the existing user base. Creating another Web Store item creates a separate listing and install identity rather than upgrading existing users. [Chrome: Update your Chrome Web Store item](https://developer.chrome.com/docs/webstore/update)

Chrome also prohibits multiple extensions from the same developer that provide duplicate experiences, except clearly labeled test/production variants and narrow exceptions. A second public “new BugReceipt” alongside the current one therefore adds policy risk as well as user-migration work. [Chrome Web Store: repetitive content policy](https://developer.chrome.com/docs/webstore/program-policies/spam-faq)

For local/unpacked development, Chrome documents the manifest `key` mechanism for maintaining a consistent extension ID. Store updates should remain attached to the existing dashboard item; a separately created item receives a different identity. [Chrome: Keep a consistent extension ID](https://developer.chrome.com/docs/extensions/reference/manifest/key)

Preserving the existing package also minimizes migration risk for extension-owned storage and IndexedDB because the update runs under the same extension origin. The extension service worker receives update lifecycle events, and Chrome recommends persistent storage rather than service-worker globals because workers can terminate. [Chrome: Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)

Avoid adding permissions during the redesign unless a prototype action truly requires a new capability. Chrome warns that an update adding a warning-triggering permission can disable the extension until the user accepts it. The current manifest already has the permissions needed for the implemented capture, side-panel, storage, clipboard, and download workflow. [Chrome: Permission warning guidelines](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings), [Repository: current permissions](../../apps/extension/wxt.config.ts#L14-L24)

The repository currently states that version 0.1.6 is distributed as an unpacked GitHub release and does not claim a public Chrome Web Store listing. That conflicts with the stated operational fact that an older extension is published. Before release work, confirm the actual Web Store item ID, production version, signing/upload arrangement, and whether this repository exactly matches the submitted source. [Repository: recorded distribution status](../../PRODUCT.md#L57-L63)

## Recommended migration shape

### Phase 1: freeze and characterize existing behavior

- Treat the current UI tests as a behavioral inventory, not a markup contract.
- Add missing tests around interruption, artifact cleanup, failed storage, and export composition before moving handlers.
- Record a package manifest and exported ZIP from the current release as comparison fixtures.

### Phase 2: establish reusable controllers

- Extract the side-panel capture operations and state derivation from `PopupApp`.
- Split review orchestration into report, artifact, annotation, exclusion, and export controllers/hooks.
- Keep `background.ts`, message schemas, artifact stores, privacy filtering, and exporters as the authoritative core.
- Fix redaction accounting before enabling repeated autosave.
- Add persisted exclusions if undoable removal remains part of the approved prototype.

### Phase 3: build the new UI alongside the old UI

- Port the prototype's light/dark tokens and shared primitives.
- Implement the new side-panel and staged review screens against the controllers.
- Use real session data and artifact components; do not port the prototype's mock state machine or synthetic evidence.
- Keep a development-only state gallery for visual edge-state verification.

### Phase 4: switch the existing entrypoints

- Change only the React applications mounted by the existing side-panel and review entrypoints. Those entrypoints already contain little more than the CSS import and root render. [Repository: side-panel mount](../../apps/extension/entrypoints/sidepanel/main.tsx#L1-L15), [Repository: review mount](../../apps/extension/entrypoints/review/main.tsx#L1-L13)
- Preserve `sidepanel.html`, `review.html`, `background.js`, manifest permissions, extension name, and package identity.
- Run old-versus-new behavioral comparisons using the same stored session fixtures and exports.

### Phase 5: remove legacy presentation code

- Delete the old `PopupApp`, old `ReviewApp` markup, and legacy global selectors only after the new tests pass.
- Retain working annotation interaction components unless a verified prototype requirement demands behavioral change.
- Build and validate the final package through the existing `check`, `zip`, and package-validation scripts. WXT officially supports producing and submitting new ZIP versions from the same project. [WXT: Publishing](https://wxt.dev/guide/essentials/publishing.html)

### Phase 6: release as an update

- Confirm the production Web Store item and increment from its actual published version, not only the repository's version.
- Compare generated permissions with the currently published manifest.
- Submit the package to the existing item, use deferred or staged publishing where available, and monitor capture-start, stop, review-load, and export failures after rollout.

## Final recommendation

Do **not** create a separate extension project and do **not** rewrite the business logic. Create a new UI implementation inside `apps/extension`, using the prototype as the visual/state contract and the current extension as the platform and business-logic contract.

This approach provides the clean-slate result the redesign needs while retaining the hardest, already-tested work and the safest path to updating installed users. Architecturally, it is a controlled shell replacement:

```text
existing manifest + entrypoints + worker + storage + capture + export
                              |
                    extracted UI controllers
                              |
             new prototype-based side panel and review UI
```

## Primary sources

- [BugReceipt WXT configuration](../../apps/extension/wxt.config.ts)
- [BugReceipt background worker](../../apps/extension/entrypoints/background.ts)
- [BugReceipt capture model](../../packages/capture-model/src/index.ts)
- [BugReceipt session store](../../apps/extension/src/application/session-store.ts)
- [BugReceipt side-panel application](../../apps/extension/src/ui/popup/popup-app.tsx)
- [BugReceipt review application](../../apps/extension/src/ui/review/review-app.tsx)
- [BugReceipt prototype](../../apps/extension/prototypes/extension-ui/index.html)
- [BugReceipt product truth](../../PRODUCT.md)
- [WXT: Entrypoints](https://wxt.dev/guide/essentials/entrypoints)
- [WXT: Publishing](https://wxt.dev/guide/essentials/publishing.html)
- [Chrome: Update your Chrome Web Store item](https://developer.chrome.com/docs/webstore/update)
- [Chrome: Keep a consistent extension ID](https://developer.chrome.com/docs/extensions/reference/manifest/key)
- [Chrome: Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Chrome: Permission warning guidelines](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings)
- [Chrome Web Store: repetitive content policy](https://developer.chrome.com/docs/webstore/program-policies/spam-faq)
