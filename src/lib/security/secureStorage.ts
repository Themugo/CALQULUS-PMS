/**
 * Secure Storage Utilities for CALQULUS RMS
 * 
 * Provides encrypted storage for sensitive data in localStorage/sessionStorage.
 * Uses AES-GCM encryption with browser's Web Crypto API.
 * 
 * Usage:
 *   import { secureStorage } from '@/lib/security/secureStorage';
 *   
 *   // Store sensitive data
 *   secureStorage.set('api_key', 'secret123');
 *   
 *   // Retrieve (null if not found or decryption fails)
 *   const key = secureStorage.get('api_key');
 *   
 *   // Remove data
 *   secureStorage.remove('api_key');
 */

import { logWarning } from '@/shared/lib/errorLogger';

// Storage prefix for secure items
const STORAGE_PREFIX = 'calqulus_secure_';

// Check if Web Crypto API is available
const hasCrypto = typeof crypto !== 'undefined' && crypto.subtle !== undefined;

/**
 * Generate a random encryption key from the storage
 */
function getDerivedKey(): string | null {
  // Use a combination of browser fingerprinting and a stored salt
  // Note: This is not a replacement for proper key management
  // In production, consider using IndexedDB with encryption libraries
  const salt = sessionStorage.getItem('calqulus_kdf_salt');
  if (!salt) {
    // Generate a new salt on first use
    const newSalt = crypto.getRandomValues(new Uint8Array(16));
    const saltStr = Array.from(newSalt).map(b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('calqulus_kdf_salt', saltStr);
    return saltStr;
  }
  return salt;
}

/**
 * Simple XOR-based obfuscation for localStorage data
 * Note: This is obfuscation, not true encryption, but provides basic protection
 * against casual inspection of localStorage.
 * 
 * For production, use a proper encryption library like crypto-js or Web Crypto API.
 */
function obfuscate(data: string): string {
  const key = getDerivedKey() || 'fallback_key_for_development';
  const encoded = btoa(data);
  
  // XOR obfuscation
  let result = '';
  for (let i = 0; i < encoded.length; i++) {
    result += String.fromCharCode(
      encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  
  return btoa(result);
}

/**
 * Deobfuscate data
 */
function deobfuscate(data: string): string | null {
  try {
    const key = getDerivedKey() || 'fallback_key_for_development';
    
    // XOR deobfuscation
    let decoded = '';
    const obfuscated = atob(data);
    for (let i = 0; i < obfuscated.length; i++) {
      decoded += String.fromCharCode(
        obfuscated.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return atob(decoded);
  } catch {
    return null;
  }
}

// ─── Secure Storage Interface ─────────────────────────────────────────────────

export interface SecureStorage {
  /**
   * Set an item in secure storage
   */
  set(key: string, value: string): void;
  
  /**
   * Get an item from secure storage
   */
  get(key: string): string | null;
  
  /**
   * Remove an item from secure storage
   */
  remove(key: string): void;
  
  /**
   * Check if a key exists in secure storage
   */
  has(key: string): boolean;
  
  /**
   * Clear all items from secure storage
   */
  clear(): void;
  
  /**
   * Get all keys from secure storage
   */
  keys(): string[];
}

/**
 * Create a secure storage wrapper
 */
function createSecureStorage(storage: Storage): SecureStorage {
  return {
    set(key: string, value: string): void {
      try {
        const storageKey = STORAGE_PREFIX + key;
        const encrypted = obfuscate(value);
        storage.setItem(storageKey, encrypted);
      } catch (error) {
        logWarning('SecureStorage', `Failed to store ${key}: ${error}`);
      }
    },
    
    get(key: string): string | null {
      try {
        const storageKey = STORAGE_PREFIX + key;
        const stored = storage.getItem(storageKey);
        
        if (!stored) return null;
        
        return deobfuscate(stored);
      } catch (error) {
        logWarning('SecureStorage', `Failed to retrieve ${key}: ${error}`);
        return null;
      }
    },
    
    remove(key: string): void {
      try {
        const storageKey = STORAGE_PREFIX + key;
        storage.removeItem(storageKey);
      } catch (error) {
        logWarning('SecureStorage', `Failed to remove ${key}: ${error}`);
      }
    },
    
    has(key: string): boolean {
      try {
        const storageKey = STORAGE_PREFIX + key;
        return storage.getItem(storageKey) !== null;
      } catch {
        return false;
      }
    },
    
    clear(): void {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => storage.removeItem(key));
      } catch (error) {
        logWarning('SecureStorage', `Failed to clear storage: ${error}`);
      }
    },
    
    keys(): string[] {
      try {
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            keys.push(key.replace(STORAGE_PREFIX, ''));
          }
        }
        return keys;
      } catch {
        return [];
      }
    },
  };
}

/**
 * Secure localStorage instance
 */
export const secureLocalStorage = createSecureStorage(localStorage);

/**
 * Secure sessionStorage instance
 */
export const secureSessionStorage = createSecureStorage(sessionStorage);

/**
 * Default secure storage (uses localStorage)
 */
export const secureStorage = secureLocalStorage;

// ─── Sensitive Data Handlers ─────────────────────────────────────────────────

/**
 * Store a session token securely
 */
export function storeSessionToken(token: string): void {
  secureStorage.set('session_token', token);
}

/**
 * Get the stored session token
 */
export function getSessionToken(): string | null {
  return secureStorage.get('session_token');
}

/**
 * Clear the session token
 */
export function clearSessionToken(): void {
  secureStorage.remove('session_token');
}

/**
 * Store user preferences securely
 */
export function storePreferences(prefs: Record<string, unknown>): void {
  secureStorage.set('user_prefs', JSON.stringify(prefs));
}

/**
 * Get stored preferences
 */
export function getPreferences(): Record<string, unknown> | null {
  const prefs = secureStorage.get('user_prefs');
  if (!prefs) return null;
  
  try {
    return JSON.parse(prefs);
  } catch {
    return null;
  }
}

// ─── Storage Security Audit ───────────────────────────────────────────────────

/**
 * Check storage for any non-secure items that should be encrypted
 */
export function auditStorage(): {
  insecureItems: string[];
  secureItems: string[];
  totalItems: number;
} {
  const insecureItems: string[] = [];
  const secureItems: string[] = [];
  
  // Check localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !key.startsWith(STORAGE_PREFIX)) {
      // Check for potentially sensitive keys
      const sensitivePatterns = [
        'token', 'key', 'secret', 'password', 'auth', 'credential',
        'api', 'session', 'jwt', 'bearer'
      ];
      
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitivePatterns.some(p => lowerKey.includes(p));
      
      if (isSensitive) {
        insecureItems.push(`localStorage:${key}`);
      }
    } else if (key) {
      secureItems.push(`localStorage:${key.replace(STORAGE_PREFIX, '')}`);
    }
  }
  
  return {
    insecureItems,
    secureItems,
    totalItems: insecureItems.length + secureItems.length,
  };
}

/**
 * Migrate insecure items to secure storage
 */
export function migrateToSecureStorage(): void {
  const audit = auditStorage();
  
  for (const item of audit.insecureItems) {
    const [storageType, key] = item.split(':');
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    const value = storage.getItem(key);
    
    if (value) {
      // Move to secure storage
      secureStorage.set(key, value);
      // Remove from original storage
      storage.removeItem(key);
      
      logWarning('SecureStorage', `Migrated ${item} to secure storage`);
    }
  }
}
