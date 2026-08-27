# ReproKit MVP implementation plan

## 1. Outcome

Ship a Chromium Manifest V3 extension and public landing page. The extension lets a user:

1. Start a capture session for the active tab.
2. Reproduce a bug and add ordered manual steps.
3. Capture console calls, uncaught errors, and unhandled promise rejections emitted after recording starts.
4. Stop recording and capture the visible tab, page metadata, browser version, and extension version.
5. Review, edit, redact, or remove every captured field locally.
6. Export a GitHub-ready `issue.md` and `screenshot.png` without an account, server, or upload.

The MVP is successful when a developer can install the unpacked extension, create a useful report from a sample broken application in under three minutes, inspect everything being exported, and attach the two generated files to a GitHub issue.

The landing page must explain the local-only privacy model, show the three-step workflow, link to the latest GitHub Release and source repository, document the Chrome requirement, and provide enough evidence (screenshots or a short demo) for a developer to decide whether to install it.

## 2. Thoughtline technology audit

ReproKit should begin from the conventions proven in the sibling Thoughtline project rather than assembling another extension toolchain from scratch. The audit found:

| Area                 | Thoughtline technology                                                                                 | ReproKit decision                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Workspace            | pnpm 11 monorepo, Node 24+, ESM                                                                        | Adopt the same workspace and runtime baseline                                        |
| Extension build      | WXT 0.20, Manifest V3, Vite 8                                                                          | Adopt WXT; remove the hand-written Vite extension build from the earlier plan        |
| Extension UI         | React 19, TypeScript 6 strict mode                                                                     | Adopt                                                                                |
| Styling              | Tailwind CSS 4 with CSS-variable tokens                                                                | Adopt for extension and landing page                                                 |
| UI foundations       | Locally owned Radix/shadcn primitives, `class-variance-authority`, `clsx`, `tailwind-merge`, Hugeicons | Adopt only primitives used by ReproKit; do not copy Thoughtline product compositions |
| Forms and validation | React Hook Form, Zod 4, shared runtime schemas                                                         | Adopt; Zod schemas are authoritative at messages, storage, forms, and export seams   |
| Unit/UI tests        | Vitest 4, happy-dom, Testing Library                                                                   | Adopt                                                                                |
| Browser tests        | Playwright Chromium, serial extension workers, traces/screenshots on failure, axe checks               | Adopt                                                                                |
| Landing page         | TanStack Start/Router, React, Vite, Tailwind, Netlify                                                  | Adopt to keep deployment and maintenance consistent with Thoughtline                 |
| Quality gates        | ESLint, Prettier, Husky, lint-staged, strict TypeScript                                                | Adopt                                                                                |
| Distribution         | WXT zip, tag-triggered GitHub Release, SHA-256 checksums                                               | Adopt                                                                                |
| CI                   | GitHub Actions, frozen pnpm install, full checks plus Chromium UI tests                                | Adopt                                                                                |

Use Thoughtline as a configuration reference for workspace scripts, WXT output, CI, release packaging, Netlify build filtering, strict TypeScript flags, and Playwright diagnostics. ReproKit keeps its own domain modules, permissions, visual identity, and UI compositions.

## 3. Product decisions

### Supported platform

- Chrome/Chromium desktop only for the MVP.
- WXT-managed Manifest V3, TypeScript, React, and Vite.
- Node 24+, pnpm 11, and ESM throughout the workspace.
- Load-unpacked and packaged `.zip` distribution first; Chrome Web Store submission follows a manual privacy and permissions audit.

Firefox, Safari, mobile browsers, and cross-browser abstraction are deferred until the capture model has real users.

### Capture lifecycle

The extension cannot recover historical console output. Capture therefore uses an explicit lifecycle:

`idle -> recording -> ready-for-review -> exported | discarded`

- Starting requires a browser-action click, granting temporary `activeTab` access.
- Page-world instrumentation is installed at start and records only later events.
- Popup closure does not stop recording.
- A reload or same-origin navigation re-establishes instrumentation while the grant remains valid; cross-origin navigation ends the session with a visible explanation.
- Stopping captures the visible viewport, not a full-page image.

The UI must state “Only events after Start recording are included.”

### Privacy posture

The MVP is local-only and allowlist-based:

- Never collect DOM HTML, cookies, local/session storage, form values, keystrokes, request/response bodies, auth headers, or clipboard contents.
- Strip URL query strings and fragments by default. The user can restore/edit the URL during review.
- Safely serialize console arguments with depth, length, event-count, and total-size limits.
- Replace values whose keys match a built-in sensitive-key list (`authorization`, `token`, `password`, `secret`, `cookie`, `apiKey`, and variants).
- Mask email addresses and bearer/JWT-like values in strings.
- Apply serialization and secret filtering before diagnostics enter extension storage, then run the complete filter again before preview/export.
- Show a redaction summary and an editable preview before export.
- Treat the screenshot as potentially sensitive: show it prominently with Retake and Remove controls.
- Make Discard delete the complete session immediately.

No data leaves the browser in this MVP.

### Export behavior

“GitHub issue export” means local artifact generation, not authenticated issue creation:

- `issue.md` contains title, environment, numbered steps, expected behavior, actual behavior, console diagnostics in a fenced block, and a screenshot placeholder.
- `screenshot.png` is exported separately because a local image cannot be embedded reliably in a GitHub issue before upload.
- A “Copy issue Markdown” action supports pasting directly into GitHub.
- Blob downloads should be initiated from the review page, avoiding the broad `downloads` permission.

Direct GitHub/Linear creation, OAuth, a backend, `.reprokit.json`, network capture, automatic steps, and framework SDKs are post-MVP.

### Landing page

- Build `apps/web` with TanStack Start/Router, React, Vite, and Tailwind, following Thoughtline's working Netlify deployment shape.
- Keep the first release static in behavior: no account, analytics, contact form, server data, or extension-to-site communication.
- Required sections: outcome-led hero, product capture/review/export preview, three-step workflow, privacy boundaries, limitations, FAQ, open-source/repository link, and latest-release CTA.
- Use real screenshots from the packaged extension; do not ship placeholder mockups as product proof.
- Point installation to the latest GitHub Release until Chrome Web Store distribution exists.
- Configure Netlify's ignore rule so extension-only commits do not rebuild the site, while workspace dependency changes do.

## 4. User flow

### Start

The browser-action popup shows the current tab origin, a concise capture disclosure, and **Start recording**. Unsupported pages such as the Chrome Web Store display a specific error rather than a generic failure.

### Record

The popup shows status, elapsed time, diagnostic-event count, and an ordered manual-step editor. Users can add, edit, reorder, and delete steps. A badge or icon state indicates active recording when the popup is closed.

### Stop

**Stop and review** asks the background module to finalize metadata and take a visible-tab screenshot, then opens a full extension review page. A full page is used because popup state is too easy to lose while editing.

### Review

The review page presents:

- Issue title, expected behavior, and actual behavior.
- Ordered manual steps.
- Page URL, page title, capture time, browser version, operating-system family, and ReproKit version.
- Filtered diagnostic events with per-event removal.
- Screenshot preview with Retake and Remove.
- Redaction summary and a persistent “Nothing is uploaded” message.

Export remains disabled until the user has a title and at least one reproduction step.

### Export or discard

The user copies Markdown, downloads `issue.md`, downloads `screenshot.png`, or discards the draft. Successful export does not silently retain the session; the UI offers **Delete local draft** and defaults to deletion after confirmation.

## 5. Architecture

Use a small monorepo so domain logic is independently testable and later reusable by the SDK/CLI.

```text
reprokit/
├── apps/
│   ├── extension/
│   │   ├── entrypoints/           # thin WXT background/content/popup/review entrypoints
│   │   ├── src/application/       # capture workflow orchestration
│   │   ├── src/infrastructure/    # Chrome storage, screenshot, and injection implementations
│   │   ├── src/ui/                # feature-first popup/review UI and local primitives
│   │   └── wxt.config.ts          # manifest, permissions, React/Tailwind modules
│   └── web/
│       ├── src/routes/            # TanStack Start landing routes
│       ├── src/components/        # product sections and local UI primitives
│       ├── public/                # brand assets and real extension screenshots
│       ├── netlify.toml
│       └── vite.config.ts
├── packages/
│   ├── capture-model/            # session state machine and data contracts
│   ├── privacy/                  # safe serialization and redaction
│   └── issue-export/             # deterministic Markdown generation
├── examples/
│   └── broken-web-app/           # deterministic demo errors and sensitive fixtures
├── e2e/
├── CONTEXT.md
└── IMPLEMENTATION_PLAN.md
```

WXT entrypoints must remain thin. They compose the domain/application modules with Chrome implementations and React views; capture rules, filtering, validation, and Markdown generation must not live in entrypoint files. The landing page does not import extension runtime code. Share only portable brand tokens or artifact schemas when there is a real second caller.

### Deep modules and interfaces

#### CaptureSession module

Interface:

```ts
start(tab: CapturableTab): Promise<CaptureSession>
append(input: CaptureInput): Promise<CaptureSession>
stop(sessionId: SessionId): Promise<ReproductionDraft>
discard(sessionId: SessionId): Promise<void>
```

This module owns the lifecycle, size limits, event ordering, navigation rules, persistence, and recovery after service-worker suspension. Callers do not manipulate storage keys or session transitions.

#### PrivacyFilter module

Interface:

```ts
filter<T>(input: T, context: FilterContext): FilterResult<T>
```

`FilterResult` contains a safe value plus structured redaction notices. The same pure, deterministic module filters diagnostic values before persistence and the assembled draft before preview/export, so tests can prove sensitive fixtures never enter extension storage or generated artifacts.

#### IssueExport module

Interface:

```ts
render(draft: ReviewedDraft): ExportArtifacts
```

It owns Markdown escaping, diagnostic formatting, filenames, stable section ordering, and optional screenshot output. The review UI only supplies a valid reviewed draft.

Do not create adapter interfaces for browser APIs until a second implementation exists. Instead, keep thin Chrome-specific functions internal to the capture module and pass them as dependencies in tests.

### Runtime responsibilities

- **Injected MAIN-world script:** wraps selected console methods without changing their return behavior; listens to `error` and `unhandledrejection`; performs defensive, bounded serialization; posts tagged events.
- **Isolated content script:** accepts only messages with the exact ReproKit tag/version and current window source, validates their schema, and forwards them to the extension.
- **Background service worker:** owns commands and state transitions, batches event persistence, reacts to navigation/tab closure, updates the badge, and opens review.
- **Popup:** sends commands and renders session state. It contains no capture or export logic.
- **Review page:** edits the draft, invokes the privacy and export modules, previews artifacts, and initiates Blob downloads.
- **Landing app:** documents and demonstrates the packaged product, but has no runtime role in capture or export.

Persist bounded JSON session state in `chrome.storage.session`, not service-worker globals. Capture the screenshot at stop/review time and store its Blob in extension-owned IndexedDB so a large PNG cannot exhaust the storage-session quota; keep only the current draft and screenshot. Enforce initial limits of 500 diagnostic events, 32 KiB per event, and 2 MiB total serialized diagnostics; report dropped/truncated data in the draft.

All cross-context messages, storage records, form submissions, and export inputs use shared Zod schemas with inferred TypeScript types. Type assertions are not validation. This follows Thoughtline's strongest reusable pattern and is especially important because ReproKit accepts page-world messages from an untrusted tab.

## 6. Data contracts

Start with schema version `1` even though `.reprokit.json` export is deferred.

```ts
type ReproductionDraft = {
  schemaVersion: 1;
  id: string;
  status: 'ready-for-review';
  summary: string;
  expectedBehavior: string;
  actualBehavior: string;
  steps: Array<{ id: string; position: number; text: string }>;
  diagnostics: Array<{
    id: string;
    occurredAt: string;
    kind: 'console' | 'uncaught-error' | 'unhandled-rejection';
    level: 'log' | 'info' | 'warn' | 'error';
    message: string;
    stack?: string;
  }>;
  page: {
    origin: string;
    url: string;
    title: string;
    capturedAt: string;
    screenshot?: { mimeType: 'image/png'; blobId: string };
  };
  environment: {
    browser: string;
    platform: string;
    reproKitVersion: string;
  };
  filtering: {
    notices: Array<{ path: string; reason: string }>;
    truncatedEventCount: number;
    droppedEventCount: number;
  };
};
```

Runtime validation is required at every cross-context message seam. Use discriminated command/event envelopes with a protocol version; never trust page-world payloads just because they originated in the active tab.

## 7. Implementation milestones

### Milestone 0 — Thoughtline-aligned workspace skeleton (1 day)

- pnpm 11 workspace on Node 24+ with `apps/extension`, `apps/web`, and `packages/*`.
- WXT, React 19, TypeScript strict mode, Tailwind 4, Zod 4, React Hook Form, only the required Radix primitives, ESLint, Prettier, Vitest, Testing Library, Playwright, and axe.
- Loadable MV3 extension with popup, background worker, content script, and review entrypoints.
- TanStack Start landing route with the shared ReproKit brand foundation.
- Deterministic broken-web-app fixture.
- Husky/lint-staged and root scripts matching Thoughtline's `format:check -> lint -> typecheck -> test -> build` quality path.
- CI for both apps, extension Chromium tests, and frozen-lockfile installation.

Exit criteria: a clean checkout produces WXT's load-unpacked directory and a production landing build with root commands, and CI runs without browser-store or deployment credentials.

### Milestone 1 — Capture lifecycle and persistence (1–2 days)

- Implement the session state machine and commands.
- Start/stop/discard against one active tab.
- Persist to `chrome.storage.session`; restore UI after popup and worker restarts.
- Handle tab close, reload, same-origin navigation, and cross-origin navigation explicitly.
- Badge and popup status.

Exit criteria: no invalid transition is possible, only one session can record at a time, and suspension/reopening does not lose steps or diagnostics already received.

### Milestone 2 — Console and error capture (2–3 days)

- Install MAIN-world instrumentation only after Start.
- Capture `console.log/info/warn/error`, uncaught errors, and unhandled rejections.
- Preserve original console semantics.
- Implement circular-safe, getter-safe, depth/length-bounded serialization.
- Validate and batch messages through the content bridge.
- Surface dropped/truncated event counts.

Exit criteria: the fixture demonstrates every event kind; cyclic objects, throwing getters, huge values, and hostile page messages cannot crash the extension or exceed its bounds; recording never captures pre-start events.

### Milestone 3 — Steps, snapshot, and review (2–3 days)

- Ordered manual-step CRUD in popup and review page.
- Capture visible tab, filtered URL, title, time, browser/platform, and extension version on stop.
- Review/edit/remove all exported fields.
- Screenshot Retake/Remove and unsupported-page states.
- Accessible keyboard flow and clear empty/error states.

Exit criteria: a user can create and correct a complete draft without reopening DevTools, and every collected value is visible before export.

### Milestone 4 — Privacy filter and export (2–3 days)

- Pure privacy-filter pipeline with built-in key and string rules.
- Redaction notices in review.
- Deterministic GitHub Markdown renderer and filename normalization.
- Copy Markdown, download Markdown, and download PNG.
- Draft deletion and local-only disclosure.

Exit criteria: seeded secrets never appear in generated artifacts; snapshot tests cover Markdown escaping and section omission; no network request occurs during the full workflow.

### Milestone 5 — Hardening and release candidate (2–3 days)

- Playwright extension-flow tests against the fixture.
- Manual matrix on current Chrome stable and one Chromium derivative.
- Permission, CSP, dependency, bundle, and privacy audits.
- README, `PRIVACY.md`, `SECURITY.md`, and `CONTRIBUTING.md` with install, use, limitations, threat model, and support boundaries.
- WXT package output, tag-triggered GitHub Release workflow, archive-layout validation, and SHA-256 checksums.

Exit criteria: all acceptance scenarios pass from the packaged build, permissions are limited to `activeTab`, `scripting`, and `storage`, and documented limitations match observed behavior.

### Milestone 6 — Landing page and public launch path (2 days)

- Build the real outcome, workflow, privacy, limitations, FAQ, open-source, and installation sections.
- Capture final extension screenshots at stable viewport sizes and include meaningful alt text.
- Link the primary CTA to the latest GitHub Release and secondary CTA to the repository.
- Add responsive, keyboard, reduced-motion, metadata, social-preview, Lighthouse, and broken-link checks.
- Configure Netlify deployment and test its monorepo build-ignore rule using Thoughtline's fixture-based approach.

Exit criteria: the production site accurately represents the packaged extension, works without JavaScript-only server features, has no analytics/network collection, and deploys independently of extension-only changes.

Expected focused implementation time: roughly 12–17 engineering days.

## 8. Test strategy

### Unit tests

- All legal and illegal capture-state transitions.
- Event ordering, batching, truncation, and quotas.
- Serialization of primitives, errors, DOM-like objects, cycles, BigInt, symbols, throwing getters, deep objects, and huge strings.
- Redaction of sensitive keys, query strings, email addresses, bearer tokens, and JWT-like strings, including case and separator variants.
- Markdown escaping, empty optional sections, stable timestamps, and filenames.

### Integration tests

- Injected script -> window message -> content bridge -> background -> storage.
- Popup commands -> state change -> badge/UI refresh.
- Stop -> screenshot/metadata -> privacy filter -> reviewed draft.
- Worker restart and popup closure recovery.
- Navigation and tab-close cleanup.
- Zod rejection paths for malformed page messages, stale protocol versions, corrupt storage, and invalid review forms.

### End-to-end acceptance scenarios

1. Start, trigger fixture error, add two steps, stop, review, and export both files.
2. Trigger an error before Start and verify it is absent.
3. Include a token, email, password-like key, and URL query value; verify none reaches export.
4. Remove the screenshot and export a valid Markdown-only report.
5. Reload during recording and continue on the same origin.
6. Navigate to another origin and receive a clear stopped-session state.
7. Close and reopen the popup while recording without losing data.
8. Exceed every capture limit and receive a usable, honestly labeled truncated report.
9. Attempt capture on an unsupported/restricted page and receive actionable guidance.
10. Run the complete workflow with network access disabled.

### Landing-page checks

- Route renders every required section at mobile and desktop widths.
- Latest-release and repository CTAs resolve to the intended destinations.
- Product screenshots have alt text and do not expose test secrets or personal data.
- Reduced-motion mode removes nonessential transitions.
- Netlify skips extension-only commits and rebuilds for web, lockfile, root package, or workspace changes.

## 9. MVP acceptance criteria

- Installation: extension loads from the packaged build without console errors.
- Utility: exported Markdown includes environment, ordered steps, expected/actual behavior, and relevant diagnostics.
- Privacy: all collected fields are previewable/removable; defined secret fixtures do not appear in artifacts; no remote requests exist in extension code or runtime behavior.
- Reliability: popup closure and MV3 worker suspension do not lose accepted events or steps.
- Performance: normal capture adds no perceptible page interaction lag; event processing is bounded.
- Permissions: no `<all_urls>`, `tabs`, `downloads`, `debugger`, `webRequest`, or network host permission.
- Accessibility: start, step editing, stop, review, removal, and export are keyboard-operable with visible focus and announced status changes.
- Honesty: limitations explicitly state post-start capture, visible-viewport screenshots, main-frame-first support, bounded logs, and local artifact export rather than issue creation.
- Website: the landing page uses real product evidence, states the same permissions/privacy boundaries as the extension, and links to a checksum-verifiable GitHub Release.
- Tooling: WXT owns extension manifest/build/zip generation; the workspace passes the same class of frozen-install, formatting, lint, type, test, browser, and build gates proven in Thoughtline.

## 10. Risks and mitigations

| Risk                                                       | Impact                                 | Mitigation                                                                                                                                                                                                                      |
| ---------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users expect historical DevTools logs                      | Empty or misleading reports            | Explicit Start workflow, status badge, fixture onboarding, limitation copy                                                                                                                                                      |
| Page-world monkey-patching conflicts with applications     | Broken apps or missed logs             | Minimal wrappers, preserve receiver/arguments/return behavior, restore on stop where possible, extensive hostile fixtures                                                                                                       |
| The observed page can fabricate page-world messages        | False diagnostics                      | Treat all diagnostics as untrusted observations; exact source/tag/version checks, runtime schema validation, session/tab binding, and strict bounds prevent privilege or availability impact. Do not claim report authenticity. |
| Screenshots expose personal data                           | Privacy harm                           | Visible preview, Remove/Retake, no automatic upload, local-only artifacts                                                                                                                                                       |
| MV3 worker suspension loses state                          | Incomplete report                      | Storage-backed state, event batching, idempotent commands, restart tests                                                                                                                                                        |
| Console serialization triggers getters or explodes in size | Page side effects or extension failure | Descriptor-aware safe serializer and strict per-value/event/session budgets                                                                                                                                                     |
| Active-tab permission ends on navigation                   | Capture unexpectedly stops             | Same-origin behavior tested; cross-origin stop is explicit and recoverable                                                                                                                                                      |
| Markdown cannot carry a local PNG into GitHub              | Broken image                           | Export PNG separately and put attachment instructions in Markdown                                                                                                                                                               |
| Copying Thoughtline brings unrelated complexity            | Slower MVP                             | Reuse configurations and toolchain conventions only; add Radix primitives and shared packages on demonstrated need                                                                                                              |
| Landing page drifts from extension behavior                | Misleading distribution                | Generate screenshots from the release candidate and make product/privacy copy part of release review                                                                                                                            |

## 11. Scope after MVP

Prioritize only after observing real reports:

1. Versioned `.reprokit.json` import/export and a CLI renderer/validator.
2. Privacy-filtered failed-network metadata, excluding bodies and credentials.
3. Optional user-action capture and generated steps.
4. GitHub issue creation through least-privilege authentication; Linear adapter second, making the publishing seam real.
5. Small browser SDK for application version and feature-flag providers.
6. React, Vue, and Next.js adapters once the SDK interface is stable.
7. Self-hosted ingestion/viewer only when teams need shareable hosted bundles.

Do not build the server, SDK, framework adapters, or provider integrations in parallel with the extension MVP; each expands the privacy and compatibility surface before the core capture/review loop is validated.

## 12. First implementation slice

Build one vertical slice before completing the UI system:

1. Load the extension.
2. Start a storage-backed session on the fixture tab.
3. Inject one `console.error` listener.
4. Stop and capture one screenshot.
5. Render a read-only review page.
6. Download one deterministic `issue.md`.
7. Render the landing-page hero with a release CTA and one real screenshot from that slice.

Then harden the interfaces and add event types, editing, filtering, and polish. This slice proves the risky cross-context path early and gives every later milestone a working test harness.

## 13. Browser references

- [Manifest V3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [`chrome.scripting` and MAIN/ISOLATED execution worlds](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [`activeTab` permission lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [`chrome.tabs.captureVisibleTab`](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [`chrome.storage` for extension contexts](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Extension service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers)
