import { getEnv } from "./env.ts";
import { getCorsHeaders } from "./cors.ts";

/**
 * Internal/cron Edge Functions must not be callable with the anon key.
 * Service role bearer OR matching CRON_SECRET header is required.
 * Returns a Response to send, or null if the caller is privileged.
 */
export function rejectUnlessServiceOrCron(req: Request): Response | null {
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = getEnv("CRON_SECRET", "");
  const auth = req.headers.get("Authorization") ?? "";
  const cronHeader = req.headers.get("X-Cron-Secret") ?? "";

  if (serviceKey && auth === `Bearer ${serviceKey}`) return null;
  if (cronSecret && cronHeader === cronSecret) return null;

  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export function isServiceRoleRequest(req: Request): boolean {
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization") ?? "";
  return Boolean(serviceKey && auth === `Bearer ${serviceKey}`);
}
