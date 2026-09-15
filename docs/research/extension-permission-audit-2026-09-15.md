# Chrome extension permission audit

Date: 2026-09-15. Scope: current BugReceipt source and generated extension package. Requirement: preserve existing functionality, including error recovery and data lifetime. This audit does not remove production permissions.

## Decision

The current source and generated manifest both declare **seven permissions**, not eight. There are no optional permissions or host permissions. An installed browser copy was not inspected; it may differ from the local build.

**`tabs` is the strongest removal candidate.** The existing `debugger` permission can provide the URL, title, and tab ID through `chrome.debugger.getTargets()` before attachment. This is a better replacement than relying on `activeTab` alone and was verified in isolated Chromium. Production integration and complete workflow verification remain outstanding: this is evidence for implementing the replacement, not a claim that deleting the manifest entry is safe today.

No permission is unused in the current implementation. Under a strict requirement to preserve all behavior, keep the other six for now. Some have substitutes, but those introduce differences or unverified recovery behavior.

## Complete permission inventory

Paths below are relative to the repository root.

| Permission       | Current use and source                                                                                                                                                                                                                     | Replacement investigated                                                                                                                  | Conclusion                                                                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`           | `src/ui/sidepanel/use-capture-workflow.ts` reads active-tab URL; `entrypoints/background.ts` gets the tab at start/stop; `src/application/session-store.ts` requires URL at startup and records URL/title. All under `apps/extension/`.    | Use permission-free tab queries for ID/window/active state, then match `chrome.debugger.getTargets()` by numeric tab ID for URL/title.    | Recommended candidate. Metadata before attachment and after navigation passed. Requires integration and race/error tests.                                                                                                                                                    |
| `activeTab`      | `apps/extension/entrypoints/background.ts`: final screenshot via `chrome.tabs.captureVisibleTab`. It can also supply temporary metadata access.                                                                                            | `Page.captureScreenshot` over the existing debugger, with viewport-only capture.                                                          | Screenshot API passed without this permission. Keep to preserve a fallback independent of debugger attachment; detachment/restrictions can make substitutes unavailable.                                                                                                     |
| `desktopCapture` | `apps/extension/src/ui/sidepanel/use-capture-workflow.ts`: tab-only chooser; `src/infrastructure/desktop-recorder.ts`: consume the stream with `getUserMedia`, then `MediaRecorder`.                                                       | Standard `getDisplayMedia`, returning a stream directly. `tabCapture` is another option but substitutes a different extension permission. | Plausible future removal, not verified equivalent. Picker choices, focus/user activation, cancellation, selected-tab identity, and stream lifecycle need testing.                                                                                                            |
| `downloads`      | `apps/extension/src/infrastructure/report-folder-download.ts`: write multiple files beneath a named Downloads subfolder with collision handling. `src/ui/review/review-app.tsx`: open the default Downloads folder in the OS file manager. | Ordinary download links for single files; File System Access directory picker for a report folder.                                        | Keep for current behavior. Links already handle individual files/ZIP, but do not replace folder placement or opening the OS Downloads folder. A directory picker adds a different consent/location flow.                                                                     |
| `storage`        | `apps/extension/src/application/session-store.ts`: get/set/remove capture state using `chrome.storage.session`.                                                                                                                            | IndexedDB, already used for media and annotations.                                                                                        | Technically replaceable for storing data, but not a direct behavior match. Session data currently lives in memory and clears on browser restart/extension reload; IndexedDB is persistent. Retention, migration and worker-restart handling would require a separate design. |
| `sidePanel`      | `apps/extension/entrypoints/background.ts`: configure the native side panel; background/workflow close it for review.                                                                                                                      | Popup, separate window, or page overlay.                                                                                                  | Keep. Alternatives change the persistent native side-panel feature.                                                                                                                                                                                                          |
| `debugger`       | `apps/extension/src/infrastructure/debugger-recorder.ts`: attach/send commands/detach; background dispatches events. Captures console, network, frames/workers, bodies and failures.                                                       | Page instrumentation, webRequest, or a DevTools-only extension page.                                                                      | Keep. None is an equivalent replacement for the existing browser-level capture across contexts without changing behavior or adding permissions.                                                                                                                              |

Other API uses—runtime messaging/manifest/version, action badges, windows focus, tab creation/focusing and tab activation/removal listeners—do not add separate manifest permission requirements for their current calls. Merely using `chrome.tabs` does not require the `tabs` permission. [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs)

## Verified browser probes

Environment: Google Chrome for Testing 151.0.7922.34, isolated fresh profile, synthetic local HTTP pages. Temporary extension copy declared only `debugger` and `sidePanel`. Production source and production manifest were not changed. Tests used extension-context API calls, not browser automation to bypass the permission checks being tested.

Passed:

- `chrome.tabs.get` omitted URL/title without `tabs` or an active grant, confirming the metadata restriction.
- `chrome.debugger.getTargets()` returned the matching tab's URL and nonempty title **before attaching**.
- The same metadata lookup reflected a path/query change and navigation from `127.0.0.1` to `localhost` (a different origin).
- Console and network events continued through the debugger on both navigations.
- `Page.captureScreenshot` returned PNG data on both origins without `activeTab`.
- Tab creation, focusing and the tab-closure event worked without `tabs`.
- IndexedDB write/read worked without `storage`.
- `getDisplayMedia` and `showDirectoryPicker` were exposed as functions without their extension-specific counterparts. This checks availability only, not successful capture or directory selection.

The browser probe log is saved alongside this report. Earlier testing of the unmodified code with only `tabs` removed produced `The active tab cannot be captured` when no fresh activeTab grant existed. That failure is caused by the current URL dependency; it does not show that the debugger metadata replacement is impossible.

An additional attempt to run the full existing recording harness against a temporary metadata adapter did not complete within the audit's time limit. It is not counted as a pass. No successful end-to-end video, native chooser, screenshot failure recovery, browser restart, minimum-version Chrome 125, or installed Brave test is claimed.

## Recommended implementation: seven to six

Replace the tab metadata dependency, then remove `tabs` only after the checks below pass:

1. Introduce one metadata reader that uses `tabs.get/query` for tab identity and `debugger.getTargets` for URL/title. Match by tab ID, never by URL/title, since duplicate tabs are valid.
2. Use it in the side-panel startup check and background start/stop paths. No early debugger attachment or renewed activeTab grant should be needed merely to read metadata.
3. Preserve HTTP/HTTPS and restricted-page validation. Handle missing/loading targets and tab closure explicitly; never attach to a different tab as a fallback.
4. Keep metadata current when the active tab navigates without being switched. Preserve existing URL/text privacy filters before saving and exporting.
5. Test fresh startup, switching tabs with the panel open, query/hash changes, reloads, cross-origin navigation, duplicate URLs, stop/review/export metadata, closed tabs, and debugger detachment. Test video and the existing screenshot fallback in the normal UI.
6. Change the source manifest and package validator together; rebuild and inspect the generated manifest.

Expected six-permission set after successful implementation: `activeTab`, `desktopCapture`, `debugger`, `downloads`, `sidePanel`, `storage`.

Do not present this as a proven universal minimum. Removing further permissions depends on whether the alternatives can preserve the existing picker, folder-opening, temporary-storage, and recovery behavior.

## Why the other workarounds are not equivalent yet

**Screenshots:** the debugger supports the Page domain and screenshot command, and the probe succeeded. However, if a user cancels debugging, replacing the screenshot fallback with a debugger call removes its independent recovery path. A video-frame screenshot also cannot replace fallback when no video stream was obtained. [Debugger API](https://developer.chrome.com/docs/extensions/reference/api/debugger), [Page.captureScreenshot](https://chromedevtools.github.io/devtools-protocol/1-3/Page/)

**Video:** standard screen capture is an available alternative to the extension API, but its options do not enforce the current tab-only chooser in the same way. The calling extension surface also needs to meet focus and user-activation requirements. Validate actual side-panel recording before claiming removal. The existing video-picker/diagnostic-tab identity mismatch is pre-existing and is not solved by permission removal. [Chrome screen capture guidance](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture), [getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia), [Desktop Capture API](https://developer.chrome.com/docs/extensions/reference/api/desktopCapture)

**Storage:** IndexedDB is accessible from extension service workers, but changing capture-session state from memory to disk changes data lifetime. A plain worker global disappears when the worker terminates; a page-owned variable disappears with that page. Neither is a drop-in replacement for shared session storage. [Extension storage](https://developer.chrome.com/docs/extensions/reference/api/storage), [Storage and cookies](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies)

**Downloads:** opening `chrome://downloads` would show a browser page, not the OS folder opened by the current button. Saving only a ZIP would remove the existing folder-export option. Neither meets the stated requirement. [Downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads)

**Side panel:** using Chrome's native extension side panel requires its permission; substituting a window or overlay changes the feature. [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
