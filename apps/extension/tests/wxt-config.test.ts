import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import extensionConfig, { getConfiguredReportEndpoint } from '../wxt.config';

describe('extension build configuration', () => {
  const productionReportEndpoint = 'https://bugreceipt.netlify.app/api/reports';

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

  it('replaces localhost report access with the deployed endpoint in production packages', () => {
    const originalEndpoint = process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT;
    process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT = 'http://localhost:3000/api/reports';

    try {
      expect(getConfiguredReportEndpoint('development')).toBe('http://localhost:3000/api/reports');
      expect(getConfiguredReportEndpoint('production')).toBe(productionReportEndpoint);
      process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT = 'https://bugreceipt.example/api/reports';
      expect(getConfiguredReportEndpoint('production')).toBe(
        'https://bugreceipt.example/api/reports',
      );
    } finally {
      if (originalEndpoint === undefined) delete process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT;
      else process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT = originalEndpoint;
    }
  });

  it('injects the deployed report endpoint into production runtime code', async () => {
    const originalEndpoint = process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT;
    process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT = 'http://localhost:3000/api/reports';

    try {
      const viteConfig = await extensionConfig.vite?.({
        browser: 'chrome',
        command: 'build',
        manifestVersion: 3,
        mode: 'production',
      });

      expect(getConfiguredReportEndpoint('production')).toBe(productionReportEndpoint);
      expect(viteConfig?.define).toMatchObject({
        'import.meta.env.VITE_BUGRECEIPT_REPORT_ENDPOINT': JSON.stringify(productionReportEndpoint),
      });
    } finally {
      if (originalEndpoint === undefined) delete process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT;
      else process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT = originalEndpoint;
    }
  });
});
