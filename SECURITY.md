# Security policy

BugReceipt captures browser diagnostics and visual evidence, so security reports may themselves contain sensitive data. Do not open a public issue for a suspected vulnerability or attach a real capture bundle to one.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/montasim/BugReceipt/security/advisories/new). Include the affected version, the smallest safe reproduction, the impact, and any suggested mitigation. Remove credentials, tokens, personal data, recordings, and production payloads unless they are essential to the report.

You should receive an acknowledgement through the GitHub advisory within seven days. Resolution timing depends on severity and reproducibility; no public disclosure date is promised before a fix is available.

## Supported versions

BugReceipt is currently a pre-release project. Security fixes are applied to the latest release and the `main` branch; older unpacked builds are not maintained.

## Scope

Reports about local redaction failures, unintended evidence retention or upload, extension permission escalation, report-endpoint authorization, and dependency vulnerabilities are in scope. Ordinary bugs and feature requests belong in [GitHub Issues](https://github.com/montasim/BugReceipt/issues).
