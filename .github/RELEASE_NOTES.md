## Summary

BugReceipt v0.1.6 improves visual annotation editing and simplifies report sharing around local exports and user-controlled links.

## Highlights

- **Editable text annotations:** Add, edit, move, resize, and render auto-sizing text notes alongside the existing visual annotation tools.
- **Reliable annotation gestures:** Movement and resize updates retain their final pointer position and produce useful undo history.
- **Local-only report delivery:** Email sending and the BugReceipt report endpoint have been removed. Reports remain available as a local folder, ZIP, Markdown, and evidence-specific downloads.
- **Direct issue reporting:** The review header links to the BugReceipt GitHub issue form while the SupportKori support link remains available.
- **Clearer review actions:** Delete local capture now sits beside Copy Markdown and Download report, with the same explicit confirmation before removal.

## Privacy boundary

Capture data, selected frames, and annotations remain in extension-owned storage until the user downloads them. The new Console JSON and Network HAR downloads contain only the locally filtered evidence already visible in review. This release does not provide complete-report upload or email delivery.

## Install in Chrome

1. Download `BugReceipt-v0.1.6-chrome-unpacked.zip` and `SHA256SUMS.txt` from this release.
2. Put both files in the same directory and verify the archive:

   ```bash
   sha256sum --check SHA256SUMS.txt
   ```

3. Extract the ZIP to a folder you will keep.
4. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
5. Select the extracted folder containing `manifest.json`, then pin BugReceipt.

GitHub unpacked installations do not update automatically. After confirming that v0.1.6 works, remove the older unpacked BugReceipt entry and its extracted folder.

## Verification

- `pnpm check` validates formatting, linting, types, tests, production builds, and the unpacked extension package.
- `pnpm release:zip` repeats the extension release gate and creates the Chrome 0.1.6 archive.
- The release workflow verifies `manifest.json` at the ZIP root and publishes `SHA256SUMS.txt` beside the archive.

## Links

- [Landing page](https://bugreceipt.netlify.app)
- [Source](https://github.com/montasim/BugReceipt)
- [Full comparison](https://github.com/montasim/BugReceipt/compare/v0.1.5...v0.1.6)
