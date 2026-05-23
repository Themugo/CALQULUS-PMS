/**
 * Sentry wrapper — lazy, optional.
 *
 * Sentry is only initialized when VITE_SENTRY_DSN is set at build time.
 * If it is not set, every export below becomes a no-op so the app runs
 * fine without it (useful for local dev and for the open-source build).
 *
 * Why lazy import? Sentry's browser bundle is ~50KB gzipped. Only load it
 * when there is a DSN to send to — and even then, load it AFTER first
 * paint so it never blocks initial render.
 *
 * To enable in production:
 *   1. Add `VITE_SENTRY_DSN=https://xxx@sentry.io/yyy` to env
 *   2. Add `*.sentry.io` to CSP connect-src (already done in netlify.toml)
 *   3. Configure sentry-cli to upload source maps after `vite build` —
 *      see PRODUCTION_CHECKLIST.md for the recommended GitHub Actions step.
 *
 * If you'd rather use a different provider (Datadog, Rollbar, Highlight),
 * swap the implementation in `init()` and `captureException()`; the rest
 * of the app talks to this wrapper only.
 */

type SentryModule = typeof import("@sentry/browser");

let sentry: SentryModule | null = null;
let initPromise: Promise<void> | null = null;

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const environment = (import.meta.env.VITE_SENTRY_ENV as string | undefined)
  ?? (import.meta.env.PROD ? "production" : "development");
const release = import.meta.env.VITE_APP_VERSION as string | undefined;

export function initSentry(): Promise<void> {
  if (!dsn) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // @ts-expect-error — optional dep; install with `npm i @sentry/browser` to enable
      const mod = await import(/* @vite-ignore */ "@sentry/browser");
      sentry = mod;
      mod.init({
        dsn,
        environment,
        release,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0.1,
        // Strip query strings and most PII before sending. RentFlow handles
        // tenant phone numbers and email addresses — keep them out of error
        // reports unless absolutely necessary for debugging.
        beforeSend(event) {
          if (event.request?.url) {
            try {
              const u = new URL(event.request.url);
              u.search = "";
              event.request.url = u.toString();
            } catch { /* leave as-is */ }
          }
          delete event.user;
          return event;
        },
      });
    } catch (err) {
      console.warn("Sentry init failed (continuing without):", err);
    }
  })();

  return initPromise;
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!sentry) return;
  try {
    sentry.captureException(error, { extra: context });
  } catch { /* ignore */ }
}

export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (!sentry) return;
  try {
    sentry.captureMessage(message, { extra: context });
  } catch { /* ignore */ }
}

export const isSentryEnabled = Boolean(dsn);
