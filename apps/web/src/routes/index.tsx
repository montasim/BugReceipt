import { createFileRoute } from '@tanstack/react-router';
import { LandingPage, themeScript } from '../landing/landing-page';
import '../landing/landing.css';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ property: 'og:url', content: 'https://bugreceipt.netlify.app' }],
    links: [
      { rel: 'canonical', href: 'https://bugreceipt.netlify.app' },
      { rel: 'preload', as: 'image', href: '/video/launch-poster.jpg' },
    ],
    scripts: [{ children: themeScript }],
  }),
  component: LandingPage,
});
