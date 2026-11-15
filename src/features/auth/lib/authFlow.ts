import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/features/auth/AuthContext";

const ROLE_LOGIN: Record<AppRole, string> = {
  manager: "/auth",
  submanager: "/auth",
  tenant: "/tenant/login",
  landlord: "/landlord/login",
  webhost: "/webhost/login",
  agency: "/agency/login",
  payer: "/payer/login",
};

export const portalLoginPath = (portal?: string | null): string => {
  switch (portal) {
    case "tenant":
      return ROLE_LOGIN.tenant;
    case "landlord":
      return ROLE_LOGIN.landlord;
    case "webhost":
      return ROLE_LOGIN.webhost;
    case "agency":
      return ROLE_LOGIN.agency;
    case "payer":
      return ROLE_LOGIN.payer;
    case "manager":
    default:
      return ROLE_LOGIN.manager;
  }
};

export const signupRedirectPath = (role: AppRole): string => {
  if (role === "tenant") return ROLE_LOGIN.tenant;
  if (role === "landlord") return ROLE_LOGIN.landlord;
  if (role === "webhost") return ROLE_LOGIN.webhost;
  if (role === "agency") return ROLE_LOGIN.agency;
  if (role === "payer") return ROLE_LOGIN.payer;
  return ROLE_LOGIN.manager;
};

/** True when the browser could not reach the auth backend at all (offline, DNS, paused project, blocked request). */
export const isNetworkAuthError = (message: string | undefined | null): boolean => {
  const msg = (message ?? "").toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("load failed") ||
    msg.includes("fetch failed") ||
    msg.includes("authretryablefetcherror") ||
    msg.includes("timed out") ||
    msg.includes("timeout")
  );
};

export const BACKEND_UNREACHABLE_MESSAGE =
  "We could not reach the CALQULUS service. Check your internet connection and try again. If it keeps happening, the service may be temporarily unavailable: contact support.";

export const sanitizeAuthError = (message: string): string => {
  const msg = message.toLowerCase();
  // Neutral wording: must not confirm whether an address has an account.
  if (msg.includes("already registered")) return "We could not create the account with these details. If you already have an account, sign in or reset your password.";
  if (msg.includes("invalid login credentials")) return "Invalid email or password.";
  if (msg.includes("email not confirmed")) return "Please verify your email address.";
  if (msg.includes("rate limit")) return "Too many attempts. Please try again later.";
  if (msg.includes("supabase is not configured")) return "Sign-in is not available on this deployment yet. Contact support.";
  if (msg.includes("jwt expired") || msg.includes("session_not_found") || msg.includes("session missing"))
    return "Your session has expired. Please sign in again.";
  if (msg.includes("user not found")) return "Invalid email or password.";
  if (isNetworkAuthError(message)) return BACKEND_UNREACHABLE_MESSAGE;
  return "An unexpected error occurred. Please try again.";
};

/** True when an auth error means the address is registered but not yet verified. */
export const isEmailNotConfirmedError = (message: string | undefined | null): boolean =>
  (message ?? "").toLowerCase().includes("email not confirmed");

const fetchCurrentUserRoles = async (): Promise<AppRole[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => row.role as AppRole)
    .filter(Boolean);
};

export const ensureSignedInRole = async (
  allowedRoles: AppRole[],
): Promise<{ ok: true; roles: AppRole[] } | { ok: false; roles: AppRole[]; message: string }> => {
  let roles: AppRole[];
  try {
    roles = await fetchCurrentUserRoles();
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      roles: [],
      message: isNetworkAuthError(raw)
        ? BACKEND_UNREACHABLE_MESSAGE
        : "We could not check your account access. Please try again.",
    };
  }
  if (roles.some((role) => allowedRoles.includes(role))) {
    return { ok: true, roles };
  }

  const allowed = allowedRoles.join(", ");
  return {
    ok: false,
    roles,
    message: roles.length
      ? `This account is registered as ${roles.join(", ")}. Please use the correct portal for that role.`
      : `This account has no active role. Please contact support or bootstrap the account first. Expected role: ${allowed}.`,
  };
};
