import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type WxtViteConfig } from 'wxt';

const LOCAL_REPORT_ENDPOINT = 'http://localhost:3000/api/reports';

export default defineConfig({
  outDirTemplate: '.',
  modules: ['@wxt-dev/module-react'],
  vite: (): WxtViteConfig => ({
    plugins: tailwindcss() as NonNullable<WxtViteConfig['plugins']>,
  }),
  manifest: ({ mode }) => {
    const reportEndpoint =
      process.env.VITE_BUGRECEIPT_REPORT_ENDPOINT ||
      process.env.VITE_REPROKIT_REPORT_ENDPOINT ||
      (mode === 'development' ? LOCAL_REPORT_ENDPOINT : '');
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
