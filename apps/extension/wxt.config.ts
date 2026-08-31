import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig, type WxtViteConfig } from 'wxt';

const LOCAL_REPORT_ENDPOINT = 'http://localhost:3000/api/reports';
const PRODUCTION_REPORT_ENDPOINT = 'https://bugreceipt.netlify.app/api/reports';
const WORKSPACE_ROOT = resolve(process.cwd(), '../..');

export function getConfiguredReportEndpoint(mode: string): string {
  const workspaceEnvironment = loadEnv(mode, WORKSPACE_ROOT, '');
  const endpoint = (
    process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT ||
    workspaceEnvironment.VITE_BUGRECEIPT_REPORT_ENDPOINT ||
    ''
  ).trim();
  if (mode === 'development') return endpoint || LOCAL_REPORT_ENDPOINT;
  if (!endpoint || isLocalReportEndpoint(endpoint)) return PRODUCTION_REPORT_ENDPOINT;
  return endpoint;
}

function isLocalReportEndpoint(endpoint: string): boolean {
  if (!endpoint) return false;
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(endpoint).hostname);
  } catch {
    return false;
  }
}

export default defineConfig({
  outDirTemplate: '.',
  modules: ['@wxt-dev/module-react'],
  vite: ({ mode }): WxtViteConfig => ({
    envDir: WORKSPACE_ROOT,
    define: {
      'import.meta.env.VITE_BUGRECEIPT_REPORT_ENDPOINT': JSON.stringify(
        getConfiguredReportEndpoint(mode),
      ),
    },
    plugins: tailwindcss() as NonNullable<WxtViteConfig['plugins']>,
  }),
  manifest: ({ mode }) => {
    const reportEndpoint = getConfiguredReportEndpoint(mode);
    const reportOrigin = reportEndpoint ? `${new URL(reportEndpoint).origin}/*` : null;

    return {
      name: 'BugReceipt',
      short_name: 'BugReceipt',
      description: 'Capture a clear, privacy-filtered bug reproduction bundle.',
      minimum_chrome_version: '120',
      permissions: [
        'activeTab',
        'clipboardWrite',
        'desktopCapture',
        'downloads',
        'scripting',
        'sidePanel',
        'storage',
        'tabs',
      ],
      optional_host_permissions: ['http://*/*', 'https://*/*'],
      host_permissions: reportOrigin ? [reportOrigin] : [],
      icons: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
      action: {
        default_title: 'Capture a bug with BugReceipt',
        default_icon: {
          16: 'icon/16.png',
          32: 'icon/32.png',
        },
      },
    };
  },
});
