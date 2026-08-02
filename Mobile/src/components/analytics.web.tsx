import { Analytics as VercelAnalytics } from '@vercel/analytics/react';

// The injected script auto-tracks page views off the History API, which is what
// expo-router uses to navigate on web — no route/path wiring needed. Events only
// reach Vercel once Web Analytics is enabled for the project in the dashboard.
export function Analytics() {
  return <VercelAnalytics />;
}
