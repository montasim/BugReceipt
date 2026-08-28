# Contributing to BugReceipt

BugReceipt welcomes focused bug reports and pull requests that preserve its local-first privacy boundary.

## Development setup

Requirements:

- Node.js 24 or newer
- pnpm 11.7.0
- Chrome 120 or newer for extension testing

Install dependencies and run the complete quality gate:

```bash
pnpm install --frozen-lockfile
pnpm check
```

For extension development, run `pnpm dev:extension`. For the landing page, run `pnpm dev:web`.

## Pull requests

Keep changes narrow, explain the user-visible effect, and add or update tests for changed behavior. Before opening a pull request:

1. Run `pnpm check`.
2. Manually exercise Chrome permission, recording, review, and export flows when they are affected.
3. Confirm captured values are bounded and filtered before persistence.
4. Avoid adding broad host permissions, analytics, or uploads without an explicit product decision and privacy review.

## Reporting sensitive problems

Do not include secrets or real capture bundles in issues or pull requests. Follow [SECURITY.md](SECURITY.md) for vulnerabilities and [SUPPORT.md](SUPPORT.md) for ordinary help.

## License status

The repository is currently `UNLICENSED`. Opening an issue or pull request does not grant general permission to reuse or redistribute the project outside GitHub's applicable terms.
