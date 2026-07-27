/**
 * Secure API Client for CALQULUS RMS
 * 
 * Provides a wrapper around Supabase client with additional security:
 * - Automatic CSRF token inclusion
 * - Security headers
 * - Request/response validation
 * - Timeout handling
 * 
 * Usage:
 *   import { secureApiClient } from '@/lib/security/apiClient';
 *   const { data, error } = await secureApiClient.fetch('/endpoint');
 */

import { supabase } from '@/integrations/supabase/client';
import { getCSRFToken } from './csrf';
import { validateRequest } from './inputValidation';

interface SecureFetchOptions extends RequestInit {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Skip CSRF token for public endpoints */
  skipCSRF?: boolean;
}

interface ApiResponse<T = unknown> {
  data: T | null;
  error: Error | null;
  status: number;
}

/**
 * Default security headers for all API requests
 */
const DEFAULT_SECURITY_HEADERS: HeadersInit = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Create a secure fetch with timeout and security headers
 */
async function secureFetch<T = unknown>(
  url: string,
  options: SecureFetchOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 30000, skipCSRF = false, ...fetchOptions } = options;
  
  // Add CSRF token if not skipped
  const headers = new Headers(fetchOptions.headers);
  
  if (!skipCSRF) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }
  
  // Add security headers
  Object.entries(DEFAULT_SECURITY_HEADERS).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });
  
  // Set content type if body is present
  if (fetchOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      credentials: 'same-origin',
    });

    clearTimeout(timeoutId);

    // Parse response
    let data: T | null = null;
    let error: Error | null = null;

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const json = await response.json();
      if (!response.ok) {
        error = new Error(json.error || json.message || 'Request failed');
      } else {
        data = json;
      }
    } else {
      if (!response.ok) {
        error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } else {
        data = await response.text() as unknown as T;
      }
    }

    return {
      data,
      error,
      status: response.status,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        data: null,
        error: new Error('Request timed out'),
        status: 408,
      };
    }
    
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
      status: 0,
    };
  }
}

/**
 * Call a Supabase Edge Function securely
 */
async function callEdgeFunction<T = unknown>(
  functionName: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown>;
    skipCSRF?: boolean;
    timeout?: number;
  } = {}
): Promise<ApiResponse<T>> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aelzsqxllkypbzslxyju.supabase.co';
  const url = `${supabaseUrl}/functions/v1/${functionName}`;
  
  // Get session token
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  
  if (!token) {
    return {
      data: null,
      error: new Error('Not authenticated'),
      status: 401,
    };
  }

  return secureFetch<T>(url, {
    method: options.method || 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    skipCSRF: options.skipCSRF ?? true, // Edge functions use JWT auth
    timeout: options.timeout,
  });
}

/**
 * Secure API client object
 */
export const secureApiClient = {
  /**
   * Fetch a URL with security headers and CSRF protection
   */
  fetch: secureFetch,

  /**
   * Call a Supabase Edge Function
   */
  callFunction: callEdgeFunction,

  /**
   * GET request
   */
  async get<T>(url: string, options?: Omit<SecureFetchOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return secureFetch<T>(url, { ...options, method: 'GET' });
  },

  /**
   * POST request with JSON body
   */
  async post<T>(
    url: string,
    body: Record<string, unknown>,
    options?: Omit<SecureFetchOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    // Validate body before sending
    if (body) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') {
          sanitized[key] = value.replace(/[<>]/g, '');
        } else {
          sanitized[key] = value;
        }
      }
      return secureFetch<T>(url, { ...options, method: 'POST', body: JSON.stringify(sanitized) });
    }
    return secureFetch<T>(url, { ...options, method: 'POST' });
  },

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    body: Record<string, unknown>,
    options?: Omit<SecureFetchOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return secureFetch<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) });
  },

  /**
   * DELETE request
   */
  async delete<T>(
    url: string,
    options?: Omit<SecureFetchOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return secureFetch<T>(url, { ...options, method: 'DELETE' });
  },
};

export type { ApiResponse, SecureFetchOptions };
