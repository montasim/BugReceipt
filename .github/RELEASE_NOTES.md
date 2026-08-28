## What’s new in v0.1.0

- Added a persistent Chrome side panel that remains open while a user reproduces a browser problem.
- Added selected-tab screen recording without microphone or tab audio, with a final screenshot fallback when Chrome cannot record video.
- Added locally filtered console and network evidence, including logs, errors, fetch, XHR, and page-resource activity.
- Added manual reproduction steps, browser and page context, expected behavior, and actual behavior in one reviewable report.
- Added local report ZIP export containing `issue.md` and matching visual evidence.
- Added optional report email delivery through the configured BugReceipt server and Resend, triggered only by an explicit user action.

## Install in Chrome

1. Download the Chrome ZIP and `SHA256SUMS.txt` attached to this release.
2. Place both files in the same folder and verify the archive:

   ```bash
   sha256sum --check SHA256SUMS.txt
   ```

3. Extract the ZIP to a permanent folder.
4. Open `chrome://extensions` in Chrome 120 or later.
5. Enable **Developer mode**.
6. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
7. Pin BugReceipt to the Chrome toolbar and open it on a normal HTTP or HTTPS page.

Chrome loads BugReceipt from the extracted folder, so do not delete that folder while the extension is installed. GitHub installations do not update automatically; download, verify, and load each newer release when one becomes available.
