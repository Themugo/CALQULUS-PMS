-- RentFlow Database Audit Script
-- Run this in Supabase SQL Editor to identify orphaned tenants and data integrity issues

-- ============================================================================
-- ORPHANED TENANTS AUDIT
-- ============================================================================

-- 1. Tenants without active leases
SELECT 
  'Tenants without active leases' as issue_type,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.phone as tenant_phone,
  t.created_at as created_date
FROM public.tenants t
LEFT JOIN public.leases l ON t.id = l.tenant_id AND l.status = 'active'
WHERE l.id IS NULL
ORDER BY t.created_at DESC;

-- 2. Tenants without any leases (including inactive)
SELECT 
  'Tenants without any leases' as issue_type,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.created_at as created_date
FROM public.tenants t
LEFT JOIN public.leases l ON t.id = l.tenant_id
WHERE l.id IS NULL
ORDER BY t.created_at DESC;

-- 3. Tenants without assigned units
SELECT 
  'Tenants without assigned units' as issue_type,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.created_at as created_date
FROM public.tenants t
LEFT JOIN public.leases l ON t.id = l.tenant_id
WHERE l.unit_id IS NULL
ORDER BY t.created_at DESC;

-- 4. Tenants without invoices
SELECT 
  'Tenants without invoices' as issue_type,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.created_at as created_date
FROM public.tenants t
LEFT JOIN public.invoices i ON t.id = i.tenant_id
WHERE i.id IS NULL
ORDER BY t.created_at DESC;

-- 5. Tenants without active contracts
SELECT 
  'Tenants without active contracts' as issue_type,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.created_at as created_date
FROM public.tenants t
LEFT JOIN public.contracts c ON t.id = c.tenant_id AND c.status = 'active'
WHERE c.id IS NULL
ORDER BY t.created_at DESC;

-- ============================================================================
-- USER AUDIT
-- ============================================================================

-- 6. All users with their roles
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.created_at as created_date,
  u.last_sign_in_at as last_login,
  ur.role as role,
  ur.approval_status as approval_status,
  ur.tenant_id as linked_tenant_id
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;

-- 7. Users without roles
SELECT 
  'Users without roles' as issue_type,
  u.id as user_id,
  u.email as user_email,
  u.created_at as created_date
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.id IS NULL
ORDER BY u.created_at DESC;

-- 8. Pending approval users
SELECT 
  'Users pending approval' as issue_type,
  u.id as user_id,
  u.email as user_email,
  ur.role as role,
  ur.approval_status as approval_status,
  u.created_at as created_date
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.approval_status = 'pending'
ORDER BY u.created_at DESC;

-- ============================================================================
-- LEASE AUDIT
-- ============================================================================

-- 9. Leases without tenants
SELECT 
  'Leases without tenants' as issue_type,
  l.id as lease_id,
  l.start_date,
  l.end_date,
  l.status as lease_status,
  l.created_at as created_date
FROM public.leases l
LEFT JOIN public.tenants t ON l.tenant_id = t.id
WHERE t.id IS NULL
ORDER BY l.created_at DESC;

-- 10. Leases without properties
SELECT 
  'Leases without properties' as issue_type,
  l.id as lease_id,
  l.tenant_id,
  l.start_date,
  l.end_date,
  l.status as lease_status
FROM public.leases l
LEFT JOIN public.properties p ON l.property_id = p.id
WHERE p.id IS NULL
ORDER BY l.created_at DESC;

-- 11. Leases without units
SELECT 
  'Leases without units' as issue_type,
  l.id as lease_id,
  l.tenant_id,
  l.start_date,
  l.end_date,
  l.status as lease_status
FROM public.leases l
WHERE l.unit_id IS NULL
ORDER BY l.created_at DESC;

-- 12. Expired leases still marked as active
SELECT 
  'Expired active leases' as issue_type,
  l.id as lease_id,
  l.tenant_id,
  l.start_date,
  l.end_date,
  l.status as lease_status
FROM public.leases l
WHERE l.status = 'active' AND l.end_date < CURRENT_DATE
ORDER BY l.end_date DESC;

-- ============================================================================
-- PROPERTY AUDIT
-- ============================================================================

-- 13. Properties without units
SELECT 
  'Properties without units' as issue_type,
  p.id as property_id,
  p.name as property_name,
  p.address as property_address,
  p.status as property_status
FROM public.properties p
LEFT JOIN public.units u ON p.id = u.property_id
WHERE u.id IS NULL
ORDER BY p.created_at DESC;

-- 14. Properties without managers
SELECT 
  'Properties without managers' as issue_type,
  p.id as property_id,
  p.name as property_name,
  p.status as property_status
FROM public.properties p
LEFT JOIN public.profiles pr ON p.manager_id = pr.id
WHERE pr.id IS NULL
ORDER BY p.created_at DESC;

-- ============================================================================
-- INVOICE AUDIT
-- ============================================================================

-- 15. Invoices without tenants
SELECT 
  'Invoices without tenants' as issue_type,
  i.id as invoice_id,
  i.invoice_number,
  i.amount,
  i.status as invoice_status,
  i.due_date,
  i.created_at as created_date
FROM public.invoices i
LEFT JOIN public.tenants t ON i.tenant_id = t.id
WHERE t.id IS NULL
ORDER BY i.created_at DESC;

-- 16. Overdue invoices not marked as overdue
SELECT 
  'Overdue invoices not marked as overdue' as issue_type,
  i.id as invoice_id,
  i.invoice_number,
  i.amount,
  i.status as invoice_status,
  i.due_date,
  i.created_at as created_date
FROM public.invoices i
WHERE i.due_date < CURRENT_DATE AND i.status NOT IN ('overdue', 'paid', 'void')
ORDER BY i.due_date DESC;

-- 17. Paid invoices without payment transactions
SELECT 
  'Paid invoices without payment transactions' as issue_type,
  i.id as invoice_id,
  i.invoice_number,
  i.amount,
  i.status as invoice_status,
  i.due_date,
  i.paid_date
FROM public.invoices i
LEFT JOIN public.payment_transactions pt ON i.id = pt.invoice_id
WHERE i.status = 'paid' AND pt.id IS NULL
ORDER BY i.paid_date DESC;

-- ============================================================================
-- PAYMENT AUDIT
-- ============================================================================

-- 18. Payment transactions without invoices
SELECT 
  'Payments without invoices' as issue_type,
  pt.id as payment_id,
  pt.amount,
  pt.status as payment_status,
  pt.payment_method,
  pt.created_at as created_date
FROM public.payment_transactions pt
LEFT JOIN public.invoices i ON pt.invoice_id = i.id
WHERE i.id IS NULL
ORDER BY pt.created_at DESC;

-- 19. Payment transactions without tenants
SELECT 
  'Payments without tenants' as issue_type,
  pt.id as payment_id,
  pt.amount,
  pt.status as payment_status,
  pt.payment_method,
  pt.created_at as created_date
FROM public.payment_transactions pt
LEFT JOIN public.tenants t ON pt.tenant_id = t.id
WHERE t.id IS NULL
ORDER BY pt.created_at DESC;

-- 20. Failed payment transactions
SELECT 
  'Failed payment transactions' as issue_type,
  pt.id as payment_id,
  pt.amount,
  pt.status as payment_status,
  pt.payment_method,
  pt.error_message,
  pt.created_at as created_date
FROM public.payment_transactions pt
WHERE pt.status = 'failed'
ORDER BY pt.created_at DESC;

-- ============================================================================
-- UNIT AUDIT
-- ============================================================================

-- 21. Units without properties
SELECT 
  'Units without properties' as issue_type,
  u.id as unit_id,
  u.unit_number,
  u.status as unit_status,
  u.created_at as created_date
FROM public.units u
LEFT JOIN public.properties p ON u.property_id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- 22. Units without leases
SELECT 
  'Units without leases' as issue_type,
  u.id as unit_id,
  u.unit_number,
  u.status as unit_status,
  u.property_id
FROM public.units u
LEFT JOIN public.leases l ON u.id = l.unit_id AND l.status = 'active'
WHERE l.id IS NULL AND u.status = 'occupied'
ORDER BY u.created_at DESC;

-- ============================================================================
-- MAINTENANCE AUDIT
-- ============================================================================

-- 23. Maintenance requests without tenants
SELECT 
  'Maintenance requests without tenants' as issue_type,
  mr.id as request_id,
  mr.title,
  mr.status as request_status,
  mr.priority,
  mr.created_at as created_date
FROM public.maintenance_requests mr
LEFT JOIN public.tenants t ON mr.tenant_id = t.id
WHERE t.id IS NULL
ORDER BY mr.created_at DESC;

-- 24. Open maintenance requests older than 30 days
SELECT 
  'Open maintenance requests > 30 days' as issue_type,
  mr.id as request_id,
  mr.title,
  mr.status as request_status,
  mr.priority,
  mr.created_at as created_date,
  EXTRACT(DAY FROM CURRENT_DATE - mr.created_at) as days_open
FROM public.maintenance_requests mr
WHERE mr.status NOT IN ('completed', 'cancelled') 
  AND mr.created_at < CURRENT_DATE - INTERVAL '30 days'
ORDER BY mr.created_at DESC;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

-- 25. Overall summary
SELECT 
  'Total Tenants' as metric,
  COUNT(*) as count
FROM public.tenants
UNION ALL
SELECT 
  'Total Users',
  COUNT(*)
FROM auth.users
UNION ALL
SELECT 
  'Total Leases',
  COUNT(*)
FROM public.leases
UNION ALL
SELECT 
  'Active Leases',
  COUNT(*)
FROM public.leases
WHERE status = 'active'
UNION ALL
SELECT 
  'Total Properties',
  COUNT(*)
FROM public.properties
UNION ALL
SELECT 
  'Total Units',
  COUNT(*)
FROM public.units
UNION ALL
SELECT 
  'Total Invoices',
  COUNT(*)
FROM public.invoices
UNION ALL
SELECT 
  'Unpaid Invoices',
  COUNT(*)
FROM public.invoices
WHERE status NOT IN ('paid', 'void')
UNION ALL
SELECT 
  'Total Payments',
  COUNT(*)
FROM public.payment_transactions
UNION ALL
SELECT 
  'Successful Payments',
  COUNT(*)
FROM public.payment_transactions
WHERE status = 'completed'
ORDER BY metric;
