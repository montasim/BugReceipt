---
version: 1
slug: 'apps-web-src-routes-index-tsx'
primary_target: 'apps/web/src/routes/index.tsx'
related_targets: ['apps/web/src/styles.css', 'apps/web/src/server.ts']
---

# BugReceipt landing page

- Scope and mode: `/` web landing page; Persuade.
- Audience and job: QA engineers, developers, and support teams need to understand the evidence BugReceipt collects and confidently download the current Chrome pre-release.
- Primary action: Download the latest BugReceipt release from GitHub.
- Thesis: One uninterrupted evidence trace turns a broken browser moment into a reproducible local report.
- Chosen form: Failure Trace Timeline, the fourth grounded structure, concept seed `a8f5b8a7`. A five-event trace carries the visitor through Record, Console, Network, Review, and Export; the real animated extension workflow docks to the active moment.
- First viewport: A large benefit statement and GitHub download action lead beside an extension-faithful capture panel. The five-event trace crosses the fold into real screen, console, network, manual-review, and export evidence, followed immediately by the local-first boundary.
- Product tour: Use the real BugReceipt extension tour, animated only while the page is visible, the tour is near the viewport, and reduced motion is not requested. Otherwise show its static poster.
- Product boundary: BugReceipt is local-first, requires no account or cloud, records only after the user starts, and captures the selected tab, console, network, manual steps, and screen evidence for local review and explicit export. Do not imply automatic upload or collection before capture starts.
- Distribution boundary: The primary action opens the current GitHub pre-release. Installation requires the unpacked extension flow; do not claim Chrome Web Store availability.
- Visual constraints: Preserve the Evidence Desk palette and roles: ink `#102332`; decorative muted `#61737d` with accessible muted text `#536873`; paper `#f8fbfc`; fog `#eef3f5`; line `#bacbd2`; decorative coral `#ff5c3a` with text coral `#c33b24`; decorative teal `#1f9fae` with text teal `#0b6f7a`. Use Bricolage Grotesque for the editorial voice, JetBrains Mono only for time, code, and measurement, and square geometry throughout.
- Typography scale: Keep the landing display within `48–60px`, shared section headlines within `34–40px`, component titles at `22px`, item titles at `18px`, lead copy at `17px`, body copy at `16px`, compact UI text at `14px`, controls at `13px`, diagnostic labels at `11.5px`, and dense evidence text at `11px`. Use the same clamps at mobile widths so narrowing the viewport never increases a heading.
- Spatial rhythm: Build from a 4px-derived spacing scale. Keep evidence interiors dense at `8–28px`, related groups at `24–48px`, primary desktop chapters within `72–96px`, supporting chapters within `64–80px`, and mobile chapters at `64px`. The final CTA must use responsive block padding rather than a taller fixed mobile minimum height.
- Anti-patterns: Keep the trace semantic and restrained. Do not collapse the page into generic SaaS cards, a decorative stepper, rounded containers, gradients, glass surfaces, or invented social proof.
- Memorable moment: The visitor can follow one failure from the first recorded frame to the final local report without changing visual systems.
- Approved direction artifact: `.impeccable/mocks/decision/failure-trace.webp` and its provenance sidecar.
- Final review evidence: `.impeccable/review/hero-repro.png` (`1521×1014`, captured from a `1536×1024` viewport), `.impeccable/review/desktop.png` (`1265×712`, captured from a `1280×720` viewport), and `.impeccable/review/mobile.png` (`375×812`, captured from a `390×844` viewport).
- Finish disposition: SHIP. Independent review found no blockers; the landing page carries the approved Failure Trace Timeline, extension-faithful five-event evidence, real product tour, restrained square editorial styling, and truthful GitHub pre-release positioning.
- Unresolved decisions: None.
