/**
 * Audit Logging for CALQULUS RMS
 * 
 * Provides comprehensive audit logging for security-sensitive operations:
 * - Authentication events
 * - Data access and modifications
 * - Payment operations
 * - Administrative actions
 * 
 * Usage:
 *   import { auditLog } from '@/lib/security/auditLog';
 *   
 *   auditLog.info('payment.processed', {
 *     amount: 5000,
 *     tenantId: '123',
 *     method: 'mpesa'
 *   });
 */

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { getPreference } from 'lucide-react';

// ─── Log Levels ───────────────────────────────────────────────────────────────

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// ─── Audit Event Types ─────────────────────────────────────────────────────────

export enum AuditEventType {
  // Authentication
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAILED = 'auth.login.failed',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_PASSWORD_CHANGE = 'auth.password.change',
  AUTH_PASSWORD_RESET = 'auth.password.reset',
  AUTH_SESSION_EXPIRED = 'auth.session.expired',
  
  // Tenant Operations
  TENANT_CREATED = 'tenant.created',
  TENANT_UPDATED = 'tenant.updated',
  TENANT_DELETED = 'tenant.deleted',
  TENANT_INVITATION_SENT = 'tenant.invitation.sent',
  
  // Payment Operations
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  INVOICE_GENERATED = 'invoice.generated',
  INVOICE_SENT = 'invoice.sent',
  
  // Property Operations
  PROPERTY_CREATED = 'property.created',
  PROPERTY_UPDATED = 'property.updated',
  PROPERTY_DELETED = 'property.deleted',
  UNIT_CREATED = 'unit.created',
  UNIT_UPDATED = 'unit.updated',
  
  // Administrative Actions
  USER_ROLE_CHANGED = 'user.role.changed',
  PERMISSION_GRANTED = 'permission.granted',
  PERMISSION_REVOKED = 'permission.revoked',
  SETTINGS_CHANGED = 'settings.changed',
  
  // Data Access
  DATA_EXPORTED = 'data.exported',
  REPORT_GENERATED = 'report.generated',
  
  // Security Events
  SECURITY_ANOMALY = 'security.anomaly',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  SUSPICIOUS_ACTIVITY = 'security.suspicious',
}

// ─── Audit Log Entry ──────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id?: string;
  timestamp: string;
  level: LogLevel;
  event: AuditEventType;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  resourceType: string | null;
  resourceId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

// ─── Audit Logger ─────────────────────────────────────────────────────────────

class AuditLogger {
  private queue: AuditLogEntry[] = [];
  private flushInterval: number | null = null;
  private maxQueueSize = 100;
  private flushTimeout = 5000; // 5 seconds
  
  constructor() {
    // Start flush interval
    this.startFlushInterval();
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }
  
  private startFlushInterval(): void {
    if (this.flushInterval) return;
    
    this.flushInterval = window.setInterval(() => {
      this.flush();
    }, this.flushTimeout);
  }
  
  /**
   * Create a base audit log entry
   */
  private createEntry(
    event: AuditEventType,
    level: LogLevel,
    action: string,
    metadata: Record<string, unknown> = {},
    options: {
      userId?: string | null;
      userEmail?: string | null;
      userRole?: string | null;
      resourceType?: string | null;
      resourceId?: string | null;
      success?: boolean;
      errorMessage?: string;
    } = {}
  ): AuditLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      event,
      userId: options.userId || null,
      userEmail: options.userEmail || null,
      userRole: options.userRole || null,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      resourceType: options.resourceType || null,
      resourceId: options.resourceId || null,
      action,
      metadata,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
    };
  }
  
  /**
   * Get client IP (from headers if available)
   */
  private getClientIP(): string | null {
    // In browser, we can't directly get IP
    // This would need to be populated server-side
    return null;
  }
  
  /**
   * Get user agent
   */
  private getUserAgent(): string | null {
    return typeof navigator !== 'undefined' ? navigator.userAgent : null;
  }
  
  /**
   * Queue a log entry for batch insertion
   */
  private queueEntry(entry: AuditLogEntry): void {
    this.queue.push(entry);
    
    // Flush if queue is too large
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }
  
  /**
   * Flush queued entries to the database
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const entries = [...this.queue];
    this.queue = [];
    
    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert(entries.map(e => ({
          event_type: e.event,
          actor_id: e.userId,
          actor_email: e.userEmail,
          actor_role: e.userRole,
          resource_type: e.resourceType,
          resource_id: e.resourceId,
          action: e.action,
          metadata: e.metadata,
          ip_address: e.ipAddress,
          user_agent: e.userAgent,
          success: e.success,
          error_message: e.errorMessage,
        })));
      
      if (error) {
        console.error('Failed to write audit log:', error);
        // Re-queue if insert failed
        this.queue = [...entries, ...this.queue];
      }
    } catch (err) {
      console.error('Failed to flush audit log:', err);
      // Re-queue if flush failed
      this.queue = [...entries, ...this.queue];
    }
  }
  
  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Log an info event
   */
  info(
    event: AuditEventType,
    action: string,
    metadata: Record<string, unknown> = {},
    options: Parameters<typeof this.createEntry>[3] = {}
  ): void {
    const entry = this.createEntry(event, LogLevel.INFO, action, metadata, options);
    this.queueEntry(entry);
    console.info(`[AUDIT] ${event}:`, metadata);
  }
  
  /**
   * Log a warning event
   */
  warn(
    event: AuditEventType,
    action: string,
    metadata: Record<string, unknown> = {},
    options: Parameters<typeof this.createEntry>[3] = {}
  ): void {
    const entry = this.createEntry(event, LogLevel.WARN, action, metadata, options);
    this.queueEntry(entry);
    console.warn(`[AUDIT] ${event}:`, metadata);
  }
  
  /**
   * Log an error event
   */
  error(
    event: AuditEventType,
    action: string,
    error: Error | string,
    metadata: Record<string, unknown> = {},
    options: Parameters<typeof this.createEntry>[3] = {}
  ): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const entry = this.createEntry(event, LogLevel.ERROR, action, metadata, {
      ...options,
      success: false,
      errorMessage,
    });
    this.queueEntry(entry);
    console.error(`[AUDIT] ${event}:`, errorMessage, metadata);
  }
  
  /**
   * Log a critical security event
   */
  critical(
    event: AuditEventType,
    action: string,
    metadata: Record<string, unknown> = {},
    options: Parameters<typeof this.createEntry>[3] = {}
  ): void {
    const entry = this.createEntry(event, LogLevel.CRITICAL, action, metadata, options);
    this.queueEntry(entry);
    console.error(`[AUDIT CRITICAL] ${event}:`, metadata);
  }
  
  /**
   * Log authentication success
   */
  authSuccess(userId: string, email: string, role: string, metadata: Record<string, unknown> = {}): void {
    this.info(AuditEventType.AUTH_LOGIN_SUCCESS, 'User logged in', metadata, {
      userId,
      userEmail: email,
      userRole: role,
    });
  }
  
  /**
   * Log authentication failure
   */
  authFailed(email: string, reason: string): void {
    this.warn(AuditEventType.AUTH_LOGIN_FAILED, 'Login failed', {
      reason,
      attemptedEmail: email,
    }, {
      userEmail: email,
    });
  }
  
  /**
   * Log payment event
   */
  payment(
    status: 'initiated' | 'completed' | 'failed' | 'refunded',
    amount: number,
    tenantId: string,
    metadata: Record<string, unknown> = {}
  ): void {
    const eventMap = {
      initiated: AuditEventType.PAYMENT_INITIATED,
      completed: AuditEventType.PAYMENT_COMPLETED,
      failed: AuditEventType.PAYMENT_FAILED,
      refunded: AuditEventType.PAYMENT_REFUNDED,
    };
    
    this.info(eventMap[status], `Payment ${status}`, {
      amount,
      tenantId,
      ...metadata,
    }, {
      resourceType: 'payment',
      resourceId: tenantId,
    });
  }
  
  /**
   * Log data access
   */
  dataAccess(
    resourceType: string,
    resourceId: string,
    action: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.info(AuditEventType.DATA_EXPORTED, action, metadata, {
      resourceType,
      resourceId,
    });
  }
}

// Singleton instance
export const auditLog = new AuditLogger();

// ─── Convenience Hooks ────────────────────────────────────────────────────────

/**
 * React hook for audit logging
 */
export function useAuditLog() {
  return {
    log: (event: AuditEventType, action: string, metadata?: Record<string, unknown>) => {
      auditLog.info(event, action, metadata || {});
    },
    logError: (
      event: AuditEventType,
      action: string,
      error: Error | string,
      metadata?: Record<string, unknown>
    ) => {
      auditLog.error(event, action, error, metadata || {});
    },
    authSuccess: auditLog.authSuccess.bind(auditLog),
    authFailed: auditLog.authFailed.bind(auditLog),
    payment: auditLog.payment.bind(auditLog),
  };
}

// ─── Decorator for Functions ────────────────────────────────────────────────────

/**
 * Decorator to automatically audit a function
 */
export function Audited(
  event: AuditEventType,
  resourceType?: string
) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value;
    
    if (!originalMethod) return descriptor;
    
    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        auditLog.info(event, `${propertyKey} executed`, {
          args: args.slice(0, 3), // Only log first 3 args to avoid sensitive data
          duration,
          success: true,
        }, {
          resourceType: resourceType || 'unknown',
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        auditLog.error(
          event,
          `${propertyKey} failed`,
          error instanceof Error ? error : String(error),
          { duration },
          { resourceType: resourceType || 'unknown' }
        );
        
        throw error;
      }
    } as T;
    
    return descriptor;
  };
}
