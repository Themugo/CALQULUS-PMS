/**
 * Security Monitoring Hooks for CALQULUS RMS
 * 
 * Provides runtime security monitoring and anomaly detection:
 * - Suspicious activity logging
 * - Rate limit tracking
 * - Session security monitoring
 * 
 * Usage:
 *   const { monitor } = useSecurityMonitor();
 *   monitor.trackEvent('payment_attempt', { amount: 5000 });
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { logWarning, logError } from '@/shared/lib/errorLogger';

// ─── Security Event Types ──────────────────────────────────────────────────────

interface SecurityEvent {
  type: 'auth' | 'data_access' | 'payment' | 'api' | 'navigation';
  action: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  suspicious?: boolean;
}

// ─── Rate Limit Tracker ────────────────────────────────────────────────────────

interface RateLimitState {
  requests: number;
  windowStart: number;
}

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

const apiRateLimits = new Map<string, RateLimitState>();

/**
 * Check if an API call should be rate limited
 */
export function checkApiRateLimit(endpoint: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const state = apiRateLimits.get(endpoint) || { requests: 0, windowStart: now };
  
  // Reset window if expired
  if (now - state.windowStart > RATE_LIMIT_WINDOW) {
    state.requests = 0;
    state.windowStart = now;
  }
  
  state.requests++;
  apiRateLimits.set(endpoint, state);
  
  const remaining = MAX_REQUESTS_PER_WINDOW - state.requests;
  
  if (remaining < 0) {
    logWarning('SecurityMonitor', `Rate limit exceeded for ${endpoint}`);
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining };
}

// ─── Anomaly Detection ─────────────────────────────────────────────────────────

interface AnomalyRule {
  name: string;
  check: (events: SecurityEvent[]) => boolean;
  severity: 'low' | 'medium' | 'high';
}

const ANOMALY_RULES: AnomalyRule[] = [
  {
    name: 'Multiple failed auth attempts',
    check: (events) => {
      const recentAuth = events.filter(
        e => e.type === 'auth' && 
        e.action.includes('failed') && 
        Date.now() - e.timestamp < 5 * 60 * 1000
      );
      return recentAuth.length >= 3;
    },
    severity: 'medium',
  },
  {
    name: 'Rapid API calls',
    check: (events) => {
      const recentApi = events.filter(
        e => e.type === 'api' && 
        Date.now() - e.timestamp < 10 * 1000
      );
      return recentApi.length >= 20;
    },
    severity: 'low',
  },
  {
    name: 'Unusual data access pattern',
    check: (events) => {
      const recentDataAccess = events.filter(
        e => e.type === 'data_access' && 
        Date.now() - e.timestamp < 60 * 1000
      );
      // Flag if accessing many different resources quickly
      const uniqueActions = new Set(recentDataAccess.map(e => e.action)).size;
      return recentDataAccess.length >= 10 && uniqueActions >= 5;
    },
    severity: 'high',
  },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseSecurityMonitorReturn {
  /**
   * Track a security event
   */
  trackEvent: (type: SecurityEvent['type'], action: string, metadata?: Record<string, unknown>) => void;
  
  /**
   * Track an authentication event
   */
  trackAuth: (action: 'login' | 'logout' | 'failed' | 'suspended', metadata?: Record<string, unknown>) => void;
  
  /**
   * Track a payment event
   */
  trackPayment: (action: string, amount?: number, metadata?: Record<string, unknown>) => void;
  
  /**
   * Track a data access event
   */
  trackDataAccess: (resource: string, action: 'read' | 'write' | 'delete', metadata?: Record<string, unknown>) => void;
  
  /**
   * Check if the current session is secure
   */
  checkSessionSecurity: () => { secure: boolean; issues: string[] };
}

export function useSecurityMonitor(): UseSecurityMonitorReturn {
  const { user, userRole } = useAuth();
  const eventsRef = useRef<SecurityEvent[]>([]);
  const lastActivityRef = useRef<number>(Date.now());

  // Track events in memory (limited size)
  const trackEvent = useCallback((
    type: SecurityEvent['type'],
    action: string,
    metadata?: Record<string, unknown>
  ) => {
    const event: SecurityEvent = {
      type,
      action,
      timestamp: Date.now(),
      metadata,
    };
    
    // Keep only last 100 events
    eventsRef.current = [
      ...eventsRef.current.slice(-99),
      event,
    ];
    
    // Check anomaly rules
    for (const rule of ANOMALY_RULES) {
      if (rule.check(eventsRef.current)) {
        logWarning('SecurityAnomaly', `${rule.name} detected`, {
          severity: rule.severity,
          userId: user?.id,
          role: userRole?.role,
        });
      }
    }
    
    lastActivityRef.current = Date.now();
  }, [user, userRole]);

  // Convenience methods
  const trackAuth = useCallback((
    action: 'login' | 'logout' | 'failed' | 'suspended',
    metadata?: Record<string, unknown>
  ) => {
    trackEvent('auth', action, metadata);
  }, [trackEvent]);

  const trackPayment = useCallback((
    action: string,
    amount?: number,
    metadata?: Record<string, unknown>
  ) => {
    trackEvent('payment', action, { ...metadata, amount });
  }, [trackEvent]);

  const trackDataAccess = useCallback((
    resource: string,
    action: 'read' | 'write' | 'delete',
    metadata?: Record<string, unknown>
  ) => {
    trackEvent('data_access', `${action}:${resource}`, metadata);
  }, [trackEvent]);

  // Session security check
  const checkSessionSecurity = useCallback((): { secure: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    // Check for inactivity timeout (30 minutes)
    const inactivity = Date.now() - lastActivityRef.current;
    if (inactivity > 30 * 60 * 1000) {
      issues.push('Session inactive for over 30 minutes');
    }
    
    // Check for suspicious patterns
    const recentEvents = eventsRef.current.filter(
      e => Date.now() - e.timestamp < 5 * 60 * 1000
    );
    
    const failedAuths = recentEvents.filter(
      e => e.type === 'auth' && e.action === 'failed'
    ).length;
    
    if (failedAuths >= 5) {
      issues.push('Multiple authentication failures detected');
    }
    
    return {
      secure: issues.length === 0,
      issues,
    };
  }, []);

  // Periodic security check
  useEffect(() => {
    const interval = setInterval(() => {
      const { secure, issues } = checkSessionSecurity();
      if (!secure) {
        logWarning('SessionSecurity', 'Security issues detected', { issues });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [checkSessionSecurity]);

  return {
    trackEvent,
    trackAuth,
    trackPayment,
    trackDataAccess,
    checkSessionSecurity,
  };
}

// ─── Security Report Generator ─────────────────────────────────────────────────

/**
 * Generate a security report for debugging/auditing
 */
export function generateSecurityReport(): {
  eventCount: number;
  anomalyCount: number;
  rateLimitHits: Record<string, number>;
} {
  const events = eventsRef.current;
  const anomalies = ANOMALY_RULES.filter(rule => rule.check(events)).length;
  
  const rateLimitHits: Record<string, number> = {};
  apiRateLimits.forEach((state, endpoint) => {
    const requestsInWindow = state.requests;
    if (requestsInWindow > MAX_REQUESTS_PER_WINDOW * 0.8) {
      rateLimitHits[endpoint] = requestsInWindow;
    }
  });

  return {
    eventCount: events.length,
    anomalyCount: anomalies,
    rateLimitHits,
  };
}
