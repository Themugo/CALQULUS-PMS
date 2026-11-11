/**
 * _shared/callbackIp.ts
 *
 * Optional source-IP allow-list for payment-provider callbacks (defence in depth on top of the
 * per-transaction callback secret). Off unless MPESA_CALLBACK_ALLOWED_IPS is set to a
 * comma-separated list of exact IPs, so a wrong list can never silently block real money:
 * set it only after confirming Safaricom's current callback IPs for your shortcode.
 */
export function parseAllowedIps(raw: string | undefined | null): string[] {
  return String(raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || null;
  return headers.get("x-real-ip")?.trim() || null;
}

/** True when no list is configured, or the caller's IP is on it. */
export function isCallbackIpAllowed(headers: Headers, rawAllowList: string | undefined | null): boolean {
  const allowed = parseAllowedIps(rawAllowList);
  if (allowed.length === 0) return true;
  const ip = clientIpFromHeaders(headers);
  return !!ip && allowed.includes(ip);
}
