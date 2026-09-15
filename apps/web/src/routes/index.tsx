import { createFileRoute } from '@tanstack/react-router';
import { CleanLanding } from '../prototypes/landing/clean-landing';
import '../prototypes/landing/clean-landing.css';

export const Route = createFileRoute('/')({ component: CleanLanding });
