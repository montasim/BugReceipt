import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../src/ui/tailwind.css';
import { ReviewApp } from '../../src/ui/review/review-app';
import { initializeTheme } from '../../src/ui/theme';

const root = document.getElementById('root');
if (!root) throw new Error('BugReceipt review root is missing.');

void initializeTheme().finally(() => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ReviewApp />
    </React.StrictMode>,
  );
});
