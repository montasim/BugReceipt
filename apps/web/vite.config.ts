import netlify from '@netlify/vite-plugin-tanstack-start';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

const WORKSPACE_ROOT = resolve(process.cwd(), '../..');
const SERVER_ENVIRONMENT_KEYS = [
  'RESEND_API_KEY',
  'BUGRECEIPT_REPORT_FROM',
  'BUGRECEIPT_REPORT_TO',
  'BUGRECEIPT_EXTENSION_ORIGIN',
] as const;

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    const workspaceEnvironment = loadEnv(mode, WORKSPACE_ROOT, '');
    for (const key of SERVER_ENVIRONMENT_KEYS) {
      process.env[key] ||= workspaceEnvironment[key];
    }
  }

  return {
    envDir: WORKSPACE_ROOT,
    resolve: { tsconfigPaths: true },
    plugins: [devtools(), netlify(), tailwindcss(), tanstackStart(), viteReact()],
  };
});
