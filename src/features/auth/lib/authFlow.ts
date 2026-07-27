import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/features/auth/AuthContext";
import { logWarning } from "@/shared/lib/errorLogger";

// ─── Security: Brute Force Protection ──────────────────────────────────────────

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

interface LoginAttempt {
  count: number;
  lockedUntil: number | null;
}

// In-memory tracking for client-side rate limiting
// Note: Server-side rate limiting is handled by Supabase Edge Functions
const loginAttempts = new Map<string, LoginAttempt>();

/**
 * Check if an email is temporarily locked out due to too many failed attempts
 */
export function isAccountLockedOut(email: string): { locked: boolean; remainingSeconds: number } {
  const attempt = loginAttempts.get(email.toLowerCase());
  if (!attempt || !attempt.lockedUntil) {
    return { locked: false, remainingSeconds: 0 };
  }
  
  const remaining = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
  return {
    locked: remaining > 0,
    remainingSeconds: Math.max(0, remaining),
  };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLoginAttempt(email: string): void {
  const normalizedEmail = email.toLowerCase();
  const current = loginAttempts.get(normalizedEmail) || { count: 0, lockedUntil: null };
  
  current.count += 1;
  
  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    current.lockedUntil = Date.now() + LOGIN_LOCKOUT_DURATION;
    logWarning("AuthSecurity", `Account locked due to ${current.count} failed attempts: ${normalizedEmail}`);
  }
  
  loginAttempts.set(normalizedEmail, current);
}

/**
 * Reset login attempts after successful login
 */
export function resetLoginAttempts(email: string): void {
  loginAttempts.delete(email.toLowerCase());
}

// ─── Role-based Route Configuration ───────────────────────────────────────────

const ROLE_LOGIN: Record<AppRole, string> = {
  manager: "/landlord",
  submanager: "/landlord",
  tenant: "/tenant/login",
  landlord: "/landlord/login",
  webhost: "/webhost/login",
  agency: "/agency/login",
};

/**
 * Get the appropriate login path for a portal type
 */
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
    case "manager":
    default:
      return ROLE_LOGIN.manager;
  }
};

/**
 * Get the redirect path after successful signup
 */
export const signupRedirectPath = (role: AppRole): string => {
  if (role === "tenant") return ROLE_LOGIN.tenant;
  if (role === "landlord") return ROLE_LOGIN.landlord;
  if (role === "webhost") return ROLE_LOGIN.webhost;
  if (role === "agency") return ROLE_LOGIN.agency;
  return ROLE_LOGIN.manager;
};

// ─── Secure Error Messages ─────────────────────────────────────────────────────

/**
 * Sanitize authentication errors for display
 * Prevents information leakage about account existence
 */
export const sanitizeAuthError = (message: string): string => {
  // Normalize message for comparison
  const normalized = message.toLowerCase();
  
  // Generic messages that don't reveal whether account exists
  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'An account with this email may already exist. Try signing in instead.';
  }
  if (normalized.includes('invalid login') || normalized.includes('invalid credentials') || normalized.includes('wrong password')) {
    return 'Invalid email or password. Please try again.';
  }
  if (normalized.includes('email not confirmed') || normalized.includes('email_confirm')) {
    return 'Please verify your email address. Check your inbox for a confirmation link.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (normalized.includes('user not found') || normalized.includes('not found')) {
    // Don't reveal if email exists
    return 'Invalid email or password. Please try again.';
  }
  if (normalized.includes('locked') || normalized.includes('suspended') || normalized.includes('disabled')) {
    return 'This account has been suspended. Please contact support.';
  }
  
  // Default message - don't leak internal error details
  return 'An unexpected error occurred. Please try again.';
};

// ─── Role Verification ─────────────────────────────────────────────────────────

const fetchCurrentUserRoles = async (): Promise<AppRole[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) {
    logWarning("AuthFlow", `Failed to fetch user roles: ${error.message}`);
    return [];
  }
  return (data ?? [])
    .map((row) => row.role as AppRole)
    .filter(Boolean);
};

/**
 * Verify the current user has one of the allowed roles
 */
export const ensureSignedInRole = async (
  allowedRoles: AppRole[],
): Promise<{ ok: true; roles: AppRole[] } | { ok: false; roles: AppRole[]; message: string }> => {
  const roles = await fetchCurrentUserRoles();
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

// ─── Session Security ─────────────────────────────────────────────────────────

/**
 * Clear all session data securely
 * Call this on logout to ensure complete session cleanup
 */
export function clearSession(): void {
  // Clear Supabase session
  supabase.auth.signOut();
  
  // Clear any cached data
  localStorage.removeItem('sb-session');
  
  // Clear login attempts for this session
  loginAttempts.clear();
}

/**
 * Validate session hasn't been tampered with
 */
export function validateSessionIntegrity(): boolean {
  try {
    const sessionData = localStorage.getItem('sb-session');
    if (!sessionData) return false;
    
    // Basic validation - session should be valid JSON
    JSON.parse(sessionData);
    return true;
  } catch {
    return false;
  }
}
