import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../src/ui/tailwind.css';
import { installDesktopRecorderBridge } from '../../src/infrastructure/desktop-recorder';
import { SidePanelApp } from '../../src/ui/sidepanel/sidepanel-app';
import { initializeTheme } from '../../src/ui/theme';

const root = document.getElementById('root');
if (!root) throw new Error('BugReceipt side panel root is missing.');
installDesktopRecorderBridge();

void initializeTheme().finally(() => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SidePanelApp />
    </React.StrictMode>,
  );
});
