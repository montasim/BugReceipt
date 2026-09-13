# Google Drive sharing implementation plan

## 1. Outcome

Add optional Google Drive export to BugReceipt without making sign-in a requirement for capture, review, copying Markdown, or local download.

The completed flow lets a user:

1. Review and validate a report exactly as they do today.
2. Choose **Save to Google Drive**.
3. Grant BugReceipt access to create and manage only files created through BugReceipt.
4. Upload the same ZIP produced by **Download ZIP** into the user's My Drive.
5. Save later edits back to the same Drive file.
6. Choose **Create sharing link** as a separate, explicit action.
7. Copy or open the resulting read-only link.

Local export remains available without an account. Nothing is uploaded merely because the user connects Google Drive.

## 2. Scope

### Included

- A stable extension ID for unpacked development and GitHub-distributed builds.
- Google OAuth through `chrome.identity`.
- The least-privileged `https://www.googleapis.com/auth/drive.file` scope.
- Private creation and update of one ZIP file per BugReceipt capture.
- Explicit creation of an `anyone with the link` reader permission.
- Copy-link and open-in-Drive actions after a successful save/share.
- Local persistence of the Drive file ID for updating the same remote report.
- Progress, cancellation-safe UI state, authentication recovery, retryable upload failures, and actionable sharing-policy errors.
- Automated tests around report preparation, identity, Drive requests, persistence, and review UI states.
- Manual verification with personal Google accounts and a Workspace account where external sharing is restricted.
- Reuse of the local-only baseline, which contains no email transport or BugReceipt report endpoint.

### Not included

- Microsoft sign-in or OneDrive.
- Mandatory BugReceipt accounts or a BugReceipt account database.
- Background synchronization or automatic upload after capture.
- Reading, browsing, searching, or deleting arbitrary Drive files.
- A Drive folder containing separately uploaded report assets.
- Sharing with named recipients, editor links, expiration dates, or access analytics.
- Converting `issue.md` into a Google Doc.
- A BugReceipt backend for proxying Drive requests or storing Google tokens.
- Automatic fallback to a broader Drive scope.

The existing **Report an issue** control is a direct GitHub link and remains independent from Drive export.

## 3. Product decisions

### Cloud access is optional and just in time

Do not add a sign-in gate at extension startup. Ask for Google authorization only after the user chooses **Save to Google Drive**. This preserves BugReceipt's local-first value and gives the OAuth prompt clear context.

### Upload one ZIP

Upload `<report-name>.zip`, containing the same `issue.md` and visual evidence as the existing local ZIP export.

This is preferable for the first release because it:

- reuses the existing report-bundle implementation;
- creates one atomic cloud artifact rather than a partially uploaded folder;
- requires one remote ID, update operation, and sharing permission;
- keeps local and cloud exports byte-for-byte equivalent;
- makes retry and overwrite behavior understandable.

Separate Drive files can be considered later only if users need browser-native previews of individual evidence.

### Saving and sharing are separate consent moments

**Save to Google Drive** creates a private file. It must not make the report public.

After saving, show:

- **Open in Drive**
- **Create sharing link**

Before creating the link, explain that anyone who receives it can view or download the complete report and all included evidence. On confirmation, create an `anyone` + `reader` permission and display:

- **Copy link**
- **Open link**

If a Workspace administrator blocks public links, leave the private upload intact and explain that the organization's sharing policy prevented link creation.

### Repeated saves update one file

Store the returned Drive file ID against the BugReceipt capture ID. If the user saves the same capture again, update that Drive file's content and name instead of creating a duplicate. An existing sharing link then continues to point to the updated report.

If Drive reports that the file no longer exists or BugReceipt no longer has access, clear the stale mapping and offer to create a new private file. Do not silently create duplicates during an ambiguous network failure.

## 4. Provider setup before implementation

### Stable extension identity

1. Upload a packaged BugReceipt ZIP to the Chrome Developer Dashboard as an unpublished draft.
2. Record the assigned extension ID.
3. Copy the draft item's public key into WXT's generated manifest as `key`.
4. Build and load the unpacked extension from two different directories and verify that both builds receive the same ID.
5. Keep the public key in source or public build configuration. It is an identifier, not a secret.

Use a separate draft item, extension ID, and OAuth client for a development channel only if development and production builds must be installed simultaneously.

### Google Cloud configuration

1. Create or select a Google Cloud project owned by the BugReceipt maintainer account.
2. Enable Google Drive API v3.
3. Configure the OAuth consent screen with the BugReceipt name, homepage, privacy policy, and support contact.
4. Create a Chrome Extension OAuth client using the stable extension ID.
5. Add only `https://www.googleapis.com/auth/drive.file`.
6. Add test users while the consent screen remains in testing mode.
7. Complete the verification required for a public release before distributing OAuth-enabled builds broadly.

Do not create, bundle, or request a Google client secret. A browser extension is a public client and cannot protect one.

## 5. Manifest and build changes

Update `apps/extension/wxt.config.ts` to generate:

- `identity` in `permissions`;
- the stable public `key`;
- an `oauth2` block containing the Chrome-extension OAuth client ID and `drive.file` scope;
- the narrow Google API host permissions actually required by the upload, metadata, permission, and token-revocation requests.

Keep the OAuth client ID configurable at build time so a development channel can use a separate client. Fail the release-package validation when Google Drive sharing is enabled but the stable key or OAuth client ID is absent. Verify that the built `manifest.json`, not only the WXT source, contains the expected values.

Do not put access tokens, refresh tokens, or secrets into Vite environment variables.

## 6. Architecture

### ReportArtifact module

Move the existing review-page report assembly behind one interface used by local ZIP download and Drive upload:

```ts
prepareReportArtifact(reviewedSession): Promise<{
  captureId: string;
  filename: string;
  blob: Blob;
}>;
```

The implementation owns review persistence, Markdown rendering, selected-frame annotation rendering, recording/screenshot retrieval, ZIP creation, and filename generation. Callers receive one ready-to-export artifact and do not reconstruct report files themselves.

This seam prevents local download and Drive upload from drifting. Its tests prove that both destinations receive the same filename and ZIP bytes for the same reviewed capture.

### GoogleIdentity module

Expose a small interface:

```ts
getGoogleAccessToken(options: { interactive: boolean }): Promise<string>;
invalidateGoogleAccessToken(token: string): Promise<void>;
disconnectGoogleDrive(): Promise<void>;
```

The implementation owns `chrome.identity`, cached-token invalidation, user-cancelled authorization, revoked consent, and conversion of Chrome runtime errors into user-facing error categories.

Access tokens remain in Chrome's identity cache and in memory only for the active request. Never write them to `chrome.storage`, IndexedDB, logs, diagnostics, or exported reports.

### GoogleDriveReport module

Expose the behavior the review UI needs, not raw Drive endpoints:

```ts
saveReport(input: {
  captureId: string;
  filename: string;
  blob: Blob;
}): Promise<{
  fileId: string;
  filename: string;
  webViewLink: string;
  updated: boolean;
}>;

createReadOnlyLink(fileId: string): Promise<{
  url: string;
}>;
```

The implementation hides:

- create-versus-update selection;
- resumable upload session creation;
- upload headers and response parsing;
- one authentication retry after a `401`;
- missing-file recovery;
- Drive error decoding;
- metadata requests for `webViewLink`;
- permission creation and already-existing permission behavior.

Do not expose a generic Drive client or provider abstraction. There is only one cloud provider in this release, so a cross-provider seam would be speculative.

### DriveExportStore module

Persist only non-secret remote metadata in `chrome.storage.local`:

```ts
type DriveExportRecord = {
  captureId: string;
  fileId: string;
  filename: string;
  webViewLink: string;
  sharedLink?: string;
  savedAt: string;
};
```

The capture ID is the lookup key. Validate stored records before use. Remove a record when Drive returns a definitive `404`, after the associated local capture is permanently deleted, or when the user explicitly forgets the connection metadata.

## 7. Drive request behavior

### Private first save

1. Prepare the final ZIP only after the existing export validation and pending review-save logic succeed.
2. Obtain a Google access token interactively.
3. Start a resumable Drive upload for a new file with:
   - the generated ZIP filename;
   - MIME type `application/zip`;
   - `fields=id,name,webViewLink`;
   - no public permission.
4. Upload the ZIP Blob.
5. Validate the response and persist its non-secret metadata.
6. Show a private-save success state with **Open in Drive** and **Create sharing link**.

Use resumable upload even though some reports are small because recordings can exceed multipart-upload thresholds. The first implementation may send the complete Blob in one request to the resumable session; add chunk checkpointing only when measured file sizes or reliability demonstrate the need.

### Update

When a valid local mapping exists:

1. Start a resumable update for the stored file ID.
2. Replace its ZIP content and update its filename if the report title changed.
3. Preserve existing Drive permissions.
4. Refresh stored metadata and saved time.

If the request returns `401`, invalidate the cached token, obtain one fresh token, and retry the failed logical operation once. If the request returns a definitive `404`, remove the mapping and ask the user whether to create a new Drive file. Do not retry authorization, upload, or permission operations indefinitely.

### Sharing

After explicit confirmation:

1. Call `permissions.create` for the saved file with `type: "anyone"` and `role: "reader"`.
2. Request the returned permission details needed to obtain the public link, or fetch the file's sharing metadata afterward.
3. Store only the returned link and remote identifiers.
4. Copy the link only after the user chooses **Copy link**; do not overwrite the clipboard merely because sharing succeeded.

Treat organization-policy rejection as a specific non-destructive outcome: “Saved privately, but your Google Workspace policy does not allow anyone-with-the-link sharing.”

## 8. Review UI changes

Replace the capture-level **Share by email** control with **Save to Google Drive**. Keep local download as the primary no-account path.

Suggested states:

| State                | Primary cloud action  | Supporting UI                                                         |
| -------------------- | --------------------- | --------------------------------------------------------------------- |
| Not connected        | Save to Google Drive  | Explains that Google authorization opens after the click              |
| Authorizing          | Connecting…           | Disable duplicate submission; allow the Google window to be cancelled |
| Preparing            | Preparing report…     | Reuse the current export validation and preparation status            |
| Uploading            | Saving to Drive…      | Show determinate progress when total bytes are available              |
| Saved privately      | Saved to Drive        | Open in Drive; Create sharing link                                    |
| Sharing confirmation | Create read-only link | Explain complete-report exposure and require confirmation             |
| Shared               | Link ready            | Copy link; Open link; Save updated version                            |
| Recoverable failure  | Try again             | Preserve the reviewed local report and local download actions         |

Accessibility requirements:

- expose busy states with `aria-busy` and a status region;
- return focus to the initiating control after a cancelled OAuth window or closed dialog;
- do not encode upload/share state by color alone;
- make the sharing disclosure and confirmation keyboard accessible;
- keep error text next to the cloud action while leaving local export usable.

Add a small connection area in settings or the review screen with **Disconnect Google Drive**. Explain that disconnecting BugReceipt clears its cached authorization but does not delete uploaded reports or revoke already-created sharing links.

## 9. Error model

Map provider and browser failures into stable product errors:

- authorization cancelled;
- authorization denied;
- Google Drive access revoked or expired;
- offline/network interruption;
- upload session expired;
- storage quota exceeded;
- file too large or rejected;
- saved Drive file missing;
- insufficient permission;
- public-link sharing blocked by organization policy;
- malformed or unexpected Google response;
- local report evidence missing during preparation.

Every failure must state whether the Drive file was created or updated, whether it remains private, and what the user can safely do next. Never include tokens, raw authorization headers, or full provider responses in user-visible errors or console logging.

## 10. Migration work

Build Drive export on the existing local-only baseline:

- keep the GitHub **Report an issue** link independent from Drive authorization;
- update README privacy, permissions, export, setup, and user-flow sections;
- update the landing page copy and screenshots;
- update the release-package validator for `identity`, OAuth configuration, stable ID, and Google hosts;
- do not reintroduce an email transport or BugReceipt report endpoint.

## 11. Test plan

### Unit tests

- `ReportArtifact` creates the same ZIP used by local download and Drive upload.
- ZIP filename sanitization remains deterministic.
- Google identity requests only `drive.file` and distinguishes cancellation from provider failure.
- Tokens are invalidated and retried once after `401`.
- New saves create a Drive file and persist its ID.
- Later saves update the stored file ID.
- `404` clears stale mappings without silently duplicating a report.
- Sharing creates an `anyone` + `reader` permission only after confirmation.
- Workspace-policy failures preserve the successful private save.
- malformed Drive responses do not persist partial records.
- no token is written to extension storage.

Mock `fetch`, `chrome.identity`, and `chrome.storage` at the module seam. Tests should exercise `saveReport` and `createReadOnlyLink`, not duplicate Drive's internal request structure throughout UI tests.

### Review UI tests

- local downloads remain enabled without Google authorization;
- clicking save starts the interactive authorization flow;
- double-clicking cannot create duplicate uploads;
- private-save success does not imply the file is shared;
- sharing requires the disclosure confirmation;
- copy link occurs only from an explicit user action;
- failed authorization/upload/share leaves the reviewed report intact;
- updating a shared report communicates that the existing link now points to the new ZIP;
- keyboard and screen-reader status behavior remains correct.

### Manifest and package tests

- built manifest has the stable key, OAuth client, `identity`, exact scope, and required Google hosts;
- built manifest does not contain a client secret;
- release validation fails for placeholder or missing OAuth configuration;
- loading identical builds from different directories produces the registered extension ID.

### Manual provider matrix

Test with:

- a personal Google account granting access for the first time;
- a returning authorized account;
- user-cancelled authorization;
- revoked access followed by reauthorization;
- a large recording-backed report;
- an edited report saved again to the same file;
- deletion of the Drive file between saves;
- Drive storage quota exhaustion where practical;
- offline interruption and retry;
- a Workspace account that permits public links;
- a Workspace account that blocks public links.

For each case, inspect Drive directly and confirm file ownership, filename, ZIP contents, privacy state, and link behavior.

## 12. Delivery phases

### Phase 1: Provider foundation

- establish the unpublished Chrome Dashboard item and stable ID;
- configure Google Cloud, Drive API, consent screen, test users, and OAuth client;
- add and validate the manifest configuration;
- prove an unpacked test build can obtain and invalidate a `drive.file` token.

Exit criterion: the same unpacked build ID works from multiple directories and a test user can authorize without any bundled secret.

### Phase 2: Shared report artifact

- extract report preparation from the review UI;
- route the existing ZIP download through `ReportArtifact`;
- add deterministic artifact tests.

Exit criterion: local ZIP behavior is unchanged and there is one implementation that prepares cloud/local archive bytes.

### Phase 3: Private Drive save

- implement Google identity, Drive upload/update, and remote-record storage;
- add the review UI states and **Open in Drive**;
- cover create, update, `401`, `404`, cancellation, and network failure.

Exit criterion: a report can be privately created and updated in the user's Drive while all local actions remain usable.

### Phase 4: Explicit sharing

- add the privacy disclosure and confirmation;
- create a read-only anyone-with-link permission;
- add copy/open link actions and organization-policy handling.

Exit criterion: link creation never occurs during save, and successful links expose the updated ZIP to an unauthenticated browser while restricted Workspace accounts receive a clear private-save result.

### Phase 5: Release hardening

- update documentation, landing screenshots, privacy disclosures, and release validation;
- complete OAuth verification requirements and run the full project checks.

Exit criterion: the shipped UI and documentation describe only behaviors that work in the packaged OAuth-enabled build.

## 13. Release acceptance criteria

The feature is ready when all of the following are true:

- Unpacked builds distributed from different directories use the registered stable extension ID.
- A user can complete capture, review, local download, and copy Markdown without connecting Google.
- Google authorization is initiated only by a user action and requests only `drive.file`.
- A validated report is uploaded privately as the same ZIP available from local download.
- Saving the same capture again updates the same Drive file.
- No share permission is created until the user confirms the sharing disclosure.
- A personal Google account can produce a working read-only anyone-with-link URL.
- A Workspace sharing restriction leaves the upload private and produces an actionable explanation.
- Tokens and authorization headers never enter BugReceipt storage, logs, diagnostics, or exports.
- Losing authorization, connectivity, or a remote file never destroys the reviewed local report.
- No email transport or BugReceipt report endpoint is reintroduced.
- Manifest/package validation and the full repository quality checks pass.

## 14. References

- Chrome OAuth for extensions: <https://developer.chrome.com/docs/extensions/how-to/integrate/oauth>
- Chrome manifest `key`: <https://developer.chrome.com/docs/extensions/reference/manifest/key>
- Chrome Identity API: <https://developer.chrome.com/docs/extensions/reference/api/identity>
- Google Drive scopes: <https://developers.google.com/workspace/drive/api/guides/api-specific-auth>
- Google Drive uploads: <https://developers.google.com/workspace/drive/api/guides/manage-uploads>
- Google Drive file creation: <https://developers.google.com/workspace/drive/api/guides/create-file>
- Google Drive permission creation: <https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/create>
