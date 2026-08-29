## Summary

BugReceipt v0.1.3 turns the post-capture review into a focused evidence workbench. Reporters can capture a precise video frame, annotate the saved PNG, highlight exact console or network text, inspect the captured browser environment, and export the reviewed files either as a ZIP or as a named folder under Chrome Downloads.

## Highlights

- **Frame capture at the playhead:** Capture the current recording frame directly from the video player and preserve its exact timestamp as local PNG evidence.
- **Visual annotation tools:** Mark, highlight, border, move, resize, undo, redo, or clear annotations before flattening them into the exported selected-frame PNG.
- **Diagnostic text highlights:** Select and color exact console or network text. Saved highlights remain local and appear in Markdown as explicit `⟦double-bracket⟧` markers.
- **Evidence-focused review:** Use the persistent issue inspector with dedicated Visual evidence, Console, and Network tabs, responsive controls, and clearer empty or interruption states.
- **Environment details:** Include operating system, browser, platform, raw user agent, capture time, page URL, and BugReceipt version in review and Markdown exports.
- **Two local download formats:** Save the same reviewed report files as one ZIP or as individual files inside a named folder under Chrome Downloads.
- **Safer selected-frame delivery:** Keep `selected-frame.png` under the same filename when the explicitly requested email workflow attaches it.
- **Capture and site polish:** Show recording duration and extension version in the side panel, preserve the SupportKori path, and add resilient landing-page error states.

## Privacy boundary

Captured diagnostics remain bounded and locally filtered before storage. Frame and text annotations are stored in extension-owned browser storage. Nothing is uploaded automatically; email delivery still requires an explicit action and a configured server endpoint.

## Install in Chrome

1. Download `BugReceipt-v0.1.3-chrome-unpacked.zip` and `SHA256SUMS.txt` from this release.
2. Put both files in the same directory and verify the archive:

   ```bash
   sha256sum --check SHA256SUMS.txt
   ```

3. Extract the ZIP to a folder you will keep.
4. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
5. Select the extracted folder containing `manifest.json`, then pin BugReceipt.

GitHub unpacked installations do not update automatically. After confirming that v0.1.3 works, remove the older unpacked BugReceipt entry and its extracted folder.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` — passed across the workspace.
- `pnpm release:zip` — passed the extension quality gate and created the Chrome 0.1.3 archive.
- Release workflow — checks the ZIP layout, requires `manifest.json` at the archive root, and publishes `SHA256SUMS.txt` beside the archive.

## Links

- [Landing page](https://bugreceipt.netlify.app)
- [Source](https://github.com/montasim/BugReceipt)
- [Full comparison](https://github.com/montasim/BugReceipt/compare/v0.1.2...v0.1.3)
