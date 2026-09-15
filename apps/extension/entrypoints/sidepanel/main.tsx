import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../src/ui/tailwind.css';
import { installDesktopRecorderBridge } from '../../src/infrastructure/desktop-recorder';
import { SidePanelApp } from '../../src/ui/sidepanel/sidepanel-app';

const root = document.getElementById('root');
if (!root) throw new Error('BugReceipt side panel root is missing.');
installDesktopRecorderBridge();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <SidePanelApp />
  </React.StrictMode>,
);
