# BugReceipt domain language

## Terms

### Capture session

A user-initiated, tab-scoped period during which BugReceipt collects diagnostic events and manual reproduction steps. A persisted capture session is either `recording` or `ready-for-review`. A reviewed session records whether capture completed normally or ended because the tab changed origin or was closed. Discarding removes the session instead of persisting a separate status.

### Diagnostic event

A bounded, safely serialized console call, uncaught error, or unhandled promise rejection recorded during a capture session.

### Manual step

A user-authored instruction describing an action needed to reproduce the problem. Manual steps are ordered within a capture session.

### Visual evidence

The selected tab’s pixel stream recorded during a capture session, plus a final-frame screenshot fallback when Chrome cannot record video. Visual evidence excludes microphone and tab audio, but may still display sensitive information rendered on the page.

### Page snapshot

The page title, privacy-filtered URL, and browser metadata captured when a session is stopped. It is not a copy of the DOM, cookies, storage, form values, or request bodies.

### Reproduction draft

The complete local, editable result assembled from a capture session: summary, manual steps, diagnostic events, page snapshot, visual evidence, expected behavior, and actual behavior.

### Privacy filter

The local transformation that removes or masks sensitive values before captured diagnostics, steps, and edited review fields are persisted. Only persisted, filtered values can be exported. The filter is deterministic and reports what it changed.

### Evidence annotation

A user-authored, local overlay that calls attention to reviewed evidence without changing the captured source. Frame annotations are flattened into exported PNG files. Console and network text annotations preserve exact character ranges and appear in exported Markdown as explicit double-bracket markers.

### Export

User-approved Markdown and visual-evidence files produced from a reviewed reproduction draft, including its saved evidence annotations. Export does not upload, create a remote issue, or change the stored session state.

### Report delivery

An explicit user action that sends a reviewed reproduction draft to the configured BugReceipt server. The server owns the Resend credential and fixed recipient. Delivery is distinct from local export and changes the privacy boundary because selected evidence leaves the browser.

## Distinctions

- A capture session is raw, temporary working state; a reproduction draft is the reviewed, editable form.
- A page snapshot is metadata; visual evidence is the separate recording or screenshot fallback.
- Export creates local artifacts; publishing to GitHub or Linear is a later capability.
- Report delivery emails evidence to a fixed maintainer but does not create a GitHub or Linear issue.
