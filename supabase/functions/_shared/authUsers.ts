/**
 * Paginated helpers over auth.admin.listUsers().
 *
 * listUsers() with no arguments returns only the first page (50 users), so any
 * "does this email already exist?" check built on it silently stops working
 * once the project has more users than that. These helpers walk every page.
 */
// deno-lint-ignore no-explicit-any
type AdminClient = { rpc?: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: any }>; auth: { admin: { listUsers: (p?: { page?: number; perPage?: number }) => Promise<{ data: any; error: any }> } } };

const PER_PAGE = 1000;
const MAX_PAGES = 100; // hard stop: 100k users

export async function listAllAuthUsers(admin: AdminClient) {
  // deno-lint-ignore no-explicit-any
  const users: any[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return users;
}

export async function findAuthUserByEmail(admin: AdminClient, email: string) {
  const target = email.trim().toLowerCase();
  // Preferred: indexed lookup (migration 20260909000005, service_role only).
  if (admin.rpc) {
    const { data, error } = await admin.rpc("find_auth_user_id_by_email", { p_email: target });
    if (!error) return data ? { id: data as string, email: target } : null;
    // Only fall back when the RPC is not deployed yet; any other error must not be treated as "no user".
    if (!["42883", "PGRST202"].includes(error.code)) throw error;
  }
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    const batch = data?.users ?? [];
    const hit = batch.find((u: { email?: string | null }) => u.email?.toLowerCase() === target);
    if (hit) return hit;
    if (batch.length < PER_PAGE) break;
  }
  return null;
}
