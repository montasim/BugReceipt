import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import extensionConfig, { getConfiguredReportEndpoint } from '../wxt.config';

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

  it('keeps localhost report access out of production extension packages', () => {
    const originalEndpoint = process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT;
    process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT = 'http://localhost:3000/api/reports';

    try {
      expect(getConfiguredReportEndpoint('development')).toBe('http://localhost:3000/api/reports');
      expect(getConfiguredReportEndpoint('production')).toBe('');
      process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT = 'https://bugreceipt.example/api/reports';
      expect(getConfiguredReportEndpoint('production')).toBe(
        'https://bugreceipt.example/api/reports',
      );
    } finally {
      if (originalEndpoint === undefined) delete process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT;
      else process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT = originalEndpoint;
    }
  });
});
