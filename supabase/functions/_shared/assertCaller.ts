import { getEnv } from "./env.ts";
import { getCorsHeaders } from "./cors.ts";
import { createClient } from "supabase/supabase-js@2";

function unauthorized(req: Request): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

/**
 * Internal/cron Edge Functions must not be callable with the anon key.
 * Service role bearer OR matching CRON_SECRET header is required.
 * Returns a Response to send, or null if the caller is privileged.
 */
export function rejectUnlessServiceOrCron(req: Request): Response | null {
  if (isServiceOrCron(req)) return null;
  return unauthorized(req);
}

export function isServiceRoleRequest(req: Request): boolean {
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization") ?? "";
  return Boolean(serviceKey && auth === `Bearer ${serviceKey}`);
}

export function isServiceOrCron(req: Request): boolean {
  const cronSecret = getEnv("CRON_SECRET", "");
  const cronHeader = req.headers.get("X-Cron-Secret") ?? "";
  if (isServiceRoleRequest(req)) return true;
  return Boolean(cronSecret && cronHeader === cronSecret);
}

/**
 * Allow a real user JWT, the service role, or CRON_SECRET.
 * Rejects the anon/publishable key used as a fake user.
 */
export async function rejectUnlessUserServiceOrCron(req: Request): Promise<Response | null> {
  if (isServiceOrCron(req)) return null;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return unauthorized(req);

  const token = authHeader.slice("Bearer ".length);
  const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"));
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return unauthorized(req);
  return null;
}
