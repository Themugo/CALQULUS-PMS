# RentFlow User Credentials Report

**Generated:** May 23, 2026  
**Purpose:** Document all existing users and their credentials for consistency and security

---

## Current Users

Based on the user's statement, there are currently **3 users** in the system:
- 1 Manager
- 1 Tenant
- 1 Webhost

---

## SQL Query to Get All Users

Run this in Supabase SQL Editor to get the complete list of users:

```sql
-- Get all users with their roles and status
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.created_at as created_date,
  u.last_sign_in_at as last_login,
  u.email_confirmed_at as email_confirmed,
  ur.role as role,
  ur.approval_status as approval_status,
  ur.tenant_id as linked_tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.phone as tenant_phone
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.tenants t ON ur.tenant_id = t.id
ORDER BY u.created_at DESC;
```

---

## SQL Query to Reset User Passwords

If you need to reset passwords for any user:

```sql
-- Reset password for a specific user (replace with actual email)
-- This will send a password reset email to the user
-- You can also use the Supabase Dashboard → Authentication → Users → Reset Password

-- Alternative: Direct password reset (requires service role key)
-- This is more secure as it doesn't send an email
-- Run this in Supabase SQL Editor with service role privileges:

-- UPDATE auth.users
-- SET encrypted_password = crypt('NEW_PASSWORD_HERE', gen_salt('bf'))
-- WHERE email = 'user@example.com';
```

---

## User Management SQL

### Create New Manager

```sql
-- Step 1: Create user in auth.users (via Supabase Dashboard or signup)
-- Step 2: Assign manager role
INSERT INTO public.user_roles (user_id, role, approval_status)
VALUES ('USER-UUID-HERE', 'manager', 'approved');
```

### Create New Tenant

```sql
-- Step 1: Create tenant record
INSERT INTO public.tenants (name, email, phone, manager_id)
VALUES ('Tenant Name', 'tenant@example.com', '+254700000000', 'MANAGER-UUID-HERE');

-- Step 2: Create user in auth.users (via Supabase Dashboard or signup)
-- Step 3: Link user to tenant
INSERT INTO public.user_roles (user_id, role, tenant_id, approval_status)
VALUES ('USER-UUID-HERE', 'tenant', 'TENANT-UUID-HERE', 'approved');
```

### Create New Webhost

```sql
-- Step 1: Create user in auth.users (via Supabase Dashboard or signup)
-- Step 2: Assign webhost role
INSERT INTO public.user_roles (user_id, role, approval_status)
VALUES ('USER-UUID-HERE', 'webhost', 'approved');

-- Step 3: Grant webhost permissions
INSERT INTO public.admin_permissions (
  user_id,
  admin_level,
  can_create_webhosts,
  can_manage_billing,
  can_manage_managers,
  can_manage_properties,
  can_manage_tenants,
  can_view_activity_logs
) VALUES (
  'USER-UUID-HERE',
  'full',
  true,
  true,
  true,
  true,
  true,
  true
);
```

---

## Security Recommendations

### 1. Password Policy

- Minimum 8 characters
- Include uppercase, lowercase, numbers, and special characters
- Change passwords every 90 days
- Use unique passwords for each user

### 2. User Roles

- **Webhost**: Full administrative access, can create/managers/tenants
- **Manager**: Can manage properties, tenants, leases, payments
- **Tenant**: Can view their own data, make payments, submit maintenance requests
- **Submanager**: Limited access to assigned properties
- **Landlord**: Can view property data, receive payments

### 3. Approval Status

- **approved**: User has full access
- **pending**: User is waiting for approval (cannot access system)
- **rejected**: User has been denied access

### 4. Session Management

- Sessions auto-refresh tokens
- Sessions persist in localStorage (with safe storage wrapper)
- Users can sign out from all devices via Supabase Dashboard

---

## Audit Trail

### View User Activity

```sql
-- View recent user activity
SELECT 
  u.email as user_email,
  al.action as action,
  al.resource_type as resource_type,
  al.resource_id as resource_id,
  al.created_at as timestamp,
  al.ip_address as ip_address,
  al.user_agent as user_agent
FROM public.audit_logs al
JOIN auth.users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 50;
```

### View Login History

```sql
-- View login history (from Supabase Dashboard)
-- Go to Authentication → Users → Click on user → View sessions
```

---

## Orphaned Tenant Detection

### Find Tenants Without Users

```sql
-- Tenants without linked user accounts
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.phone as tenant_phone,
  t.created_at as created_date
FROM public.tenants t
LEFT JOIN public.user_roles ur ON t.id = ur.tenant_id
WHERE ur.id IS NULL
ORDER BY t.created_at DESC;
```

### Find Users Without Tenants (for tenant role)

```sql
-- Users with tenant role but no linked tenant record
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.created_at as created_date
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'tenant' AND ur.tenant_id IS NULL
ORDER BY u.created_at DESC;
```

---

## Dashboard Access by Role

| Role | Dashboard URL | Features |
|------|---------------|----------|
| Manager | `/` | Full property management, tenant management, billing, maintenance |
| Tenant | `/portal` | View invoices, make payments, submit maintenance requests, view lease |
| Webhost | `/webhost` | Create managers, view system stats, manage billing |
| Submanager | `/submanager` | Limited access to assigned properties |
| Landlord | `/landlord/dashboard` | View property data, receive payments |

---

## Next Steps

1. **Run the user audit query** to get the current list of users
2. **Verify all users have correct roles** and approval status
3. **Check for orphaned tenants** using the orphan detection queries
4. **Reset passwords** if needed using Supabase Dashboard
5. **Document credentials securely** (use a password manager)
6. **Review audit logs** for any suspicious activity

---

## Credential Template

Use this template to document user credentials securely:

```
=== MANAGER ===
Email: [manager-email]
Password: [manager-password]
Role: manager
Status: approved
Last Login: [date]

=== TENANT ===
Email: [tenant-email]
Password: [tenant-password]
Role: tenant
Status: approved
Tenant ID: [tenant-uuid]
Last Login: [date]

=== WEBHOST ===
Email: [webhost-email]
Password: [webhost-password]
Role: webhost
Status: approved
Last Login: [date]
```

---

**Security Note:** Never commit actual credentials to git. Store them securely in a password manager or encrypted vault.
