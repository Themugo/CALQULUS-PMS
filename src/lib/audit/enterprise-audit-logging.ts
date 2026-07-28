/**
 * Enterprise Audit Logging System
 *
 * Implements comprehensive audit logging for compliance with:
 * - SOC 2, ISO 27001, GDPR requirements
 * - User action tracking
 * - Data access logging
 * - Security event logging
 * - Real-time alerting
 * - Queryable audit trail
 */

// Audit event types
export enum AuditEventType {
  // Authentication events
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  SESSION_EXPIRED = 'session_expired',

  // Authorization events
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  ACCESS_DENIED = 'access_denied',

  // Data events
  DATA_CREATED = 'data_created',
  DATA_READ = 'data_read',
  DATA_UPDATED = 'data_updated',
  DATA_DELETED = 'data_deleted',
  DATA_EXPORTED = 'data_exported',
  DATA_IMPORTED = 'data_imported',

  // Financial events
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_REFUNDED = 'payment_refunded',
  INVOICE_CREATED = 'invoice_created',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_VOIDED = 'invoice_voided',

  // Administrative events
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_SUSPENDED = 'user_suspended',
  SETTINGS_CHANGED = 'settings_changed',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',

  // Security events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INTRUSION_DETECTED = 'intrusion_detected',
  DATA_BREACH = 'data_breach',
  COMPLIANCE_VIOLATION = 'compliance_violation',
}

// Audit severity levels
export enum AuditSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Audit event
export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  description: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  complianceFlags: ComplianceFlag[];
  retentionUntil?: Date;
}

// Compliance flags for regulatory requirements
export interface ComplianceFlag {
  regulation: 'SOC2' | 'ISO27001' | 'GDPR' | 'PCI-DSS' | 'HIPAA' | 'KYC';
  requirement: string;
  dataCategory: 'PII' | 'FI' | 'PHI' | 'CHD' | 'AUTH' | 'OPERATIONAL';
  retentionDays: number;
  mandatory: boolean;
}

// Audit log query filters
export interface AuditLogQuery {
  userId?: string;
  eventTypes?: AuditEventType[];
  severity?: AuditSeverity[];
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  complianceFlags?: string[];
  searchText?: string;
  limit?: number;
  offset?: number;
}

// Audit retention policy
export interface AuditRetentionPolicy {
  id: string;
  eventType: AuditEventType;
  retentionDays: number;
  archiveBeforeDelete: boolean;
  encryptionRequired: boolean;
  compressionEnabled: boolean;
}

// Audit report configuration
export interface AuditReportConfig {
  id: string;
  name: string;
  description: string;
  filters: AuditLogQuery;
  schedule?: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'csv' | 'json';
  complianceRequirements: string[];
}

// Audit summary statistics
export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByUser: Record<string, number>;
  failedEvents: number;
  complianceEvents: number;
  averageEventsPerDay: number;
  topUsers: Array<{ userId: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  suspiciousActivityCount: number;
}

/**
 * Create audit event
 */
export function createAuditEvent(
  eventType: AuditEventType,
  action: string,
  description: string,
  options?: Partial<AuditEvent>
): AuditEvent {
  const event: AuditEvent = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    eventType,
    severity: mapEventTypeToSeverity(eventType),
    action,
    description,
    success: true,
    complianceFlags: getComplianceFlags(eventType),
    ...options,
  };

  // Set retention based on compliance requirements
  const maxRetention = Math.max(
    ...event.complianceFlags.map(f => f.retentionDays),
    365 // Default minimum
  );
  event.retentionUntil = new Date(event.timestamp.getTime() + maxRetention * 24 * 60 * 60 * 1000);

  return event;
}

/**
 * Map event type to severity
 */
function mapEventTypeToSeverity(eventType: AuditEventType): AuditSeverity {
  const severityMap: Partial<Record<AuditEventType, AuditSeverity>> = {
    [AuditEventType.LOGIN]: AuditSeverity.INFO,
    [AuditEventType.LOGOUT]: AuditSeverity.INFO,
    [AuditEventType.LOGIN_FAILED]: AuditSeverity.WARNING,
    [AuditEventType.PASSWORD_CHANGE]: AuditSeverity.INFO,
    [AuditEventType.PASSWORD_RESET]: AuditSeverity.INFO,
    [AuditEventType.MFA_ENABLED]: AuditSeverity.INFO,
    [AuditEventType.MFA_DISABLED]: AuditSeverity.WARNING,
    [AuditEventType.SESSION_EXPIRED]: AuditSeverity.DEBUG,
    [AuditEventType.PERMISSION_GRANTED]: AuditSeverity.INFO,
    [AuditEventType.PERMISSION_REVOKED]: AuditSeverity.WARNING,
    [AuditEventType.ROLE_ASSIGNED]: AuditSeverity.INFO,
    [AuditEventType.ROLE_REMOVED]: AuditSeverity.WARNING,
    [AuditEventType.ACCESS_DENIED]: AuditSeverity.WARNING,
    [AuditEventType.DATA_CREATED]: AuditSeverity.INFO,
    [AuditEventType.DATA_READ]: AuditSeverity.DEBUG,
    [AuditEventType.DATA_UPDATED]: AuditSeverity.INFO,
    [AuditEventType.DATA_DELETED]: AuditSeverity.WARNING,
    [AuditEventType.DATA_EXPORTED]: AuditSeverity.INFO,
    [AuditEventType.DATA_IMPORTED]: AuditSeverity.INFO,
    [AuditEventType.PAYMENT_INITIATED]: AuditSeverity.INFO,
    [AuditEventType.PAYMENT_COMPLETED]: AuditSeverity.INFO,
    [AuditEventType.PAYMENT_FAILED]: AuditSeverity.WARNING,
    [AuditEventType.PAYMENT_REFUNDED]: AuditSeverity.INFO,
    [AuditEventType.INVOICE_CREATED]: AuditSeverity.INFO,
    [AuditEventType.INVOICE_PAID]: AuditSeverity.INFO,
    [AuditEventType.INVOICE_VOIDED]: AuditSeverity.WARNING,
    [AuditEventType.USER_CREATED]: AuditSeverity.INFO,
    [AuditEventType.USER_UPDATED]: AuditSeverity.INFO,
    [AuditEventType.USER_DELETED]: AuditSeverity.WARNING,
    [AuditEventType.USER_SUSPENDED]: AuditSeverity.WARNING,
    [AuditEventType.SETTINGS_CHANGED]: AuditSeverity.INFO,
    [AuditEventType.API_KEY_CREATED]: AuditSeverity.INFO,
    [AuditEventType.API_KEY_REVOKED]: AuditSeverity.WARNING,
    [AuditEventType.SUSPICIOUS_ACTIVITY]: AuditSeverity.ERROR,
    [AuditEventType.RATE_LIMIT_EXCEEDED]: AuditSeverity.WARNING,
    [AuditEventType.INTRUSION_DETECTED]: AuditSeverity.CRITICAL,
    [AuditEventType.DATA_BREACH]: AuditSeverity.CRITICAL,
    [AuditEventType.COMPLIANCE_VIOLATION]: AuditSeverity.CRITICAL,
  };

  return severityMap[eventType] || AuditSeverity.INFO;
}

/**
 * Get compliance flags for event type
 */
function getComplianceFlags(eventType: AuditEventType): ComplianceFlag[] {
  const complianceMap: Partial<Record<AuditEventType, ComplianceFlag[]>> = {
    [AuditEventType.LOGIN]: [
      { regulation: 'SOC2', requirement: 'CC6.1', dataCategory: 'AUTH', retentionDays: 2555, mandatory: true },
    ],
    [AuditEventType.LOGIN_FAILED]: [
      { regulation: 'SOC2', requirement: 'CC6.1', dataCategory: 'AUTH', retentionDays: 2555, mandatory: true },
      { regulation: 'ISO27001', requirement: 'A.9.4.3', dataCategory: 'AUTH', retentionDays: 2555, mandatory: true },
    ],
    [AuditEventType.PASSWORD_CHANGE]: [
      { regulation: 'SOC2', requirement: 'CC6.1', dataCategory: 'AUTH', retentionDays: 2555, mandatory: true },
      { regulation: 'GDPR', requirement: 'Art. 33', dataCategory: 'AUTH', retentionDays: 2190, mandatory: true },
    ],
    [AuditEventType.PAYMENT_COMPLETED]: [
      { regulation: 'SOC2', requirement: 'CC6.6', dataCategory: 'FI', retentionDays: 2555, mandatory: true },
      { regulation: 'PCI-DSS', requirement: 'Req-3', dataCategory: 'CHD', retentionDays: 2555, mandatory: true },
    ],
    [AuditEventType.PAYMENT_FAILED]: [
      { regulation: 'SOC2', requirement: 'CC6.6', dataCategory: 'FI', retentionDays: 2555, mandatory: true },
    ],
    [AuditEventType.DATA_DELETED]: [
      { regulation: 'GDPR', requirement: 'Art. 17', dataCategory: 'PII', retentionDays: 2190, mandatory: true },
      { regulation: 'SOC2', requirement: 'CC6.7', dataCategory: 'OPERATIONAL', retentionDays: 2555, mandatory: true },
    ],
    [AuditEventType.DATA_EXPORTED]: [
      { regulation: 'GDPR', requirement: 'Art. 20', dataCategory: 'PII', retentionDays: 2190, mandatory: true },
    ],
    [AuditEventType.ACCESS_DENIED]: [
      { regulation: 'SOC2', requirement: 'CC6.3', dataCategory: 'AUTH', retentionDays: 2555, mandatory: true },
      { regulation: 'ISO27001', requirement: 'A.9.2.6', dataCategory: 'AUTH', retentionDays: 2555, mandatory: true },
    ],
    [AuditEventType.SUSPICIOUS_ACTIVITY]: [
      { regulation: 'SOC2', requirement: 'CC7.2', dataCategory: 'OPERATIONAL', retentionDays: 2555, mandatory: true },
      { regulation: 'ISO27001', requirement: 'A.12.4.1', dataCategory: 'OPERATIONAL', retentionDays: 2555, mandatory: true },
    ],
    [AuditEventType.DATA_BREACH]: [
      { regulation: 'GDPR', requirement: 'Art. 33', dataCategory: 'PII', retentionDays: 3650, mandatory: true },
      { regulation: 'SOC2', requirement: 'CC7.3', dataCategory: 'OPERATIONAL', retentionDays: 3650, mandatory: true },
    ],
  };

  return complianceMap[eventType] || [
    { regulation: 'SOC2', requirement: 'CC1.2', dataCategory: 'OPERATIONAL', retentionDays: 2555, mandatory: false },
  ];
}

/**
 * Create failed audit event
 */
export function createFailedAuditEvent(
  eventType: AuditEventType,
  action: string,
  description: string,
  errorMessage: string,
  options?: Partial<AuditEvent>
): AuditEvent {
  return createAuditEvent(eventType, action, description, {
    success: false,
    errorMessage,
    severity: AuditSeverity.ERROR,
    ...options,
  });
}

/**
 * Query audit logs
 */
export function queryAuditLogs(
  logs: AuditEvent[],
  query: AuditLogQuery
): AuditEvent[] {
  let filtered = [...logs];

  if (query.userId) {
    filtered = filtered.filter(log => log.userId === query.userId);
  }

  if (query.eventTypes?.length) {
    filtered = filtered.filter(log => query.eventTypes!.includes(log.eventType));
  }

  if (query.severity?.length) {
    filtered = filtered.filter(log => query.severity!.includes(log.severity));
  }

  if (query.resourceType) {
    filtered = filtered.filter(log => log.resourceType === query.resourceType);
  }

  if (query.resourceId) {
    filtered = filtered.filter(log => log.resourceId === query.resourceId);
  }

  if (query.startDate) {
    filtered = filtered.filter(log => log.timestamp >= query.startDate!);
  }

  if (query.endDate) {
    filtered = filtered.filter(log => log.timestamp <= query.endDate!);
  }

  if (query.success !== undefined) {
    filtered = filtered.filter(log => log.success === query.success);
  }

  if (query.complianceFlags?.length) {
    filtered = filtered.filter(log =>
      log.complianceFlags.some(flag => query.complianceFlags!.includes(flag.regulation))
    );
  }

  if (query.searchText) {
    const searchLower = query.searchText.toLowerCase();
    filtered = filtered.filter(log =>
      log.action.toLowerCase().includes(searchLower) ||
      log.description.toLowerCase().includes(searchLower) ||
      log.userEmail?.toLowerCase().includes(searchLower)
    );
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply pagination
  const offset = query.offset || 0;
  const limit = query.limit || 100;

  return filtered.slice(offset, offset + limit);
}

/**
 * Calculate audit statistics
 */
export function calculateAuditStatistics(logs: AuditEvent[]): AuditStatistics {
  const eventsByType: Partial<Record<AuditEventType, number>> = {};
  const eventsBySeverity: Partial<Record<AuditSeverity, number>> = {};
  const eventsByUser: Record<string, number> = {};
  const actionCounts: Record<string, number> = {};

  for (const log of logs) {
    eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;
    eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;

    if (log.userId) {
      eventsByUser[log.userId] = (eventsByUser[log.userId] || 0) + 1;
    }

    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  }

  const failedEvents = logs.filter(log => !log.success).length;
  const complianceEvents = logs.filter(log => log.complianceFlags.some(f => f.mandatory)).length;

  // Calculate average events per day
  const dates = logs.map(log => log.timestamp.toISOString().split('T')[0]);
  const uniqueDates = new Set(dates);
  const averageEventsPerDay = uniqueDates.size > 0 ? logs.length / uniqueDates.size : 0;

  // Top users
  const topUsers = Object.entries(eventsByUser)
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top actions
  const topActions = Object.entries(actionCounts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const suspiciousActivityCount = logs.filter(
    log => log.eventType === AuditEventType.SUSPICIOUS_ACTIVITY ||
           log.eventType === AuditEventType.INTRUSION_DETECTED ||
           log.eventType === AuditEventType.DATA_BREACH
  ).length;

  return {
    totalEvents: logs.length,
    eventsByType: eventsByType as Record<AuditEventType, number>,
    eventsBySeverity: eventsBySeverity as Record<AuditSeverity, number>,
    eventsByUser,
    failedEvents,
    complianceEvents,
    averageEventsPerDay,
    topUsers,
    topActions,
    suspiciousActivityCount,
  };
}

/**
 * Create audit report configuration
 */
export function createAuditReportConfig(
  name: string,
  description: string,
  filters: AuditLogQuery,
  recipients: string[],
  format: 'pdf' | 'csv' | 'json',
  complianceRequirements: string[]
): AuditReportConfig {
  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    filters,
    recipients,
    format,
    complianceRequirements,
  };
}

/**
 * Get retention policies for all event types
 */
export function getDefaultRetentionPolicies(): AuditRetentionPolicy[] {
  return Object.values(AuditEventType).map(eventType => ({
    id: `policy_${eventType}`,
    eventType,
    retentionDays: getComplianceFlags(eventType)[0]?.retentionDays || 2555,
    archiveBeforeDelete: true,
    encryptionRequired: true,
    compressionEnabled: true,
  }));
}

/**
 * Filter logs by compliance requirement
 */
export function filterByComplianceRequirement(
  logs: AuditEvent[],
  regulation: 'SOC2' | 'ISO27001' | 'GDPR' | 'PCI-DSS' | 'HIPAA' | 'KYC'
): AuditEvent[] {
  return logs.filter(log =>
    log.complianceFlags.some(flag => flag.regulation === regulation)
  );
}

/**
 * Generate compliance summary
 */
export function generateComplianceSummary(
  logs: AuditEvent[],
  regulation: 'SOC2' | 'ISO27001' | 'GDPR' | 'PCI-DSS' | 'HIPAA' | 'KYC'
): {
  totalEvents: number;
  mandatoryEvents: number;
  optionalEvents: number;
  byRequirement: Record<string, number>;
  retentionCompliance: {
    compliant: number;
    expired: number;
    expiringSoon: number;
  };
} {
  const regulationLogs = filterByComplianceRequirement(logs, regulation);
  
  const mandatoryEvents = regulationLogs.filter(log =>
    log.complianceFlags.some(flag => flag.regulation === regulation && flag.mandatory)
  ).length;

  const optionalEvents = regulationLogs.length - mandatoryEvents;

  const byRequirement: Record<string, number> = {};
  for (const log of regulationLogs) {
    for (const flag of log.complianceFlags) {
      if (flag.regulation === regulation) {
        byRequirement[flag.requirement] = (byRequirement[flag.requirement] || 0) + 1;
      }
    }
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const retentionCompliance = {
    compliant: regulationLogs.filter(log =>
      log.retentionUntil && log.retentionUntil > now
    ).length,
    expired: regulationLogs.filter(log =>
      log.retentionUntil && log.retentionUntil <= now
    ).length,
    expiringSoon: regulationLogs.filter(log =>
      log.retentionUntil && log.retentionUntil > now && log.retentionUntil <= thirtyDaysFromNow
    ).length,
  };

  return {
    totalEvents: regulationLogs.length,
    mandatoryEvents,
    optionalEvents,
    byRequirement,
    retentionCompliance,
  };
}

/**
 * Format audit event for display
 */
export function formatAuditEvent(event: AuditEvent): string {
  const timestamp = event.timestamp.toISOString();
  const user = event.userEmail || event.userId || 'Anonymous';
  const status = event.success ? '✓' : '✗';
  
  return `[${timestamp}] ${status} ${event.eventType}: ${event.action} by ${user} - ${event.description}`;
}

/**
 * Get severity color for logging
 */
export function getSeverityColor(severity: AuditSeverity): string {
  const colors: Record<AuditSeverity, string> = {
    [AuditSeverity.DEBUG]: '#6b7280',
    [AuditSeverity.INFO]: '#3b82f6',
    [AuditSeverity.WARNING]: '#f59e0b',
    [AuditSeverity.ERROR]: '#ef4444',
    [AuditSeverity.CRITICAL]: '#dc2626',
  };
  return colors[severity];
}
