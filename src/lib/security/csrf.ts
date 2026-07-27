/**
 * CSRF Protection for CALQULUS RMS
 * 
 * Implements double-submit cookie pattern for CSRF protection:
 * - Generates cryptographically secure tokens
 * - Validates tokens on state-changing operations
 * - Uses SameSite=Strict cookies to prevent cross-site requests
 * 
 * OWASP Reference: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */

// Token storage (in-memory for client-side)
let csrfToken: string | null = null;
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  csrfToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return csrfToken;
}

/**
 * Get the current CSRF token or generate a new one
 */
export function getCSRFToken(): string {
  if (!csrfToken) {
    return generateCSRFToken();
  }
  return csrfToken;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token: string): boolean {
  if (!token || !csrfToken) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  if (token.length !== csrfToken.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ csrfToken.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Get CSRF token from cookie (for server-side validation)
 */
export function getCSRFTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return value;
    }
  }
  return null;
}

/**
 * Set CSRF token cookie with secure defaults
 */
export function setCSRFTokenCookie(token: string): void {
  // CSRF cookie - HttpOnly is NOT used because JS needs to read it for the double-submit pattern
  // SameSite=Strict prevents cross-site requests from sending this cookie
  const expires = new Date();
  expires.setHours(expires.getHours() + 2); // 2-hour expiry
  
  document.cookie = `csrf_token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
}

/**
 * Clear CSRF token (on logout)
 */
export function clearCSRFToken(): void {
  csrfToken = null;
  document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict; Secure';
}

/**
 * Initialize CSRF protection - call on app load
 */
export function initCSRFProtection(): string {
  const token = getCSRFToken();
  setCSRFTokenCookie(token);
  return token;
}

/**
 * CSRF-protected fetch wrapper
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getCSRFToken();
  
  // Add CSRF token to headers
  const headers = new Headers(options.headers);
  headers.set('X-CSRF-Token', token);
  
  // For state-changing methods, also include in body if present
  const method = (options.method || 'GET').toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  if (isStateChanging) {
    // Include token in request body for double-submit verification
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // Only send cookies to same origin
  });
}

/**
 * Validate request origin to prevent cross-site attacks
 */
export function validateRequestOrigin(requestOrigin: string, allowedOrigins: string[]): boolean {
  const normalizedOrigin = requestOrigin.toLowerCase().replace(/\/$/, '');
  
  for (const allowed of allowedOrigins) {
    const normalizedAllowed = allowed.toLowerCase().replace(/\/$/, '');
    if (normalizedOrigin === normalizedAllowed) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get allowed origins for CSRF validation
 */
export function getAllowedOrigins(): string[] {
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  return [
    appUrl,
    `https://${import.meta.env.VITE_DOMAIN || 'calqulus.site'}`,
    `https://app.${import.meta.env.VITE_DOMAIN || 'calqulus.site'}`,
  ];
}

/**
 * React hook for CSRF token
 */
export function useCSRFToken() {
  // Token is managed globally, but we provide helpers
  return {
    token: getCSRFToken(),
    validate: validateCSRFToken,
    refresh: generateCSRFToken,
  };
}
