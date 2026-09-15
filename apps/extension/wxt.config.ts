import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type WxtViteConfig } from 'wxt';

export default defineConfig({
  outDirTemplate: '.',
  zip: {
    name: 'BugReceipt',
    artifactTemplate: '{{name}}-{{version}}-{{browser}}.zip',
  },
  modules: ['@wxt-dev/module-react'],
  vite: (): WxtViteConfig => ({
    plugins: tailwindcss() as NonNullable<WxtViteConfig['plugins']>,
  }),
  manifest: {
    // Public Chrome Web Store key keeps unpacked builds on the published extension ID.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1PRwZ7KqZwa7UP282OKiJ8nsiUXuN5ADh9iOaoP6iwvI65/reaMWJrb2isH0hkmrgMIzzmZodY6DZ8xRHCi8eJcX3/zYUqq/T96oXwCN6Bvj00WPhdrxkEud/utKYbcmlZ6gOpAf2UysI0R2s+qcx3RDl5MHxKrDIvdsO+KC/EAjkWT1p65NZL8psCxm/VM8LiPEOyEN7aD7sPOSZ7ju9+/4DvhvSfo8iudbWxKp/F7molw0w15D5fPmAFjme9iW3zD7lTTVtAC0qbGXzvoz57/DkFDlBjE+Vy3yYNYKRwAfwzebBEK9JJDAd3EeeN79c5aStIktiKu+WIsDVFC5NwIDAQAB',
    name: 'BugReceipt',
    short_name: 'BugReceipt',
    description: 'Capture a clear, privacy-filtered bug reproduction bundle.',
    minimum_chrome_version: '125',
    permissions: ['activeTab', 'desktopCapture', 'debugger', 'sidePanel', 'storage'],
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
  },
});
