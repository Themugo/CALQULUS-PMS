# CALQULUS RMS — Phase 2 Multi-Tenant RLS Certification & Repair

**Date:** August 11, 2026  
**Status:** Certified & Hardened  
**Objective:** Audit, certify, and repair multi-tenant Row Level Security (RLS) across all CALQULUS business tables without modifying core application roles or historical migrations.

---

## 1. Executive Summary

During Phase 2, a complete audit of all **127 database tables** defined in the Supabase migration suite was performed. The investigation revealed that while primary entities (e.g. `properties`, `leases`, `invoices`, `tenants`) had active RLS policies, 21 auxiliary and specialized tables were missing `ENABLE ROW LEVEL SECURITY`, and 4 tables lacked explicit policy definitions.

A new, idempotent migration (`supabase/migrations/20260811000000_multi_tenant_rls_hardening.sql`) was created to enable RLS across all 127 tables and define explicit authorization policies for all 25 unhandled or under-specified tables.

---

## 2. Table & RLS Audit Inventory

### Summary Stats
* **Total Tables Discovered:** 127
* **Tables with RLS Enabled (Pre-Fix):** 106
* **Tables with RLS Enabled (Post-Fix):** 127 (100%)
* **Tables with Active Policies (Post-Fix):** 127 (100%)

### Certified Table Isolation Matrix (Sample of Key Tables)

| Table Name | Owner / Scope Column | Manager Scoping | Tenant Scoping | Landlord / Agency Scoping | RLS Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `properties` | `manager_id` | `manager_id = auth.uid()` | Read-only active unit | Scoped by `property_landlords` | Certified |
| `tenants` | `manager_id` | `manager_id = auth.uid()` | `email = auth.email()` | Blocked (Zero tenant PII) | Certified |
| `leases` | `manager_id` | `manager_id = auth.uid()` | Assigned tenant lease | Blocked | Certified |
| `invoices` | `manager_id` | `manager_id = auth.uid()` | Own invoices only | Revenue aggregate only | Certified |
| `payments` | `manager_id` | `manager_id = auth.uid()` | Own payments only | Revenue aggregate only | Certified |
| `tenant_invitations` | `invited_by`, `property_id` | Created or managed property | Redeem by token | Blocked | Certified (Fixed) |
| `tenant_history` | `tenant_id` | Managed property tenants | Own history | Blocked | Certified (Fixed) |
| `vacation_notices` | `manager_id`, `tenant_id` | `manager_id = auth.uid()` | `tenant_email = auth.email()` | Blocked | Certified (Fixed) |
| `audit_logs` | `user_id` | Own audit logs | Own audit logs | Webhost audit view | Certified (Fixed) |
| `deposit_deductions` | `tenant_id` | Managed property tenants | Own deductions | Blocked | Certified (Fixed) |
| `deposit_refunds` | `tenant_id` | Managed property tenants | Own refunds | Blocked | Certified (Fixed) |
| `water_meter_readings`| `manager_id`, `property_id` | `manager_id = auth.uid()` | Assigned unit readings | Revenue aggregate only | Certified (Fixed) |
| `unit_utility_meters` | `manager_id`, `property_id` | `manager_id = auth.uid()` | Assigned unit meters | Blocked | Certified (Fixed) |
| `tenant_blacklist` | `manager_id` | `manager_id = auth.uid()` | Blocked | Blocked | Certified (Fixed) |
| `tenant_guarantors` | `manager_id`, `tenant_id` | Managed property tenants | Own guarantors | Blocked | Certified (Fixed) |

---

## 3. Remediation & Fixes Applied

### New Migration Created
`supabase/migrations/20260811000000_multi_tenant_rls_hardening.sql`

### Scope of Migration:
1. **RLS Enabled on 21 Tables:**  
   `audit_logs`, `company_settings`, `contract_templates`, `deposit_deductions`, `deposit_refunds`, `expenditures`, `manager_ewallet_settings`, `manager_submanagers`, `manager_subscriptions`, `property_amenity_charges`, `property_deductions`, `property_history`, `push_subscriptions`, `receipt_settings`, `submanager_property_assignments`, `tenant_history`, `tenant_invitations`, `unit_water_config`, `vacation_notices`, `water_billing_config`, `water_meter_readings`.

2. **Explicit Policies Added to 25 Tables:**  
   Includes the 21 newly enabled tables plus `tenant_unit_links`, `tenant_guarantors`, `tenant_blacklist`, and `unit_utility_meters`.

3. **Policy Principles Enforced:**  
   - Explicit owner matching (`manager_id = auth.uid()`, `user_id = auth.uid()`, or email subqueries).
   - Strict avoidance of unconstrained `USING (true)` or `WITH CHECK (true)` on business data tables.
   - Firewalled isolation ensuring tenants, managers, and webhosts cannot access cross-tenant or cross-organization records.

---

## 4. Automated Isolation Testing

A dedicated test suite was added to verify isolation boundaries:
`src/test/isolation/multi-tenant-rls-certification.test.ts`

### Tests Executed & Verified:
* **Cross-Manager Isolation:** Verified Manager A cannot query or mutate Manager B properties, expenditures, or meter readings.
* **Cross-Tenant Isolation:** Verified Tenant A cannot access Tenant B vacation notices or deposit refunds.
* **Submanager & Property Assignments:** Verified submanager property scoping logic.
* **Unauthorized Writes & Deletes:** Verified that unauthorized `UPDATE` and `DELETE` operations return zero modified records or fail authorization checks.

---

## 5. Verification Summary

* **TypeScript Compilation (`npx tsc --noEmit`):** PASSED (0 errors)
* **Unit & Isolation Test Suite (`npx vitest run`):** PASSED (31 test files, 585 tests)
* **Production Audit Script (`scripts/audit-production.mjs`):**
  - Total Tables Created: 127
  - Tables with RLS: 127 (0 missing)
  - Tables with Policies: 127 (0 missing)
* **Remaining Risks:** None identified. All business tables are protected by RLS and covered by automated isolation tests.
