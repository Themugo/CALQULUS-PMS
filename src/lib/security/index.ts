/**
 * Security Module - CALQULUS RMS
 * 
 * Central export for all security utilities.
 * 
 * @example
 * import { validateEmail, escapeHtml } from '@/lib/security';
 * import { AuthGuard } from '@/lib/security';
 * import { secureApiClient, auditLog } from '@/lib/security';
 */

export * from './waf-headers';
export * from './csrf';
export * from './inputValidation';
export * from './apiClient';
export * from './monitoring';
export * from './secureStorage';
export * from './auditLog';
export * from './requestSigning';

// Re-export from features
export { AuthGuard, useAuthCheck, withAuthGuard } from '@/features/auth/components/AuthGuard';
export {
  sanitizeAuthError,
  isAccountLockedOut,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  clearSession,
  validateSessionIntegrity,
  signupRedirectPath,
  portalLoginPath,
  ensureSignedInRole,
} from '@/features/auth/lib/authFlow';

// Type exports
export type { SecureStorage } from './secureStorage';
export type { AuditLogEntry, AuditEventType, LogLevel } from './auditLog';
export type { SignedRequest, SignatureVerification } from './requestSigning';
