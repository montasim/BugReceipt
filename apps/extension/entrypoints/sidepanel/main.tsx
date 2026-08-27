import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../src/ui/globals.css';
import { installDesktopRecorderBridge } from '../../src/infrastructure/desktop-recorder';
import { PopupApp } from '../../src/ui/popup/popup-app';

const root = document.getElementById('root');
if (!root) throw new Error('ReproKit side panel root is missing.');
installDesktopRecorderBridge();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
