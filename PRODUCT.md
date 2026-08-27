# ReproKit product truth

## Purpose

ReproKit turns incomplete browser bug reports into privacy-filtered reproduction evidence that a developer can review and act on.

## Audience

- People reporting a reproducible problem in a web application.
- Developers and small open-source teams that need the request context, browser evidence, and human reproduction steps together.

## Core mechanism

The user starts a tab-scoped capture from a persistent Chrome side panel, reproduces the failure, reviews every collected field, and explicitly exports or shares the resulting report.

## Captured evidence

- Selected-tab screen recording without microphone or tab audio, with a final screenshot fallback.
- Console logs, warnings, and errors captured after recording starts.
- Fetch, XHR, and page network activity with locally filtered request and response details.
- Manual reproduction steps, page URL, browser version, application context, expected behavior, and actual behavior.

## Privacy boundaries

- Captures start only after a user action.
- Sensitive diagnostic values are filtered before extension storage.
- Cookies, browser storage, page HTML, keystrokes, and form values are not captured directly.
- Evidence remains in extension-owned local storage until the user downloads it or explicitly sends it through the configured email action.
- Every captured item can be reviewed and selected evidence can be removed before export.

## Distribution

- Chrome 120 and later is the current supported browser target.
- Version 0.1.0 is distributed as a pre-release unpacked Chrome extension ZIP through GitHub Releases.
- Installation currently requires Chrome Developer mode and Load unpacked.
- A public Chrome Web Store listing is not claimed.
