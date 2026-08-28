## Summary

BugReceipt v0.1.1 completes the product rename from ReproKit and ships the first BugReceipt-branded Chrome archive. The extension keeps the same local-first capture and review workflow while the landing page, installation guidance, social preview, and repository metadata now share one verified identity.

## Highlights

- **BugReceipt identity:** Renamed extension, workspace packages, documentation, landing page, and release packaging from ReproKit to BugReceipt.
- **Clearer installation path:** Added a dedicated extension landing page with current Chrome requirements, archive contents, privacy boundaries, and GitHub Release installation steps.
- **Shareable project preview:** Added crawler-visible canonical, Open Graph, and Twitter Card metadata backed by a 1200×630 BugReceipt PNG.
- **Repository trust paths:** Added contribution, support, private security-reporting, issue-template, and pull-request guidance.
- **Interface polish:** Refined landing-page typography and spacing, added the SupportKori widget, and aligned its contrast with the BugReceipt palette.

## Install in Chrome

1. Download `BugReceipt-v0.1.1-chrome-unpacked.zip` and `SHA256SUMS.txt` from this release.
2. Put both files in the same directory and verify the archive:

   ```bash
   sha256sum --check SHA256SUMS.txt
   ```

3. Extract the ZIP to a folder you will keep.
4. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
5. Select the extracted folder containing `manifest.json`, then pin BugReceipt.

GitHub unpacked installations do not update automatically. If v0.1.0 is already installed under the ReproKit name, load the v0.1.1 folder as a new unpacked build and remove the older entry after confirming the new installation works.

## Verification

- `pnpm check` — format, lint, type, test, production build, and extension-package validation passed.
- Release workflow — checks the ZIP layout, requires `manifest.json` at the archive root, and publishes `SHA256SUMS.txt` with the archive.

## Links

- [Landing page](https://bugreceipt.netlify.app)
- [Source](https://github.com/montasim/BugReceipt)
- [Full comparison](https://github.com/montasim/BugReceipt/compare/v0.1.0...v0.1.1)
