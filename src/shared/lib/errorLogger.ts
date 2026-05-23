/**
 * RentFlow Error Logger — Production Observability
 *
 * Two sinks:
 *   1. Supabase `activity_logs` table (always on) — auditable, queryable,
 *      and visible to webhost admins from inside the app.
 *   2. Sentry (optional, enabled when VITE_SENTRY_DSN is set) — gives us
 *      stack traces with source maps, release tagging, and alerting.
 *
 * View activity-log errors:
 *   SELECT * FROM activity_logs WHERE action LIKE 'error:%' ORDER BY created_at DESC;
 */
import { createClient } from '@supabase/supabase-js';
import { captureException, captureMessage } from './sentry';

const isDev = import.meta.env.DEV;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let _client: ReturnType<typeof createClient> | null = null;
const getClient = () => {
  if (!_client && supabaseUrl && supabaseKey) _client = createClient(supabaseUrl, supabaseKey);
  return _client;
};

const sanitize = (e: unknown): string => {
  if (e instanceof Error) return isDev ? e.message + '\n' + e.stack : e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return 'Unknown error'; }
};

export const logError = (context: string, error: unknown): void => {
  const msg = sanitize(error);
  if (isDev) console.error('[ERROR] ' + context + ':', error);

  // Sentry: send the actual error object so stack frames are preserved.
  captureException(error instanceof Error ? error : new Error(msg), { context });

  getClient()?.from('activity_logs').insert({
    action: 'error:' + context,
    entity_type: 'error',
    entity_label: msg.slice(0, 200),
    metadata: { context, message: msg, timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.pathname : null },
  }).then().catch(() => {});
};

export const logWarning = (context: string, message: unknown): void => {
  const msg = sanitize(message);
  if (isDev) console.warn('[WARN] ' + context + ':', message);

  captureMessage(`[${context}] ${msg.slice(0, 200)}`, { context });

  getClient()?.from('activity_logs').insert({
    action: 'warning:' + context, entity_type: 'warning',
    entity_label: msg.slice(0, 200),
    metadata: { context, message: msg, timestamp: new Date().toISOString() },
  }).then().catch(() => {});
};

export const logDebug = (context: string, data: unknown): void => {
  if (isDev) console.debug('[DEBUG] ' + context + ':', data);
};

export const logAudit = (params: {
  action: string; entityType?: string; entityId?: string;
  entityLabel?: string; managerId?: string; propertyId?: string;
  metadata?: Record<string, unknown>;
}): void => {
  getClient()?.from('activity_logs').insert({
    action: params.action, entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null, entity_label: params.entityLabel ?? null,
    manager_id: params.managerId ?? null, property_id: params.propertyId ?? null,
    metadata: params.metadata ?? null,
  }).then().catch(() => {});
};

export const initGlobalErrorCatcher = (): void => {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => logError('window.onerror', { message: e.message, filename: e.filename, lineno: e.lineno }));
  window.addEventListener('unhandledrejection', (e) => logError('unhandledRejection', e.reason));
};
