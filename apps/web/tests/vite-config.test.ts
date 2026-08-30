import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import webConfig from '../vite.config';

describe('web development configuration', () => {
  it('loads local server configuration from the workspace root', async () => {
    const workspaceRoot = resolve(process.cwd(), '../..');
    const config =
      typeof webConfig === 'function'
        ? await webConfig({
            command: 'serve',
            isPreview: false,
            isSsrBuild: false,
            mode: 'development',
          })
        : webConfig;

    expect(config.envDir).toBe(workspaceRoot);
  });
});
