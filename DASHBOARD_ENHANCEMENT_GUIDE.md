# RentFlow Dashboard Enhancement Guide

**Purpose:** Enhance all dashboards for better operations and user experience  
**Status:** No code changes required - configuration and workflow improvements  
**Updated:** May 23, 2026

---

## Current Dashboard Overview

### Manager Dashboard (`/`)
**Current Features:**
- Stat cards (tenants, leases, revenue, occupancy)
- Revenue chart
- Occupancy chart
- Properties overview
- Tenants overview
- Upcoming payments
- Pending deposit refunds
- Recent activity
- Manager activity log
- Quick actions
- Payment setup status
- Subscription banner

**Enhancements Needed:**
- Add operations workflow section
- Add orphaned tenant alerts
- Add data integrity warnings
- Add quick access to critical operations
- Add performance metrics

### Tenant Portal (`/portal`)
**Current Features:**
- Balance summary
- Payment details
- Multi-unit support
- Contracts section
- Maintenance requests
- Documents
- Inbox
- Vacation notices
- Payment history
- Receipt upload
- Bills hub
- Pay now dialog

**Enhancements Needed:**
- Add payment method setup guide
- Add lease expiration alerts
- Add maintenance request tracking
- Add document management improvements
- Add notification center

### Webhost Dashboard (`/webhost`)
**Current Features:**
- Manager creation
- System statistics
- Billing management

**Enhancements Needed:**
- Add user management overview
- Add system health monitoring
- Add audit log viewer
- Add security alerts
- Add deployment status

---

## Manager Dashboard Enhancements

### 1. Operations Workflow Section

Add a dedicated operations section to the manager dashboard:

```typescript
// Add to Dashboard.tsx after StatCards section
<OperationsWorkflow 
  pendingTasks={stats.pendingTasks}
  urgentIssues={stats.urgentIssues}
  todayDeadlines={stats.todayDeadlines}
/>
```

**Features:**
- Pending approvals count
- Urgent maintenance requests
- Today's payment deadlines
- Expiring leases (30 days)
- Overdue invoices summary
- Quick action buttons for each

### 2. Orphaned Tenant Alerts

Add alert banner for orphaned tenants:

```typescript
// Add to Dashboard.tsx
{stats.orphanedTenants > 0 && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Orphaned Tenants Detected</AlertTitle>
    <AlertDescription>
      {stats.orphanedTenants} tenant(s) without active leases. 
      <Button variant="link" asChild>
        <Link to="/tenants?filter=orphaned">Review</Link>
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### 3. Data Integrity Warnings

Add data integrity section:

```typescript
<DataIntegrityWarnings
  leasesWithoutTenants={stats.leasesWithoutTenants}
  invoicesWithoutTenants={stats.invoicesWithoutTenants}
  paymentsWithoutInvoices={stats.paymentsWithoutInvoices}
/>
```

### 4. Performance Metrics

Add performance metrics section:

```typescript
<PerformanceMetrics
  collectionRate={stats.collectionRate}
  averagePaymentTime={stats.averagePaymentTime}
  maintenanceResponseTime={stats.maintenanceResponseTime}
  tenantSatisfaction={stats.tenantSatisfaction}
/>
```

---

## Tenant Portal Enhancements

### 1. Payment Method Setup Guide

Add payment method setup wizard:

```typescript
// Add to TenantPortal.tsx
{!tenant.hasPaymentMethod && (
  <PaymentMethodSetupWizard 
    tenantId={tenant.id}
    onComplete={() => setHasPaymentMethod(true)}
  />
)}
```

**Features:**
- M-Pesa setup guide
- Bank account setup
- Auto-payment enrollment
- Payment method verification

### 2. Lease Expiration Alerts

Add lease expiration countdown:

```typescript
<LeaseExpirationAlert
  lease={activeLease}
  daysRemaining={daysUntilExpiration}
  onRenew={() => navigate('/contracts')}
/>
```

### 3. Maintenance Request Tracking

Add maintenance request status tracker:

```typescript
<MaintenanceTracker
  requests={maintenanceRequests}
  onNewRequest={() => navigate('/maintenance')}
/>
```

### 4. Document Management

Add document organization:

```typescript
<DocumentManager
  documents={documents}
  categories={['contracts', 'receipts', 'notices', 'other']}
  onUpload={handleDocumentUpload}
/>
```

---

## Webhost Dashboard Enhancements

### 1. User Management Overview

Add comprehensive user management:

```typescript
<UserManagementOverview
  totalUsers={userStats.total}
  activeUsers={userStats.active}
  pendingApprovals={userStats.pending}
  recentSignups={userStats.recent}
/>
```

### 2. System Health Monitoring

Add system health dashboard:

```typescript
<SystemHealthMonitor
  databaseStatus={health.database}
  apiStatus={health.api}
  edgeFunctionsStatus={health.edgeFunctions}
  storageStatus={health.storage}
/>
```

### 3. Audit Log Viewer

Add audit log viewer:

```typescript
<AuditLogViewer
  logs={auditLogs}
  filters={logFilters}
  onExport={handleExport}
/>
```

### 4. Security Alerts

Add security alerts section:

```typescript
<SecurityAlerts
  failedLogins={securityStats.failedLogins}
  suspiciousActivity={securityStats.suspicious}
  rateLimitHits={securityStats.rateLimitHits}
/>
```

---

## Security Tightening

### 1. Password Policy Enforcement

Add password policy to auth context:

```typescript
// Add to AuthContext.tsx
const validatePassword = (password: string): boolean => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && 
         hasUpperCase && 
         hasLowerCase && 
         hasNumbers && 
         hasSpecialChar;
};
```

### 2. Session Timeout

Add session timeout configuration:

```typescript
// Add to client.ts
auth: {
  storage: safeStorage,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'pkce',
  debug: false,
}
```

### 3. Rate Limiting

Ensure rate limiting is active on all endpoints:

```typescript
// Already implemented in rateLimit.ts
// Verify all sensitive endpoints use fail-closed
const SENSITIVE_FUNCTIONS = new Set<string>([
  "initiate-mpesa-stk-push",
  "initiate-mpesa-payment",
  "initiate-manager-mpesa-payment",
  "initiate-subscription-mpesa",
  "send-sms-notification",
  "send-whatsapp-notification",
  "send-bulk-sms",
  "parse-receipt",
  "parse-contract-document",
  "process-payment",
  "record-payment",
]);
```

### 4. Audit Logging

Ensure all critical actions are logged:

```typescript
// Add to critical operations
await supabase.from('audit_logs').insert({
  user_id: user.id,
  user_email: user.email,
  action: 'payment_initiated',
  resource_type: 'payment_transaction',
  resource_id: paymentId,
  details: { amount, method },
  ip_address: ipAddress,
  user_agent: userAgent,
});
```

---

## Workflow Improvements

### 1. Tenant Onboarding Flow

Create standardized tenant onboarding:

1. Manager creates tenant record
2. System sends invitation email
3. Tenant sets password
4. Tenant completes profile
5. Tenant signs lease
6. Tenant sets up payment method
7. Dashboard shows onboarding progress

### 2. Payment Collection Flow

Standardize payment collection:

1. Invoice generated (auto or manual)
2. Tenant receives notification
3. Tenant initiates payment
4. Payment processed
5. Receipt generated
6. Invoice marked as paid
7. Allocation processed
8. Notification sent to both parties

### 3. Maintenance Request Flow

Standardize maintenance workflow:

1. Tenant submits request
2. Manager receives notification
3. Manager assigns priority
4. Manager schedules repair
5. Technician completes work
6. Tenant confirms completion
7. Invoice generated (if applicable)
8. Request closed

### 4. Lease Renewal Flow

Automate lease renewal:

1. System detects lease expiring in 30 days
2. Manager receives alert
3. Manager initiates renewal
4. Tenant receives renewal notice
5. Tenant accepts or negotiates
6. New lease created
7. Old lease archived
8. Deposit handled according to terms

---

## Dashboard Configuration

### Manager Dashboard Configuration

Add configuration options in settings:

```typescript
// Add to Settings.tsx
<DashboardSettings
  showRevenueChart={config.showRevenueChart}
  showOccupancyChart={config.showOccupancyChart}
  showActivityLog={config.showActivityLog}
  defaultView={config.defaultView}
  refreshInterval={config.refreshInterval}
/>
```

### Tenant Portal Configuration

Add tenant portal customization:

```typescript
// Add to tenant settings
<TenantPortalSettings
  enableAutoPayments={config.enableAutoPayments}
  enableNotifications={config.enableNotifications}
  preferredPaymentMethod={config.preferredPaymentMethod}
  language={config.language}
  currency={config.currency}
/>
```

---

## Monitoring and Alerts

### 1. Dashboard Performance Monitoring

Add performance tracking:

```typescript
// Add to dashboard components
useEffect(() => {
  const startTime = performance.now();
  
  // Component logic here
  
  const endTime = performance.now();
  logMetric('dashboard_render_time', endTime - startTime);
}, []);
```

### 2. Error Tracking

Ensure Sentry is configured:

```typescript
// Already configured in vite.config.ts
// Verify error tracking is active
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 3. User Activity Tracking

Track dashboard usage:

```typescript
// Add to dashboard components
useEffect(() => {
  logUserActivity({
    user_id: user.id,
    action: 'dashboard_view',
    dashboard: 'manager',
    timestamp: new Date().toISOString(),
  });
}, [user.id]);
```

---

## Implementation Priority

### High Priority (Immediate)
1. Orphaned tenant alerts
2. Data integrity warnings
3. Operations workflow section
4. Payment method setup guide

### Medium Priority (This Week)
1. Lease expiration alerts
2. Maintenance request tracking
3. User management overview
4. System health monitoring

### Low Priority (Next Sprint)
1. Performance metrics
2. Document management
3. Audit log viewer
4. Security alerts

---

## Testing Checklist

Before deploying enhancements:

- [ ] Test orphaned tenant alert displays correctly
- [ ] Test data integrity warnings are accurate
- [ ] Test operations workflow section loads
- [ ] Test payment method setup wizard
- [ ] Test lease expiration alerts
- [ ] Test maintenance request tracking
- [ ] Test user management overview
- [ ] Test system health monitoring
- [ ] Verify no performance degradation
- [ ] Verify mobile responsiveness
- [ ] Verify accessibility (WCAG 2.1 AA)

---

## Rollback Plan

If issues arise after deployment:

1. Revert dashboard configuration changes
2. Disable new features via feature flags
3. Monitor error rates in Sentry
4. Gather user feedback
5. Fix issues in staging
6. Redeploy after fixes

---

**Next Steps:**
1. Review this guide with stakeholders
2. Prioritize enhancements based on user feedback
3. Implement high-priority items first
4. Test thoroughly before deployment
5. Monitor performance after deployment
6. Gather feedback and iterate

**Note:** These enhancements focus on configuration and workflow improvements rather than code changes, minimizing the need for builds and deployments.
