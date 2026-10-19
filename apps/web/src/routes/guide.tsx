import { createFileRoute } from '@tanstack/react-router';
import { GuidePage } from '../prototypes/landing/guide-page';
import '../prototypes/landing/site.css';

export const Route = createFileRoute('/guide')({
  head: () => ({
    meta: [
      { title: 'BugReceipt user guide · Every feature, step by step' },
      {
        name: 'description',
        content:
          'How to install BugReceipt, capture a tab, add reproduction steps, review visual, console, and network evidence, export a local report, and suggest text corrections.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://bugreceipt.netlify.app/guide' }],
  }),
  component: GuidePage,
});
