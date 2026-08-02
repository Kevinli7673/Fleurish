// Vercel Web Analytics only exists for the web build (see analytics.web.tsx).
// On iOS/Android this renders nothing, which also keeps the browser-only
// package out of the native bundle.
export function Analytics() {
  return null;
}
