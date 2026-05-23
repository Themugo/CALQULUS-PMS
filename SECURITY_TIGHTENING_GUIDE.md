# RentFlow Security Tightening Guide

**Purpose:** Tighten security and workflow without requiring builds  
**Status:** Configuration and policy improvements only  
**Updated:** May 23, 2026

---

## Current Security Status

### Already Implemented (10/10 Audit Score)
- ✅ Row-Level Security (RLS) on all critical tables
- ✅ Role-Based Access Control (RBAC) with 5-tier authority
- ✅ Constant-time webhook secret comparison
- ✅ Payment idempotency via database constraints
- ✅ Rate limiting with fail-closed for sensitive endpoints
- ✅ Webhook dead-letter queue
- ✅ Comprehensive security headers (HSTS, CSP, X-Frame-Options, etc.)
- ✅ Timing-safe comparisons for webhook verification
- ✅ Notification failure tracking
- ✅ Audit logging capability

---

## Additional Security Measures (Configuration Only)

### 1. Password Policy Enforcement

**Current State:** Password complexity not enforced at application level

**Recommendation:** Add password policy to Supabase Auth Dashboard

**Implementation:**
1. Go to Supabase Dashboard → Authentication → Policies
2. Enable password complexity requirements:
   - Minimum length: 8 characters
   - Require uppercase letters
   - Require lowercase letters
   - Require numbers
   - Require special characters
3. Enable password expiration: 90 days
4. Enable password history: prevent reuse of last 5 passwords

**No code changes required** - Supabase Dashboard configuration only.

---

### 2. Session Management

**Current State:** Sessions persist with auto-refresh tokens

**Recommendation:** Configure session timeout and concurrent session limits

**Implementation:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Configure session settings:
   - Session timeout: 24 hours
   - Maximum concurrent sessions: 3 per user
   - Require re-authentication for sensitive operations
3. Enable "Sign out all other sessions" option

**No code changes required** - Supabase Dashboard configuration only.

---

### 3. Two-Factor Authentication (2FA)

**Current State:** 2FA not implemented

**Recommendation:** Enable 2FA for webhost and manager roles

**Implementation:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable SMS 2FA (requires Africa's Talking credentials)
3. Enable TOTP 2FA (authenticator app)
4. Make 2FA required for:
   - Webhost role
   - Manager role
   - Submanager role

**No code changes required** - Supabase Dashboard configuration only.

---

### 4. Email Verification

**Current State:** Email verification optional

**Recommendation:** Require email verification for all new users

**Implementation:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Confirm email" setting
3. Enable "Enable email confirmations"
4. Configure email templates for verification
5. Set email verification as required before access

**No code changes required** - Supabase Dashboard configuration only.

---

### 5. IP Whitelisting

**Current State:** No IP restrictions

**Recommendation:** Implement IP whitelisting for webhost access

**Implementation:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable IP restrictions for specific roles
3. Whitelist known IP addresses for webhost access
4. Configure alerts for unauthorized access attempts

**No code changes required** - Supabase Dashboard configuration only.

---

### 6. Rate Limiting Configuration

**Current State:** Rate limiting implemented but may need adjustment

**Recommendation:** Review and adjust rate limits based on usage

**Implementation:**
1. Review current rate limits in `supabase/functions/_shared/rateLimit.ts`
2. Adjust limits based on actual usage patterns
3. Consider reducing limits for:
   - Payment initiation (currently 5/hour)
   - SMS sending (currently 10/hour)
   - Bulk operations (currently 2/hour)
4. Add rate limit alerts for monitoring

**Configuration change only** - adjust rate limit constants in existing file.

---

### 7. Webhook Security

**Current State:** Webhooks use timing-safe comparison

**Recommendation:** Add additional webhook security measures

**Implementation:**
1. Rotate webhook secrets regularly (every 90 days)
2. Use separate secrets for each webhook endpoint
3. Add IP whitelisting for webhook sources:
   - M-Pesa: whitelist Safaricom IP ranges
   - Stripe: whitelist Stripe IP ranges
   - Bank: whitelist bank IP ranges
4. Implement webhook signature verification

**Configuration change only** - update environment variables and Supabase settings.

---

### 8. Database Security

**Current State:** RLS policies comprehensive

**Recommendation:** Add additional database security measures

**Implementation:**
1. Enable database connection encryption
2. Configure connection pooling limits
3. Enable query logging for audit
4. Set up database backups:
   - Daily automated backups
   - Point-in-time recovery (PITR)
   - 7-day retention
5. Enable database activity monitoring

**No code changes required** - Supabase Dashboard configuration only.

---

### 9. API Security

**Current State:** Edge functions use Supabase auth

**Recommendation:** Add additional API security measures

**Implementation:**
1. Enable API key authentication for critical operations
2. Add request signing for sensitive endpoints
3. Implement request rate limiting per IP
4. Add CORS restrictions:
   - Whitelist allowed origins
   - Restrict HTTP methods
   - Limit request size

**Configuration change only** - update environment variables and Supabase settings.

---

### 10. Storage Security

**Current State:** Storage buckets with RLS

**Recommendation:** Enhance storage security

**Implementation:**
1. Review storage bucket permissions:
   - `maintenance-photos`: Public (read-only)
   - `tenant-photos`: Public (read-only)
   - `condition-photos`: Public (read-only)
   - `documents`: Private (authenticated users only)
2. Enable virus scanning for uploads
3. Set file size limits:
   - Photos: 10MB max
   - Documents: 25MB max
4. Enable file type restrictions
5. Set up CDN for public assets

**No code changes required** - Supabase Dashboard configuration only.

---

## Workflow Security

### 1. Approval Workflow

**Current State:** Manager accounts require approval

**Recommendation:** Extend approval workflow to all roles

**Implementation:**
1. Require approval for:
   - All new manager accounts
   - All new webhost accounts
   - All new submanager accounts
   - Landlord account creation
2. Implement approval notification system
3. Add approval audit trail
4. Set up approval timeout (48 hours)

**Configuration change only** - update approval status logic in existing code.

---

### 2. Financial Operations Security

**Current State:** Payment operations with idempotency

**Recommendation:** Add additional financial security measures

**Implementation:**
1. Require dual approval for:
   - Large payments (> KES 100,000)
   - Refunds
   - Deposit returns
2. Implement payment reconciliation workflow:
   - Daily reconciliation
   - Exception handling
   - Manual review for discrepancies
3. Add payment approval queue
4. Enable payment fraud detection

**Configuration change only** - add approval thresholds in existing code.

---

### 3. Data Access Security

**Current State:** RLS policies enforce access control

**Recommendation:** Add data access monitoring

**Implementation:**
1. Enable query logging for sensitive tables:
   - `tenants`
   - `invoices`
   - `payment_transactions`
   - `contracts`
2. Set up alerts for unusual access patterns
3. Implement data export restrictions
4. Add data access audit reports

**No code changes required** - Supabase Dashboard configuration only.

---

### 4. User Management Security

**Current State:** User roles with permissions

**Recommendation:** Enhance user management security

**Implementation:**
1. Implement principle of least privilege:
   - Review all user roles
   - Remove unnecessary permissions
   - Use submanager for limited access
2. Enable user account lockout:
   - 5 failed attempts
   - 30-minute lockout
   - Admin unlock required
3. Add user activity monitoring:
   - Track login times
   - Track IP addresses
   - Track unusual activity
4. Implement user offboarding workflow:
   - Immediate access revocation
   - Data retention policy
   - Audit trail preservation

**Configuration change only** - update user role logic in existing code.

---

## Monitoring and Alerting

### 1. Security Monitoring

**Current State:** Sentry error tracking

**Recommendation:** Add security-specific monitoring

**Implementation:**
1. Set up security alerts for:
   - Failed login attempts (> 5 in 5 minutes)
   - Rate limit hits
   - Webhook failures
   - Unauthorized access attempts
   - Data access anomalies
2. Configure alert channels:
   - Email alerts
   - SMS alerts (critical)
   - Slack integration
3. Set up security dashboard:
   - Real-time threat monitoring
   - Incident tracking
   - Response procedures

**No code changes required** - Supabase Dashboard and Sentry configuration only.

---

### 2. Compliance Monitoring

**Current State:** Audit logging capability

**Recommendation:** Add compliance monitoring

**Implementation:**
1. Enable compliance reports:
   - Data access logs
   - Payment transaction logs
   - User activity logs
   - System change logs
2. Set up compliance alerts:
   - Data retention violations
   - Access policy violations
   - Payment processing errors
3. Implement compliance dashboard:
   - Real-time compliance status
   - Exception tracking
   - Remediation workflows

**No code changes required** - Supabase Dashboard configuration only.

---

## Incident Response

### 1. Security Incident Response Plan

**Preparation:**
1. Document all security contacts
2. Set up communication channels
3. Prepare incident response templates
4. Train response team

**Detection:**
1. Monitor security alerts
2. Review audit logs daily
3. Check for unusual activity
4. Verify system integrity

**Response:**
1. Contain the incident
2. Identify affected systems
3. Preserve evidence
4. Notify stakeholders
5. Implement fixes
6. Document lessons learned

**Recovery:**
1. Restore from backups if needed
2. Verify system integrity
3. Monitor for recurrence
4. Update security measures

---

### 2. Data Breach Response

**Immediate Actions:**
1. Isolate affected systems
2. Preserve evidence
3. Notify security team
4. Assess scope of breach
5. Notify affected users (within 72 hours per GDPR)

**Follow-up Actions:**
1. Investigate root cause
2. Implement fixes
3. Review security policies
4. Update incident response plan
5. Document lessons learned

---

## Security Checklist

### Daily
- [ ] Review security alerts
- [ ] Check failed login attempts
- [ ] Verify rate limit status
- [ ] Review webhook failures
- [ ] Check system health

### Weekly
- [ ] Review audit logs
- [ ] Check user access patterns
- [ ] Verify backup completion
- [ ] Review payment reconciliation
- [ ] Check for orphaned data

### Monthly
- [ ] Rotate webhook secrets
- [ ] Review user access rights
- [ ] Update security policies
- [ ] Conduct security training
- [ ] Review compliance reports

### Quarterly
- [ ] Security audit
- [ ] Penetration testing
- [ ] Policy review
- [ ] Incident response drill
- [ ] Security training refresh

---

## Security Documentation

### Required Documentation
1. Security policy document
2. Incident response plan
3. Data classification policy
4. Access control policy
5. Password policy
6. Acceptable use policy
7. Data retention policy
8. Privacy policy
9. Third-party vendor security assessment
10. Compliance documentation

---

## Implementation Priority

### High Priority (Immediate)
1. Enable email verification
2. Configure session timeout
3. Set up security alerts
4. Review and adjust rate limits
5. Enable database backups

### Medium Priority (This Week)
1. Enable 2FA for webhost/managers
2. Configure IP whitelisting
3. Implement approval workflow
4. Set up compliance monitoring
5. Document security policies

### Low Priority (Next Sprint)
1. Implement dual approval for large payments
2. Add virus scanning for uploads
3. Set up CDN for public assets
4. Conduct security audit
5. Implement penetration testing

---

## Testing Checklist

Before implementing security measures:

- [ ] Test email verification flow
- [ ] Test session timeout behavior
- [ ] Test 2FA enrollment and login
- [ ] Test IP whitelisting
- [ ] Test rate limiting
- [ ] Test webhook security
- [ ] Test database backup and restore
- [ ] Test security alerts
- [ ] Test incident response procedures
- [ ] Verify no performance degradation

---

## Rollback Plan

If security measures cause issues:

1. Disable new security features via feature flags
2. Revert configuration changes
3. Monitor error rates in Sentry
4. Gather user feedback
5. Fix issues in staging
6. Re-enable after fixes

---

**Next Steps:**
1. Review this guide with security team
2. Prioritize security measures based on risk assessment
3. Implement high-priority items first
4. Test thoroughly before deployment
5. Monitor security metrics after implementation
6. Update security policies regularly

**Note:** All security measures in this guide can be implemented through configuration changes only, requiring no code builds or deployments.
