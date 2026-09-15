# BugReceipt product truth

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- People reporting a reproducible problem in a web application, including QA engineers and support teams.
- Developers and small open-source teams that need browser evidence and human reproduction steps together.

## Product Purpose

BugReceipt turns incomplete browser bug reports into privacy-filtered reproduction evidence that a developer can review and act on. Success means a reporter can capture a failure once, inspect what was collected, and export a useful local report without surrendering control of the evidence.

## Positioning

BugReceipt keeps one user-initiated browser failure trace together: selected-tab visual evidence, bounded console and network diagnostics, environment context, and manual reproduction steps. The reporter reviews and edits that trace before explicitly choosing which local artifacts to export; BugReceipt does not automatically upload evidence or create a remote issue.

## Operating Context

- The reporter opens BugReceipt from a persistent Chrome side panel while viewing the affected web application.
- A capture session begins only after the reporter chooses a tab and approves the required access.
- The reporter reproduces the failure, adds ordered manual steps, then stops the session and reviews a local reproduction draft.
- Review includes editable issue details and separate Visual evidence, Console, and Network workspaces.
- The reporter can capture and annotate selected video frames, highlight exact diagnostic text, and remove individual evidence before export.
- Export produces GitHub-ready Markdown plus selected local files as a ZIP or a folder under Chrome Downloads. A separate action opens BugReceipt's public GitHub issue form without populating or submitting it.

## Capabilities and Constraints

### Captured evidence

- Selected-tab WebM recording without microphone or tab audio, with a final screenshot fallback when recording is unavailable.
- Console logs, warnings, errors, uncaught exceptions, and rejected promises captured after recording starts.
- Fetch, XHR, and page-resource activity with method, status, duration, filtered URL, and bounded supported text or JSON bodies.
- Manual reproduction steps, page URL and title, capture time, operating system, browser and platform details, user agent, application context, expected behavior, and actual behavior.
- Up to 20 selected video frames with local visual annotations, plus exact text annotations for Console and Network evidence.

### Privacy boundaries

- Sensitive diagnostic values are filtered before extension storage; persisted filtered values are the only values available for export.
- Cookies, browser storage, page HTML or DOM snapshots, response headers, keystrokes, clipboard contents, and form values are not captured directly.
- Available request headers are captured with recognized credentials redacted before storage.
- Evidence remains in extension-owned local storage until the user deletes it, starts another capture, or downloads it.
- Screen recordings can still display sensitive information rendered by the page, so the reporter must review visual evidence before sharing it.
- Filtering reduces risk but does not guarantee recognition of every sensitive value.

### Current product constraints

- Chrome desktop 120 and later is the only supported browser target.
- Only one capture session can be active at a time.
- Restricted browser pages and pages where Chrome denies access cannot be captured.
- Cross-origin navigation preserves user-approved video recording, but console and network instrumentation resumes only when the extension can access the loaded page.
- BugReceipt does not currently capture automatic interaction steps or WebSocket frames, integrate application-version or feature-flag SDK data, or authenticate with and create GitHub or Linear issues.

### Distribution

- Version 0.2.0 is the latest BugReceipt release and the authoritative current version.
- Version 0.1.6 is the previous release.
- GitHub Releases may also distribute an unpacked Chrome extension ZIP; those installations require Chrome Developer mode and **Load unpacked** and do not update automatically.
- The public Chrome Web Store listing is `https://chromewebstore.google.com/detail/bugreceipt/dcjbnkadoenmkcimidcbhhckdpaondae`.
- The public landing page is deployed at `https://bugreceipt.netlify.app`.

## Brand Commitments

- Product name: BugReceipt.
- Voice: precise, evidence-led, transparent about privacy boundaries, and explicit about what the current release does not do.
- Do not imply automatic uploading, background collection before capture begins, guaranteed removal of all sensitive information, or automatic issue creation.

## Evidence on Hand

- The runnable Chrome extension and review workbench live in `apps/extension`.
- The public landing page and its product tour live in `apps/web` and `apps/web/public/brand`.
- A deliberately broken checkout fixture for safe, deterministic capture testing lives in `examples/broken-web-app`.
- Capture, privacy filtering, export, annotation, and landing-page behavior are covered by automated tests in the app and package test directories.
- Installation, use, privacy boundaries, architecture, limitations, deployment, and release preparation are documented in `README.md`.
- No testimonials, customer logos, usage benchmarks, public store listing, or remote issue-creation capability are established and future work must not fabricate them.

## Product Principles

- Keep the full failure context together so developers can move from report to reproduction.
- Make capture intentional and the sharing boundary explicit.
- Filter before persistence, then let the reporter inspect and remove evidence before export.
- Describe capabilities and limitations precisely; trust depends on truthful boundaries.
- Prefer useful local artifacts and an inspectable workflow over automatic external transmission.

## Accessibility & Inclusion

- The web experience supports keyboard-visible focus, responsive layouts down to narrow mobile widths, semantic landmarks and labels, themed recovery states, and reduced-motion preferences.
- Product copy must explain privacy risks and installation constraints plainly enough for reporters who are not browser-extension specialists.
