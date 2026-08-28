import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stdout } from 'node:process';

const output = resolve(import.meta.dirname, '../.output');
const manifest = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8'));
const expectedTitle = 'Capture a bug with BugReceipt';
const iconSizes = ['16', '32', '48', '128'];
const requiredPermissions = ['clipboardWrite', 'desktopCapture', 'sidePanel', 'tabs'];
const requiredOptionalOrigins = ['http://*/*', 'https://*/*'];

if (manifest.action?.default_title !== expectedTitle) {
  throw new Error(`Unexpected toolbar title: ${manifest.action?.default_title ?? 'missing'}`);
}

if (manifest.side_panel?.default_path !== 'sidepanel.html') {
  throw new Error('The persistent BugReceipt side panel is not configured.');
}

await access(resolve(output, 'sidepanel.html'));
for (const permission of requiredPermissions) {
  if (!manifest.permissions?.includes(permission)) {
    throw new Error(`Required extension permission is missing: ${permission}`);
  }
}

for (const origin of requiredOptionalOrigins) {
  if (!manifest.optional_host_permissions?.includes(origin)) {
    throw new Error(`Required optional host pattern is missing: ${origin}`);
  }
}

for (const size of iconSizes) {
  const iconPath = manifest.icons?.[size];
  if (!iconPath) throw new Error(`Manifest icon ${size}px is missing.`);
  await access(resolve(output, iconPath));
}

for (const size of ['16', '32']) {
  const iconPath = manifest.action?.default_icon?.[size];
  if (!iconPath) throw new Error(`Toolbar icon ${size}px is missing.`);
  await access(resolve(output, iconPath));
}

stdout.write('Release package manifest and icon assets are valid.\n');
