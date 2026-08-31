## Summary

BugReceipt v0.1.5 keeps capture running through real browsing journeys, makes diagnostic evidence easier to export, and adds calm feedback throughout the extension. It also refreshes the public landing page and makes production email delivery work for distributed unpacked installations.

## Highlights

- **Capture continuity across navigation:** The selected-tab video keeps recording after reloads and cross-origin navigation. Console and network instrumentation resumes whenever Chrome grants access to the new document without sacrificing the recording when it cannot.
- **Richer report context:** A dedicated optional description field is filtered, persisted, validated while typing, and included in `issue.md` and report email content.
- **Direct diagnostic downloads:** Export locally filtered Console evidence as JSON and Network evidence as HAR from their review tabs.
- **Sharper annotations:** Marker and border strokes retain their intended visual weight while evidence is scaled in the annotation workspace.
- **Calm interaction feedback:** Buttons, panels, tabs, menus, dialogs, alerts, and newly added steps use short, restrained motion. Capture and email actions expose specific loading labels and prevent duplicate submissions, with reduced-motion support throughout.
- **Production email delivery:** Production extension builds default to the deployed BugReceipt report endpoint. The server can safely accept any well-formed unpacked extension origin when distribution mode is explicitly enabled.
- **Refreshed public experience:** The landing page now uses the Evidence Desk visual system with clearer product proof, installation guidance, responsive spacing, and current extension imagery.

## Privacy boundary

Capture data, selected frames, annotations, and diagnosis inputs remain in extension-owned storage until the user downloads or explicitly shares them. The new Console JSON and Network HAR downloads contain only the locally filtered evidence already visible in review. Email recipients and Resend credentials remain server-side.

## Install in Chrome

1. Download `BugReceipt-v0.1.5-chrome-unpacked.zip` and `SHA256SUMS.txt` from this release.
2. Put both files in the same directory and verify the archive:

   ```bash
   sha256sum --check SHA256SUMS.txt
   ```

3. Extract the ZIP to a folder you will keep.
4. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
5. Select the extracted folder containing `manifest.json`, then pin BugReceipt.

GitHub unpacked installations do not update automatically. After confirming that v0.1.5 works, remove the older unpacked BugReceipt entry and its extracted folder.

## Verification

- `pnpm check` validates formatting, linting, types, tests, production builds, and the unpacked extension package.
- `pnpm release:zip` repeats the extension release gate and creates the Chrome 0.1.5 archive.
- The release workflow verifies `manifest.json` at the ZIP root and publishes `SHA256SUMS.txt` beside the archive.

## Links

- [Landing page](https://bugreceipt.netlify.app)
- [Source](https://github.com/montasim/BugReceipt)
- [Full comparison](https://github.com/montasim/BugReceipt/compare/v0.1.4...v0.1.5)
