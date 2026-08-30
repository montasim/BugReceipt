## Summary

BugReceipt v0.1.4 makes the reviewed report easier to complete, safer to share, and more useful when it reaches a teammate. The release adds multi-frame visual evidence, stronger review validation, a built-in BugReceipt issue form, complete email bundles, and a professional HTML email while preserving the original Markdown as the plain-text fallback.

## Highlights

- **Multiple selected frames:** Capture, navigate, annotate, download, and remove up to 20 timestamped frames from one recording. Exports use stable numbered filenames when more than one frame is selected.
- **Stronger review workflow:** Edit reproduction steps in a dedicated textarea, validate report fields before export, and reuse the annotation workspace for precise Console and Network evidence selections.
- **Built-in BugReceipt issue reporting:** Open the issue form from the review header, submit a subject and description, and optionally include a locally generated `diagnosis.md` only after explicit consent.
- **Complete email bundles:** Send `issue.md` with the same recording, selected frames, or fallback screenshot prepared for the ZIP. Requests above the 4 MiB email limit fail as a complete set instead of silently dropping evidence.
- **Professional report email:** HTML-capable clients receive a responsive BugReceipt-branded evidence report with readable sections, diagnostic code blocks, and an attachment inventory. The original Markdown remains the plain-text fallback and attached source report.
- **Safer report input:** Required-field and offensive-language feedback appears while typing and is checked again immediately before export or delivery.
- **Production delivery hardening:** Release builds include only the configured report-server origin, tolerate an unpacked extension origin during development, surface provider rejection details, and derive idempotency from the complete message payload.

## Privacy boundary

Capture data, selected frames, annotations, and diagnosis inputs remain in extension-owned storage until the user downloads or explicitly shares them. The optional diagnosis excludes recordings, screenshots, selected frames, and network request or response bodies. Email recipients and Resend credentials remain server-side.

## Install in Chrome

1. Download `BugReceipt-v0.1.4-chrome-unpacked.zip` and `SHA256SUMS.txt` from this release.
2. Put both files in the same directory and verify the archive:

   ```bash
   sha256sum --check SHA256SUMS.txt
   ```

3. Extract the ZIP to a folder you will keep.
4. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
5. Select the extracted folder containing `manifest.json`, then pin BugReceipt.

GitHub unpacked installations do not update automatically. After confirming that v0.1.4 works, remove the older unpacked BugReceipt entry and its extracted folder.

## Verification

- `pnpm check` validates formatting, linting, types, tests, production builds, and the unpacked extension package.
- `pnpm release:zip` repeats the extension release gate and creates the Chrome 0.1.4 archive.
- The release workflow verifies `manifest.json` at the ZIP root and publishes `SHA256SUMS.txt` beside the archive.

## Links

- [Landing page](https://bugreceipt.netlify.app)
- [Source](https://github.com/montasim/BugReceipt)
- [Full comparison](https://github.com/montasim/BugReceipt/compare/v0.1.3...v0.1.4)
