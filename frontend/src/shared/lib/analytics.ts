/**
 * PostHog, loaded lazily from a script tag rather than an npm dependency.
 *
 * Two reasons: it keeps analytics out of the main bundle entirely when it is
 * switched off, and it means adding or removing it never touches
 * package-lock.json or forces a dependency rebuild.
 *
 * Entirely inert unless VITE_POSTHOG_KEY is set at build time. Nothing is
 * loaded, no network request is made, and `capture()` is a no-op — so the
 * default state of this self-hosted dashboard is that no usage data leaves
 * the server.
 */

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://eu.i.posthog.com';
// Autocapture records every click and input by default. Off unless asked for,
// because this app's DOM contains device serials, personnel names and expense
// amounts that have no business being in a third-party event stream.
const AUTOCAPTURE = import.meta.env.VITE_POSTHOG_AUTOCAPTURE === 'true';

export const analyticsEnabled = Boolean(KEY);

interface PostHogLike {
  init: (key: string, opts: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
  [k: string]: unknown;
}

declare global {
  interface Window {
    posthog?: PostHogLike;
  }
}

let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${HOST.replace(/\/$/, '')}/static/array.js`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('posthog failed to load'));
    document.head.appendChild(s);
  });
  return loading;
}

export async function initAnalytics(): Promise<void> {
  if (!analyticsEnabled) return;
  try {
    await loadScript();
    window.posthog?.init(KEY as string, {
      api_host: HOST,
      autocapture: AUTOCAPTURE,
      capture_pageview: false, // routed manually below — this is an SPA
      disable_session_recording: true,
      persistence: 'localStorage',
    });
  } catch {
    // Analytics must never break the app it measures.
  }
}

/** Custom event. Safe to call whether or not analytics is configured. */
export function capture(event: string, props?: Record<string, unknown>): void {
  if (!analyticsEnabled) return;
  window.posthog?.capture(event, props);
}

/** SPA route change — react-router does not trigger a page load. */
export function capturePageview(path: string): void {
  if (!analyticsEnabled) return;
  window.posthog?.capture('$pageview', { $current_url: window.location.origin + path });
}

/**
 * Ties events to a user. Deliberately id + role only: no email, no name.
 * This dashboard holds personnel and finance records and none of that needs
 * to reach an analytics vendor to answer "which pages get used".
 */
export function identify(userId: string, role?: string): void {
  if (!analyticsEnabled) return;
  window.posthog?.identify(userId, role ? { role } : undefined);
}

export function resetAnalytics(): void {
  if (!analyticsEnabled) return;
  window.posthog?.reset();
}
