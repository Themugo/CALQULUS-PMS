/**
 * Admin site separation.
 *
 * The platform-admin login and console are served only from a dedicated admin
 * host (default: `admin.<your-domain>`). The public site never exposes
 * `/webhost/*`: those paths fall through to the public landing page, and no
 * public page links to them.
 *
 * Configuration (all optional):
 *   VITE_ADMIN_HOSTS     comma-separated extra hostnames treated as the admin site
 *                        (for example a Vercel preview host used for staging)
 *   VITE_ADMIN_SITE_URL  full origin of the admin site, used when a signed-in
 *                        admin lands on the public host and must be sent across
 *
 * This is a routing/exposure boundary, not an authorization boundary: the
 * server-side role checks and RLS remain the real access control.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** Local development hosts serve both the public site and the admin routes. */
export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

/** True only for the dedicated admin site (admin.* or a configured extra host). */
export function isAdminHost(
  hostname: string,
  extraHosts: string | undefined = import.meta.env?.VITE_ADMIN_HOSTS,
): boolean {
  const host = hostname.toLowerCase();
  return host.startsWith("admin.") || parseList(extraHosts).includes(host);
}

/** Origin of the admin site for a given public hostname, or null if unknown. */
export function adminSiteOrigin(
  location: { protocol: string; hostname: string; port?: string },
  configured: string | undefined = import.meta.env?.VITE_ADMIN_SITE_URL,
): string | null {
  const explicit = (configured ?? "").trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  if (isAdminHost(location.hostname) || isLocalHost(location.hostname)) return null;
  const bare = location.hostname.replace(/^www\./i, "");
  // Only derive for real domains (has a dot); never guess for IPs/preview hosts.
  if (!bare.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(bare)) return null;
  return `${location.protocol}//admin.${bare}`;
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/webhost" || pathname.startsWith("/webhost/");
}
