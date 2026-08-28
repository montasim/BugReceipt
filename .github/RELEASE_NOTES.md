## Summary

BugReceipt v0.1.2 fixes missing network response evidence for fetch requests whose servers omit the `Content-Type` response header. The captured body remains bounded and passes through BugReceipt's local privacy filtering before storage and review.

## Highlights

- **Response evidence fix:** Capture textual fetch response bodies even when the response has no `Content-Type` header.
- **Regression coverage:** Added a test for a failed `500` response with a missing content type so the behavior remains protected.
- **Accurate privacy guidance:** Clarified that supported text and JSON request and response bodies are filtered locally before review.
- **Landing-page typography:** Increased the site-wide type scale while preserving the existing hierarchy and responsive layout.

## Install in Chrome

1. Download `BugReceipt-v0.1.2-chrome-unpacked.zip` and `SHA256SUMS.txt` from this release.
2. Put both files in the same directory and verify the archive:

   ```bash
   sha256sum --check SHA256SUMS.txt
   ```

3. Extract the ZIP to a folder you will keep.
4. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
5. Select the extracted folder containing `manifest.json`, then pin BugReceipt.

GitHub unpacked installations do not update automatically. Remove the existing unpacked BugReceipt entry after loading and confirming the v0.1.2 folder.

## Verification

- `pnpm check` — formatting, linting, type checking, tests, production builds, and extension-package validation passed.
- Release workflow — checks the ZIP layout, requires `manifest.json` at the archive root, and publishes `SHA256SUMS.txt` with the archive.

## Links

- [Landing page](https://bugreceipt.netlify.app)
- [Source](https://github.com/montasim/BugReceipt)
- [Full comparison](https://github.com/montasim/BugReceipt/compare/v0.1.1...v0.1.2)
