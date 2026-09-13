# Local-export-only implementation plan

## Outcome

Remove every email-delivery path from BugReceipt before its first Chrome Web Store release. Keep complete-report export local through:

- **Copy Markdown**
- **Download folder**
- **Download ZIP**

Replace the in-extension support form with a direct **Report an issue** link to:

`https://github.com/montasim/BugReceipt/issues/new/choose`

Opening that link must not populate, upload, or attach capture data.

## Implementation scope

### Extension

- Remove **Share by email** and every emailed/loading/unavailable state from the review command bar.
- Remove the support issue dialog, diagnosis consent, diagnosis generator, and email transport.
- Replace the shared support control in the popup and review header with a GitHub issue link.
- Remove report-endpoint build configuration and its host permission.
- Remove email- and diagnosis-specific tests and dead CSS.
- Preserve capture, review, annotation, Copy Markdown, folder download, ZIP download, and individual evidence downloads.

### Web application

- Remove `/api/reports` routing and its server implementation.
- Remove Resend and the email endpoint test suite.
- Remove report-server environment loading.
- Keep the landing site and Netlify application rendering unchanged apart from truthful local-export copy.

### Repository and documentation

- Remove the email `.env.example` and Resend configuration documentation.
- Remove email delivery from the README, product truth, domain language, limits, troubleshooting, and architecture.
- State that **Report an issue** opens GitHub and transmits no capture data.
- Regenerate the dependency lockfile after removing Resend.
- Keep Google Drive permissions and OAuth configuration out of this release.

## Verification

- Extension unit/UI tests pass.
- Web unit tests pass.
- Extension and web type checks pass.
- Lint and formatting checks pass.
- Extension and web production builds pass.
- The packaged manifest has no report-server host permission.
- Repository search finds no live Resend, report-email, diagnosis-email, or `/api/reports` implementation.
- Popup and review tests assert the GitHub issue URL and new-tab behavior.
- Copy Markdown, Download folder, and Download ZIP remain covered.

## Acceptance criteria

- No extension action can email or upload a capture.
- No BugReceipt-owned endpoint accepts emailed reports.
- No email credentials or endpoint variables are required.
- **Report an issue** opens GitHub directly.
- Local exports work without network access.
- Public documentation matches the packaged behavior.
