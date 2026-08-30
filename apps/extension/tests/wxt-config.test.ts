import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import extensionConfig from '../wxt.config';

describe('extension build configuration', () => {
  it('loads browser-safe environment values from the workspace root', async () => {
    const workspaceRoot = resolve(process.cwd(), '../..');
    const viteConfig = await extensionConfig.vite?.({
      browser: 'chrome',
      command: 'build',
      manifestVersion: 3,
      mode: 'production',
    });

    expect(viteConfig?.envDir).toBe(workspaceRoot);
  });
});
