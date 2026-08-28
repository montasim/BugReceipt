import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(webRoot, '../..');

test('Netlify always deploys the web workspace from the root configuration', () => {
  const config = readFileSync(join(repoRoot, 'netlify.toml'), 'utf8');
  assert.match(config, /^\s*base\s*=\s*"apps\/web"/m);
  assert.match(config, /^\s*command\s*=\s*"pnpm --filter @bugreceipt\/web build"/m);
  assert.match(config, /^\s*publish\s*=\s*"dist\/client"/m);
  assert.doesNotMatch(
    config,
    /^\s*ignore\s*=/m,
    'an ignore hook can cancel valid monorepo configuration deploys',
  );
});
