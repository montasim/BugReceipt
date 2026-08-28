import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../src/ui/globals.css';
import { ReviewApp } from '../../src/ui/review/review-app';

const root = document.getElementById('root');
if (!root) throw new Error('BugReceipt review root is missing.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ReviewApp />
  </React.StrictMode>,
);
