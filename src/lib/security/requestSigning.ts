/**
 * Request Signing for CALQULUS RMS
 * 
 * Provides HMAC-based request signing for API calls:
 * - Ensures request integrity
 * - Prevents request tampering
 * - Validates request freshness (replay attack prevention)
 * 
 * Usage:
 *   import { signRequest, verifySignature } from '@/lib/security/requestSigning';
 *   
 *   const signed = await signRequest({
 *     method: 'POST',
 *     url: '/api/data',
 *     body: { data: 'value' }
 *   });
 *   
 *   // Add signature headers to fetch
 *   fetch(url, { headers: signed.headers });
 */

import { getCSRFToken } from './csrf';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignRequestOptions {
  method: string;
  url: string;
  body?: unknown;
  timestamp?: number;
  nonce?: string;
}

interface SignedRequest extends Omit<SignRequestOptions, 'timestamp' | 'nonce'> {
  headers: Record<string, string>;
  timestamp: number;
  nonce: string;
}

interface SignatureVerification {
  valid: boolean;
  error?: string;
  timestamp?: number;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

const SIGNATURE_HEADER = 'X-Calqulus-Signature';
const TIMESTAMP_HEADER = 'X-Calqulus-Timestamp';
const NONCE_HEADER = 'X-Calqulus-Nonce';
const ALGORITHM = 'SHA-256';
const SIGNATURE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

// ─── Signature Generation ───────────────────────────────────────────────────────

/**
 * Generate a random nonce
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a canonical string representation of the request
 */
function canonicalString(options: {
  method: string;
  url: string;
  body?: unknown;
  timestamp: number;
  nonce: string;
}): string {
  const { method, url, body, timestamp, nonce } = options;
  
  // Parse URL to get path and query
  let path = url;
  let query = '';
  
  try {
    const parsed = new URL(url, 'https://example.com');
    path = parsed.pathname;
    query = parsed.search;
  } catch {
    // Use as-is if URL parsing fails
  }
  
  // Stringify body
  let bodyStr = '';
  if (body) {
    bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  }
  
  // Create canonical string (method + path + query + timestamp + nonce + body)
  return [
    method.toUpperCase(),
    path,
    query,
    timestamp,
    nonce,
    bodyStr,
  ].join('|');
}

/**
 * Generate HMAC-SHA256 signature
 */
async function generateHMAC(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: ALGORITHM },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Sign a request with HMAC-SHA256
 */
export async function signRequest(options: SignRequestOptions): Promise<SignedRequest> {
  const timestamp = options.timestamp || Date.now();
  const nonce = options.nonce || generateNonce();
  
  // Get signing secret (derived from CSRF token or generated per session)
  const secret = await getSigningSecret();
  
  // Create canonical string
  const canonical = canonicalString({
    method: options.method,
    url: options.url,
    body: options.body,
    timestamp,
    nonce,
  });
  
  // Generate signature
  const signature = await generateHMAC(canonical, secret);
  
  return {
    method: options.method,
    url: options.url,
    body: options.body,
    headers: {
      [SIGNATURE_HEADER]: signature,
      [TIMESTAMP_HEADER]: timestamp.toString(),
      [NONCE_HEADER]: nonce,
    },
    timestamp,
    nonce,
  };
}

/**
 * Verify a request signature
 */
export async function verifySignature(
  options: {
    method: string;
    url: string;
    body?: unknown;
    headers: Record<string, string>;
  },
  secret?: string
): Promise<SignatureVerification> {
  const signature = options.headers[SIGNATURE_HEADER];
  const timestampStr = options.headers[TIMESTAMP_HEADER];
  const nonce = options.headers[NONCE_HEADER];
  
  if (!signature || !timestampStr || !nonce) {
    return { valid: false, error: 'Missing signature headers' };
  }
  
  const timestamp = parseInt(timestampStr, 10);
  
  if (isNaN(timestamp)) {
    return { valid: false, error: 'Invalid timestamp' };
  }
  
  // Check timestamp freshness (prevent replay attacks)
  const age = Date.now() - timestamp;
  if (age < 0 || age > SIGNATURE_VALIDITY_MS) {
    return { 
      valid: false, 
      error: `Request timestamp expired or invalid (age: ${age}ms)`,
      timestamp,
    };
  }
  
  // Get signing secret
  const signingSecret = secret || await getSigningSecret();
  
  // Recreate and verify signature
  const canonical = canonicalString({
    method: options.method,
    url: options.url,
    body: options.body,
    timestamp,
    nonce,
  });
  
  const expectedSignature = await generateHMAC(canonical, signingSecret);
  
  // Constant-time comparison
  if (!timingSafeEqual(signature, expectedSignature)) {
    return { valid: false, error: 'Signature mismatch', timestamp };
  }
  
  return { valid: true, timestamp };
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return diff === 0;
}

/**
 * Get or generate signing secret
 */
let signingSecretCache: string | null = null;

async function getSigningSecret(): Promise<string> {
  if (signingSecretCache) {
    return signingSecretCache;
  }
  
  // Try to get from session storage
  const stored = sessionStorage.getItem('calqulus_signing_secret');
  if (stored) {
    signingSecretCache = stored;
    return stored;
  }
  
  // Generate new secret using Web Crypto API
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const secret = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Store in session storage
  sessionStorage.setItem('calqulus_signing_secret', secret);
  signingSecretCache = secret;
  
  return secret;
}

/**
 * Clear signing secret (call on logout)
 */
export function clearSigningSecret(): void {
  signingSecretCache = null;
  sessionStorage.removeItem('calqulus_signing_secret');
}

// ─── Signed Fetch Wrapper ───────────────────────────────────────────────────────

/**
 * Make a signed fetch request
 */
export async function signedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body as string) : undefined;
  
  const signed = await signRequest({
    method,
    url,
    body,
  });
  
  const headers = new Headers(options.headers);
  headers.set(SIGNATURE_HEADER, signed.headers[SIGNATURE_HEADER]);
  headers.set(TIMESTAMP_HEADER, signed.headers[TIMESTAMP_HEADER]);
  headers.set(NONCE_HEADER, signed.headers[NONCE_HEADER]);
  
  return fetch(url, {
    ...options,
    headers,
  });
}

// ─── Request Validator Middleware ───────────────────────────────────────────────

/**
 * Middleware to validate signed requests
 */
export function createRequestValidator(secret?: string) {
  return async function validateSignedRequest(
    request: {
      method: string;
      url: string;
      body?: unknown;
      headers: Record<string, string>;
    }
  ): Promise<{ valid: boolean; error?: string }> {
    const result = await verifySignature(request, secret);
    
    if (!result.valid) {
      return { valid: false, error: result.error };
    }
    
    return { valid: true };
  };
}
