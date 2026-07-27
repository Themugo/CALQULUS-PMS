/**
 * Input Validation and Sanitization for CALQULUS RMS
 * 
 * Provides OWASP-compliant input validation and output encoding:
 * - Server-side validation for all user inputs
 * - XSS prevention through output encoding
 * - SQL injection prevention through parameterized queries
 * - Path traversal prevention
 * 
 * OWASP Top 10: A03:2021 - Injection, A01:2021 - Broken Access Control
 */

// ─── Input Validation Patterns ────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const KENYA_PHONE_REGEX = /^(\+254|254|0)[17]\d{8}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;
const NUMERIC_REGEX = /^\d+$/;
const AMOUNT_REGEX = /^\d{1,12}(\.\d{1,2})?$/;

// Sanitized characters for general text (allows basic punctuation)
const SAFE_TEXT_REGEX = /^[\p{L}\p{N}\s.,!?'"()-:;@#$%&*+=\/\\[\]{}|~^`<>]*$/u;

// ─── Validation Functions ─────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
  value?: string;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email exceeds maximum length' };
  }
  
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate Kenya phone number
 */
export function validateKenyaPhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }
  
  // Remove spaces and common formatting
  const cleaned = phone.replace(/\s|-/g, '');
  
  // Normalize to +254 format
  let normalized = cleaned;
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    normalized = '+' + cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    normalized = '+254' + cleaned.substring(1);
  }
  
  if (!KENYA_PHONE_REGEX.test(normalized)) {
    return { valid: false, error: 'Invalid Kenya phone number format (use +254XXX... or 07XXX...)' };
  }
  
  return { valid: true, value: normalized };
}

/**
 * Validate UUID format
 */
export function validateUUID(id: string): ValidationResult {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID is required' };
  }
  
  if (!UUID_REGEX.test(id)) {
    return { valid: false, error: 'Invalid ID format' };
  }
  
  return { valid: true, value: id.toLowerCase() };
}

/**
 * Validate numeric amount (for payments)
 */
export function validateAmount(amount: number | string): ValidationResult {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }
  
  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  
  if (numAmount > 999999999999) {
    return { valid: false, error: 'Amount exceeds maximum allowed value' };
  }
  
  return { valid: true, value: String(numAmount) };
}

/**
 * Validate required field
 */
export function validateRequired(value: unknown, fieldName = 'Field'): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (typeof value === 'string' && value.trim().length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }
  
  return { valid: true, value: String(value) };
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName = 'Value'
): ValidationResult {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const trimmed = value.trim();
  
  if (trimmed.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  
  if (trimmed.length > max) {
    return { valid: false, error: `${fieldName} must be at most ${max} characters` };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName = 'Value'
): ValidationResult {
  if (!allowedValues.includes(value as T)) {
    return { 
      valid: false, 
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}` 
    };
  }
  
  return { valid: true, value: String(value) };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
    
    // Block javascript: URLs (case insensitive)
    if (parsed.protocol === 'javascript:') {
      return { valid: false, error: 'JavaScript URLs are not allowed' };
    }
    
    return { valid: true, value: url };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// ─── Sanitization Functions ───────────────────────────────────────────────────

/**
 * HTML entity encoding - prevents XSS in HTML context
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;');
}

/**
 * URL encoding - for use in URL parameters
 */
export function encodeUrlParam(unsafe: string): string {
  return encodeURIComponent(unsafe);
}

/**
 * JavaScript string encoding - for use in JS strings
 */
export function escapeJavaScript(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  
  return unsafe
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E');
}

/**
 * CSS encoding - for use in CSS values
 */
export function escapeCss(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  
  // Remove or escape characters that could be used for CSS injection
  return unsafe
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Remove control characters and normalize whitespace
 */
export function sanitizeText(value: string): string {
  if (typeof value !== 'string') return '';
  
  return value
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .trim();
}

/**
 * Remove potentially dangerous URL schemes
 */
export function sanitizeUrl(value: string): string {
  if (typeof value !== 'string') return '';
  
  const lower = value.toLowerCase().trim();
  
  // Block dangerous schemes
  const blockedSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'about:'
  ];
  
  for (const scheme of blockedSchemes) {
    if (lower.startsWith(scheme)) {
      return '';
    }
  }
  
  return value.trim();
}

/**
 * Path traversal prevention - removes directory traversal sequences
 */
export function sanitizePath(value: string): string {
  if (typeof value !== 'string') return '';
  
  return value
    .replace(/\.\.\//g, '')
    .replace(/\.\./g, '')
    .replace(/^\//, '');
}

/**
 * SQL injection prevention - Note: We use parameterized queries everywhere,
 * but this provides defense-in-depth for edge cases
 */
export function sanitizeForSQL(value: string): string {
  if (typeof value !== 'string') return '';
  
  // Escape common SQL injection characters (defense-in-depth, not a substitute for parameterized queries)
  return value
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

// ─── Composite Validators ─────────────────────────────────────────────────────

export interface TenantInvitationInput {
  email?: string;
  phone?: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unit?: string;
  monthlyRent?: number;
}

export function validateTenantInvitation(input: TenantInvitationInput): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: Partial<TenantInvitationInput>;
} {
  const errors: Record<string, string> = {};
  const sanitized: Partial<TenantInvitationInput> = {};
  
  // Require tenant name, property, and at least one contact method
  const nameResult = validateLength(input.tenantName, 1, 200, 'Tenant name');
  if (!nameResult.valid) {
    errors.tenantName = nameResult.error!;
  } else {
    sanitized.tenantName = escapeHtml(nameResult.value!);
  }
  
  const propertyIdResult = validateUUID(input.propertyId);
  if (!propertyIdResult.valid) {
    errors.propertyId = propertyIdResult.error!;
  } else {
    sanitized.propertyId = propertyIdResult.value;
  }
  
  const propertyNameResult = validateLength(input.propertyName, 1, 500, 'Property name');
  if (!propertyNameResult.valid) {
    errors.propertyName = propertyNameResult.error!;
  } else {
    sanitized.propertyName = escapeHtml(propertyNameResult.value!);
  }
  
  // Email is optional if phone is provided
  if (input.email) {
    const emailResult = validateEmail(input.email);
    if (!emailResult.valid) {
      errors.email = emailResult.error!;
    } else {
      sanitized.email = emailResult.value;
    }
  }
  
  // Phone is optional if email is provided
  if (input.phone) {
    const phoneResult = validateKenyaPhone(input.phone);
    if (!phoneResult.valid) {
      errors.phone = phoneResult.error!;
    } else {
      sanitized.phone = phoneResult.value;
    }
  }
  
  // At least one contact method required
  if (!input.email && !input.phone) {
    errors.contact = 'At least one contact method (email or phone) is required';
  }
  
  // Unit is optional
  if (input.unit) {
    const unitResult = validateLength(input.unit, 1, 50, 'Unit');
    if (!unitResult.valid) {
      errors.unit = unitResult.error!;
    } else {
      sanitized.unit = sanitizeText(unitResult.value!);
    }
  }
  
  // Amounts are optional
  if (input.monthlyRent !== undefined) {
    const rentResult = validateAmount(input.monthlyRent);
    if (!rentResult.valid) {
      errors.monthlyRent = rentResult.error!;
    } else {
      sanitized.monthlyRent = parseFloat(rentResult.value!);
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

// ─── Request Validation Middleware ─────────────────────────────────────────────

export interface RequestValidation {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: Record<string, unknown>;
}

/**
 * Validate API request body with schema
 */
export function validateRequest<T extends Record<string, unknown>>(
  body: unknown,
  schema: Record<string, (value: unknown) => ValidationResult>
): RequestValidation {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, unknown> = {};
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: { body: 'Request body must be an object' }, sanitized: {} };
  }
  
  for (const [field, validator] of Object.entries(schema)) {
    const result = validator((body as T)[field]);
    if (!result.valid) {
      errors[field] = result.error!;
    } else {
      sanitized[field] = result.value;
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}
