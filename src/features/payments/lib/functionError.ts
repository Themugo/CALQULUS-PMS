/**
 * Turn a failed `supabase.functions.invoke` result into a message a person can act on.
 *
 * supabase-js reports any non-2xx response as the generic
 * "Edge Function returned a non-2xx status code" and leaves the real reason (for example
 * "Amount mismatch" or "A payment request for these bills is already waiting") inside
 * `error.context`, an unread Response. Without this, tenants only ever saw the generic text.
 */
const GENERIC = /non-2xx|failed to send a request|fetch failed/i;

interface ErrorLike { message?: unknown; context?: unknown }

export async function functionErrorMessage(
  error: unknown,
  data: unknown,
  fallback: string,
): Promise<string> {
  const fromBody = (body: unknown): string | null => {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    for (const key of ["error", "message"]) {
      const v = b[key];
      if (typeof v === "string" && v.trim()) return v.trim().slice(0, 300);
    }
    return null;
  };

  const direct = fromBody(data);
  if (direct) return direct;

  const ctx = (error as ErrorLike | null | undefined)?.context;
  if (ctx && typeof (ctx as { json?: unknown }).json === "function") {
    try {
      const source = typeof (ctx as { clone?: unknown }).clone === "function"
        ? (ctx as { clone: () => { json: () => Promise<unknown> } }).clone()
        : (ctx as { json: () => Promise<unknown> });
      const parsed = fromBody(await source.json());
      if (parsed) return parsed;
    } catch {
      /* body was not JSON */
    }
  }

  const message = (error as ErrorLike | null | undefined)?.message;
  if (typeof message === "string" && message.trim() && !GENERIC.test(message)) return message.trim().slice(0, 300);
  return fallback;
}
