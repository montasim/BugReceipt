import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '../prototypes/landing/landing-page';
import '../prototypes/landing/site.css';
import '../prototypes/landing/landing.css';

export const Route = createFileRoute('/')({ component: LandingPage });
