# CALQULUS Onboarding & Authentication Audit

**Date:** 2026-08-23 · **Scope:** registration, authentication, onboarding only. Dashboards, backend architecture, and business functionality intentionally untouched.

---

## CURRENT REGISTRATION FLOW

| Portal | Entry | Endpoint | Role injection | Verification | Organization |
|---|---|---|---|---|---|
| **Manager** | `/auth?tab=signup` | `supabase.auth.signUp` | `data: { full_name, role: 'manager' }` → `handle_new_auth_user()` DB trigger writes `user_roles` | email confirmation required | none — first `properties` insert creates org via `company_settings` / agencies upsert |
| **Agency** | `/agency/login` (login only; self-signup not exposed) | `supabase.auth.signInWithPassword` | invite / role assigned by admin | — | agencies created by manager or platform admin |
| **Landlord** | `/landlord/login` (login only) | `supabase.auth.signInWithPassword` | invite only (self-signup removed) | — | landlord created by manager invite |
| **Tenant** | `/tenant/signup` → `/tenant/invitation` → `/tenant/login` | `supabase.auth.signUp` (magic link) | invite code, then `TenantAuth` OTP | email + invite | created by manager via `send-tenant-invitation` |
| **WebHost** | `/webhost/login` | `supabase.auth.signInWithPassword` | seeded by `bootstrap-webhost` edge function | — | seeded platform account |
| **Submanager** | same manager routes | — | manager invites in Settings → Team | — | manager-owned |

## CURRENT LOGIN FLOW

1. `signIn(email, password)` → `supabase.auth.signInWithPassword`
2. `ensureSignedInRole([portal roles])` reads `user_roles` and either admits to the portal's desk or redirects (tenant → `/portal`, webhost → `/webhost`, landlord → `/landlord/dashboard`).
3. Session via `@supabase/supabase-js` (JWT in localStorage); `AuthContext` resolves `userRole` via `pickRoleForPath(roles, pathname)` — the correct role is selected by the URL, never trusted from the client.

## CURRENT VERIFICATION FLOW

- **Email confirmation:** required for manager sign-up; `emailRedirectTo` points back to the portal login path (`/auth`, `/agency/login`, `/landlord/login`, `/tenant/login`, `/webhost/login`).
- **Resend verification:** exists in `Auth.tsx` (manager page) via `supabase.auth.resend`.
- **Tenant:** magic link + OTP — `TenantSelfRegister` verifies invite code (`tenant_invitations`) then presents a 3-step form (verify → profile → done); `TenantAuth` handles OTP entry.
- **Reset password:** `ResetPassword.tsx` uses the Supabase `recovery` flow; `ForgotPasswordDialog` triggers the email.

## CURRENT INVITATION FLOW

- **Tenant:** `send-tenant-invitation` edge function → writes `tenant_invitations` (email/phone) → email/SMS link with invite code → `TenantSelfRegister` verifies code → account created.
- **Manager:** `notify-new-manager-signup` after manager/agency sign-up.
- **WebHost:** seeded via `bootstrap-webhost`.

## CURRENT ROLE FLOW

- `AuthContext` does **not** trust any client-passed role. `signUp` sends `role` as metadata only — the DB trigger `handle_new_auth_user()` (hardened by migration `20260811000003`) sanitizes that metadata and writes `user_roles` rows. The comment in `AuthContext.signUp` explicitly says "The client must not upsert user_roles (privilege escalation)."
- **Resolution:** `pickRoleForPath` chooses the correct role from the current pathname when a user has multiple roles — no session hijack risk.
- **Approvals:** `user_roles.approval_status` (`pending`/`approved`/`rejected`/`suspended`). `PendingApproval` polls every 30 s until the role is approved.

## CURRENT ORGANIZATION FLOW

- No "Create organization" step in onboarding. Managers land on `/` (dashboard) and are nudged by `Portfolio setup N% complete` to add a company profile (Settings → Company) and their first property.
- `company_settings` holds the org brand/white-label record; the agency row is upserted by manager signup.
- **Organization duplicate risk:** none by design — one `company_settings` per `manager_user_id`.

## CURRENT REDIRECT LOGIC

- After sign-up, users land on the dashboard (`/`) unless a role requires otherwise; `pending` approval status routes to `/pending-approval`.
- Auth pages redirect on `user && !loading` to their portal home. `pickRoleForPath` prevents cross-portal bounce.

## CURRENT DATABASE RELATIONSHIPS

- `auth.users` ←→ `user_roles` (role, approval_status, tenant_id)
- `user_roles.manager_id` (submanagers) → `submanager_permissions`, `submanager_property_assignments`
- `admin_permissions` (webhost)
- `platform_admins` (3-tier: owner / business / admin, owner immutable)
- `tenant_invitations` → `tenants` → `units`/`properties` → `property_landlords`
- `manager_profiles` (org), `company_settings` (org brand)
- `activity_logs` (RLS: `actor_id = auth.uid()`, insert via `rpc('log_activity')`)

## CURRENT SECURITY CONTROLS

- RLS on every table (migrations 202605xxxx → 2026082xxxx)
- Sign-up metadata sanitized in `handle_new_auth_user` (client cannot pick role)
- Password rules in `signupSchema` (8+ chars, upper, lower, number, special)
- Rate limiting enforced by Supabase Auth
- Login error mapping via `sanitizeAuthError` — no user enumeration
- Dev auto-login is disabled in production builds (`isDevAccessEnabled` PROD gate)
- Tenant firewall: `withoutTenantEntities` / `isTenantEntityType` on webhost queries
- Biometric login gated behind stored credentials; requires sign-in fallback

## CURRENT UX PROBLEMS

1. **Two entry points to manager sign-up** (`/auth` and the marketing `Get started` CTA) plus the onboarding shell; role selection only happens *after* the user picks the wrong portal.
2. **Duplicated auth components** — five separate `Auth.tsx` variants (manager/landlord/agency/tenant/webhost) with near-identical form markup, biometric logic, error mapping, password toggles. `AuthHeroChrome` exists but each page re-implements the shell.
3. **Tenant flow is 3 pages deep** (`/tenant/signup` → `/tenant/invitation` → `/tenant/login`) before first login; manager flow is 1 page.
4. **Password strength meter** is client-side only (`TenantSelfRegister`); manager sign-up only validates on submit.
5. **Pending-approval** polling never lands the user on a helpful next step once approved (auto-poll exists but no redirect).
6. **"Organization" step is implicit** — new manager must discover Settings → Company and Portfolio setup on their own.

## CURRENT TECHNICAL RISKS

1. `signUp` passes `role` as metadata and also tracks commercial events — a malicious client could spam `notify-new-manager-signup` and `send-welcome-email` edge functions (no rate-limit in the client; DB RLS stops the role write, not the notifications).
2. Session persistence is in localStorage (Supabase default) — XSS exposure if a partner surface is ever added.
3. `sanitizeAuthError` hides account-exists vs wrong-password, but the toast copy could be clearer about next steps.
4. Tenant invite codes are plain strings in the URL (`?code=`) — leak via browser history/log; acceptable short-lived but worth noting.

## CURRENT DUPLICATION

| Pattern | Duplicated in |
|---|---|
| Email/password form + validation | manager, landlord, agency, tenant, webhost |
| Biometric login logic | manager, landlord, agency |
| Error mapping (`sanitizeAuthError`) | shared lib ✓ |
| Hero/feature list per portal | 5 different copies |
| Loading screen | `AuthLoadingScreen` shared ✓ |
| Password visibility toggle | all 5 pages |
| "Wrong portal" redirect | manager, landlord |

## RECOMMENDED FLOW

1. **Unify the shell:** one `PortalAuthShell` per portal role, driven by the same component with only the feature list and accent differing. Keep `Auth.tsx` for manager and reuse the shell for the rest.
2. **One-page manager registration** (email → password → name → create) then land on `/` with the existing Portfolio setup panel as step 2.
3. **Tenant:** keep the invite code flow but collapse `/tenant/signup` and `/tenant/invitation` into a single `/tenant/invite` page (verify code inline).
4. **Explicit organization step (post-registration):** after first manager login, present "Company profile" as the first checklist item (existing Portfolio setup does this visually — wire it as the next-step target).
5. **Plan/subscription selection:** currently absent — manager lands on the dashboard with a `trial_started` event but no plan choice. Defer until the commercial phase.
6. **Verification:** keep email confirmation mandatory; surface a "resend" link on the PendingApproval screen too (manager page already has it).
7. **No client-side role choice:** keep the DB trigger as the only role writer.

---

*This document is the audit output; no auth logic, routes, or schema were modified.*
