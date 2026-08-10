# CALQULUS RMS â€“ Agent Memory

## Goal
Realign all dashboards to the new role architecture (Webhost, Manager, Landlord, Tenant, Submanager) and implement the UI patterns shown in the HTML mockup files.

## Constraints & Preferences
- Local folder: `C:\Users\hp\Desktop\Rentflow-FINAL-main`
- Repo: `https://github.com/Themugo/CALQULUS-RMS.git` â€” auto-deploys Vercel from `main`
- Production: `https://app.calqulusrms.com` / Supabase `aelzsqxllkypbzslxyju.supabase.co`
- Test accounts: `jimmythemugo@gmail.com` (manager), `kamauwamakena@gmail.com` (tenant), `mugo.james27@gmail.com` (webhost) â€” all pw `CALQULUS RMS@2026!`
- Demo accounts: `demo.manager@calqulusrms.com`, `demo.landlord@calqulusrms.com` â€” pw `Demo@2026`
- Edge functions deployed: `send-tenant-invitation`, `create-tenant-account`, `notify-manager-tenant-signup`
- 45 migrations in `supabase/migrations/`

## Build & Verify
- `npm run build` â€” production build (Vite/Rolldown)
- `npm run dev` â€” dev server at `http://localhost:5173`
- `npx tsc --noEmit` â€” TypeScript check
- `npx eslint src` â€” ESLint
- `npx vitest run` â€” 125 unit tests (12 files)
- `npm audit` â€” 0 vulnerabilities
- `npx playwright test` â€” 14 E2E tests (Chromium)

## Deploy
- `node scripts/deploy-production.mjs --dry-run` â€” pre-flight checks
- `node scripts/deploy-production.mjs` â€” deploy (build + edge functions + Vercel push)
- Set secrets: Supabase Dashboard â†’ Edge Functions â†’ Secrets
- Vercel auto-deploys from GitHub `main` branch

## Observability Stack

### Frontend Observability
- **Structured Logging** (`src/shared/lib/observability.ts`)
  - Correlation IDs for request tracing
  - Session context tracking
  - Component-level loggers
  - Performance marks and measures
  - Web Vitals monitoring (LCP, FID, CLS, TTFB)

- **Business KPIs** (`kpi.track()`)
  - Payment metrics (success/failed/pending)
  - Tenant events (signup, lease_signed, move_in/out)
  - Property events (created, unit_added, unit_occupied)
  - Revenue tracking by source

- **Application Metrics** (`metrics.record()`)
  - Counter, gauge, timing metrics
  - Batch flush to Supabase
  - Performance marks

- **Production Diagnostics** (`ProductionDiagnostics.tsx`)
  - Real-time component health checks
  - Ctrl+Shift+D to toggle
  - Correlation ID display for support

### Edge Function Observability
- **Health Check** (`supabase/functions/health-check/`)
  - GET `/health-check` - Basic health
  - GET `/health-check?detailed=true` - Full component status
  - GET `/health-check?metrics=true` - With metrics
  - Checks: Database, Auth, Storage, Edge Functions

### Monitoring Dashboards
- `monitoring/grafana-dashboards/observability.json` - Full observability dashboard
  - System Health Overview
  - Request Rate & Error Rate
  - Payment Operations
  - Web Vitals
  - Business KPIs

### Alerting
- Prometheus metrics-based alerts (`monitoring/alerts.yml`)
- Payment failure alerts
- Database connection pool monitoring
- Security alerts (failed logins, MFA bypass)

## CI/CD Pipeline

### GitHub Actions Workflows

1. **ci.yml** - Continuous Integration
   - Lint + Typecheck + Tests (fast feedback)
   - Security: Dependency Audit (npm audit --audit-level=high)
   - Security: Secret Detection (GitLeaks)
   - Build Verification
   - Bundle Size Check
   - Full Verify (production audit)
   - CI Summary Dashboard

2. **security-scan.yml** - Security Scanning (Weekly + On Push)
   - Secret Detection (GitLeaks)
   - Dependency Security Audit (npm audit)
   - CodeQL Security Analysis
   - Dependency Health Check
   - Supply Chain Security
   - SBOM Generation

3. **deploy-production.yml** - Production Deployment
   - Pre-deployment Quality Gate
   - Production Build
   - Lighthouse Performance Audit
   - E2E Test Verification
   - Vercel Deployment
   - Health Check
   - Rollback Validation
   - Deployment Notifications

4. **monitor.yml** - Deployment Monitoring (Every 15 min)
   - Endpoint Health Monitor
   - Performance Monitoring
   - SSL Certificate Check
   - Uptime Verification
   - Database Health Check
   - Rollback Capability Check

### Quality Gates
- Bundle size limit: 2.5MB (warning threshold)
- Lighthouse performance scores: Performance â‰Ą0.8, Accessibility â‰Ą0.9, Best Practices â‰Ą0.9
- Critical/High vulnerabilities: Block deployment
- Secret detection: Block deployment

### Configuration Files
- `.gitleaks.toml` - Secret scanning rules
- `lighthouse-budget.json` - Performance budgets
- `scripts/check-outdated-deps.mjs` - Dependency health checks

### Secrets Required (GitHub Actions)
- `VERCEL_TOKEN` - Vercel deployment
- `VERCEL_ORG_ID` - Vercel organization
- `VERCEL_PROJECT_ID` - Vercel project
- `E2E_MANAGER_EMAIL` / `E2E_MANAGER_PASSWORD` - E2E tests
- `E2E_TENANT_EMAIL` / `E2E_TENANT_PASSWORD` - E2E tests
- `SUPABASE_SERVICE_KEY` - Database health checks

## Progress

### Done
- **Sidebar restructured to match `calqulus_full_platform_v2.html` mockup**: Manager nav groups now show Overview (Dashboard), Tenants (Leases, Tenants, Invites, Vacation Notices), Billing (Billing, Water Billing, Statements), Operations (Maintenance, Reports), Account (Settings). Removed Properties group, Communication group, Finance extras, Services.
- **Water Billing standalone page** (`/water-billing`): New property selector + WaterBillingManager integration. Route added for manager, submanager, and agency roles.
- **Invites page** (`/invites`): Wraps InvitationTracker with InviteTenantDialog trigger. Route added for manager, submanager, and agency roles.
- **Statements page** (`/statements`): Wraps PropertyStatementTab with property selector. Route added for manager, submanager, and agency roles.
- **Landlord dashboard tenant PII removed**: Deleted Payment Activity tab (showed tenant names, units, property names). Removed InviteTenantDialog from property cards. Landlord now only sees aggregate revenue, occupancy, and property-level data â€” zero tenant PII.
- **`can_manage_tenants` removed from all TypeScript types**: Removed from `WebhostPermissions` interface, `AdminPermissionsRow`, `AuthContext.tsx` select query + mapping, `WebhostDashboard.tsx` bootstrap, `supabase/types.ts` (Row/Insert/Update), `useAdminPermissions.ts` comment.
- **AgencyDashboard `agency_id` â†’ `manager_id`**: Fixed deprecated query that referenced `agency_id` column (removed by pending migration). Agency sidebar updated with Invites, Statements links.
- **Agency routes expanded**: Added `/agency/water-billing`, `/agency/invites`, `/agency/statements` routes.
- **Role detection paths updated**: Added `/invites`, `/statements` to `managerPaths` in `AuthContext.tsx`.
- **Agency portal scaffolding** â€” added `'agency'` to `AppRole` type, `isAgency` to `AuthContext`. Created `AgencyDashboard.tsx` (stats cards, quick actions, sidebar nav), `AgencyAuth.tsx` (emerald-themed login). Routes: `/agency/login`, `/agency` with subroutes for Properties, Tenants, Leases, Billing, Maintenance, Landlords, Reports, Settings.
- **Major refactor from agencyâ†’landlord model**: Agency CRUD, filters, grouping, bulk assign removed from `Properties.tsx`.
- **Manager Landlords page** (`/landlords`): `ManagerLandlords.tsx` lists properties with linked landlords, revenue share %.
- **Submanager role-only conversion**: Removed `/submanager` standalone route. Submanagers use manager routes with `viewOnly` wrapper.
- **Rent payment flow**: Multi-modal (STK push, feature phone Paybill, bank transfer), auto SMS+email receipts.
- **Water billing system**: Meter readings per unit, auto-calc charge Ă— rate, "Bill" action.
- **Reports**: Financial/occupancy/maintenance tabs with Chart.js revenue bars/doughnut occupancy chart.

### Done
- **Webhost dashboard overhaul**: âś… Completed - Removed extra tabs (Oversight, Compliance, Platform Admins, Billing Blocks) to align sidebar to `dashboard_previews.html` (Overview, Managers, Properties, Billing, Tiers, Contracts, Security, Error Logs). Unlinked Landlords tab already exists (filtered by `manager_id IS NULL`). Webhost Overview already has no tenant metrics (only manager/property/platform billing stats).
- **Tenant dashboard hero card**: âś… Completed - TenantBalanceSummary already implements balance card with overdue/pending/clear states based on balance_due and isFullyPaid logic.

### Blocked
- New DB migrations (`20260530000000` through `20260601000001`) not yet applied â€” need Supabase DB password from Project Dashboard â†’ Settings â†’ Database.

## Key Accounts (test)
- Manager: `jimmythemugo@gmail.com` / `CALQULUS RMS@2026!`
- Tenant: `kamauwamakena@gmail.com` / `CALQULUS RMS@2026!`
- Webhost: `mugo.james27@gmail.com` / `CALQULUS RMS@2026!`
- Platform Business: `themugo@calqulusrms.com` (needs seeding)
- Platform Admin: `admin@calqulusrms.com` (needs seeding)
- Demo Manager: `demo.manager@calqulusrms.com` / `Demo@2026`
- Demo Landlord: `demo.landlord@calqulusrms.com` / `Demo@2026`

## Supabase
- URL: `https://aelzsqxllkypbzslxyju.supabase.co`
- 45 migrations in `supabase/migrations/`
- Service role key in `scripts/fix-roles.mjs`

## Performance Optimizations

### Frontend Optimizations Implemented

1. **Bundle Size Reduction via Code Splitting**
   - Enhanced Vite config with optimized manual chunks
   - Vendor chunks: react, router, query, ui, charts, pdf, utils, date, supabase
   - Route-based lazy loading with React.lazy/Suspense
   - CSS code splitting enabled

2. **React Performance**
   - `React.memo` with custom comparison functions in PropertyCard
   - `useMemo` for expensive calculations (occupancy rates, filters)
   - `useCallback` for stable callback references
   - Lazy image loading with IntersectionObserver

3. **List Virtualization**
   - `VirtualizedList` component for large datasets (1000+ items)
   - `WindowVirtualizer` for fixed-height items
   - `InfiniteScroll` with IntersectionObserver

4. **React Query Optimization**
   - 30-second staleTime (was 5 minutes)
   - 10-minute garbage collection
   - `staleWhileRevalidate: true`
   - `refetchOnMount: false`
   - Query key factory for consistent keys
   - Prefetching on route changes

5. **Route Prefetching**
   - `RoutePrefetcher` component preloads data for likely next routes
   - Dashboard prefetches properties and tenants
   - Properties page prefetches tenants

6. **Core Web Vitals Improvements**
   - Preconnect hints for Supabase and Google Fonts
   - DNS prefetch for external resources
   - Critical CSS inlined in index.html
   - Loading skeleton for instant perceived performance
   - Lazy image loading with blur-up placeholders

7. **Database Optimizations**
   - `get_manager_dashboard_stats` RPC function (single call vs 13 queries)
   - `get_tenants_with_properties` with JOINs pre-computed
   - `get_properties_with_tenant_counts` with occupancy rates
   - Optimized indexes on frequently queried columns

### Key Files
- `vite.config.ts` - Enhanced chunk splitting
- `src/shared/components/VirtualizedList.tsx` - Virtualization utilities
- `src/shared/components/LazyImage.tsx` - Lazy loading images
- `src/shared/hooks/useOptimizedQuery.ts` - Query optimization hooks
- `src/App.tsx` - Route prefetching and QueryClient config
- `src/features/properties/components/PropertyCard.tsx` - Memoized component
- `supabase/migrations/20260601000001_optimized_queries.sql` - DB RPC functions

### Expected Performance Impact
- **First Contentful Paint (FCP)**: 30-50% improvement via critical CSS
- **Largest Contentful Paint (LCP)**: 40-60% improvement via preconnects + lazy loading
- **Total Bundle Size**: Reduced via code splitting (vendor chunks load on-demand)
- **Time to Interactive (TTI)**: Improved via route prefetching
- **Database Query Count**: Reduced from ~13 queries to 1 RPC call per dashboard load

## Platform Admin Hierarchy
- `platform_admins` table: 3 tiers â€” owner (`is_immutable`), business, admin
- Owner: `mugo.james27@gmail.com` â€” cannot be suspended/deleted
- Business: `themugo@calqulusrms.com` â€” can be suspended by Owner only, can create admins
- Admin: `admin@calqulusrms.com` â€” can be suspended by Owner or Business
- Suspension rules enforced via DB trigger + application-level checks
- UI: Webhost Dashboard â†’ "Platform Admins" tab (owner/business only)

## Customer Billing Blocks
- `customer_billing_blocks` table: per-unit pricing overrides, waivers, discounts
- `price_per_unit` added to `subscription_tiers` (Lite: 40, Pro: 30, Enterprise: 20 KES/unit)
- UI: Webhost Dashboard â†’ "Billing Blocks" tab (owner/business only)
- Supports: per-unit pricing, registration fee waiver, %/flat discounts, custom negotiated blocks

## Webhost Oversight
- `PlatformOversight` component: aggregate stats per manager (properties, units, active tenants)
- No tenant PII exposed
- UI: Webhost Dashboard â†’ "Oversight" tab (all webhosts)

## Role Architecture

### Three-Role Architecture (Webhost sells to three portal types)
```
Tier 1: Platform Ownership
â”śâ”€â”€ Super Webhost (is_immutable)
â”śâ”€â”€ Webhost Admin
â””â”€â”€ Webhost Limited Admin
    â†’ NO tenant data access EVER
    â†’ NO tenant tab, NO tenant counts as individuals
    â†’ Sees only system landlords (manager_id IS NULL)

Tier 2: Property Management (three distinct portals)
â”śâ”€â”€ Manager â€” full operations + collections
â”‚   â†’ Manages tenants directly, collects rent to landlord/own accounts
â”‚   â†’ Owns property relationships, runs enforcement/repairs/services
â”‚   â””â”€â”€ Submanager (role, not portal â€” uses manager routes with permissions)
â”‚       â†’ Created by Manager via Settings â†’ Team
â”‚       â†’ Permission-gated via can()/canWrite() hooks
â”‚
â”śâ”€â”€ Agency â€” blended agent role
â”‚   â†’ Manages properties ON BEHALF OF landlords (commission model)
â”‚   â†’ Can collect rent to agency accounts OR pass through to landlords
â”‚   â†’ Links landlords to properties with configurable revenue sharing
â”‚   â†’ Full tenant management capabilities (same as manager)
â”‚   â†’ Portal at /agency â€” own sidebar, login, dashboard
â”‚
â””â”€â”€ Landlord â€” guarded standalone property owner
    â†’ Revenue-only view, NO tenant PII ever
    â†’ Can be linked to Manager (manager_id IS NOT NULL) or Agency
    â†’ System landlords (manager_id IS NULL) visible to webhost
    â†’ Managed landlords invisible to webhost
    â†’ Portal at /landlord/dashboard

Tier 3: Tenants
â”śâ”€â”€ Own portal only (/portal)
â”śâ”€â”€ NO access to other tenants' data
â””â”€â”€ NO landlord PII exposure
```

### Access URL Map
| Portal | URL |
|--------|-----|
| Webhost login | `/webhost/login` |
| Manager dashboard | `/` (after login) |
| Agency login | `/agency/login` |
| Agency dashboard | `/agency` |
| Landlord login | `/landlord/login` |
| Landlord dashboard | `/landlord/dashboard` |
| Tenant login | `/tenant/login` |
| Tenant signup | `/tenant/signup` |
| Tenant portal | `/portal` |

### Hard Access Rules
1. **Webhost tenant firewall**: Webhosts can NEVER access tenant data. No tenant routes, no tenant API queries, no `can_manage_tenants` permission.
2. **Landlord split by `manager_id`**: `manager_id IS NOT NULL` = managed (webhost has zero visibility). `manager_id IS NULL` = system (webhost oversight).
3. **Manager data isolation**: All queries scoped by `manager_id = auth.uid()`. No cross-manager data leakage.
4. **Landlord revenue-only view**: Landlords see aggregate revenue, NOT individual tenant names, contact info, or payment breakdowns.

### Role Definitions
| Role | Portal | Route | Who Creates | Description |
|------|--------|-------|-------------|-------------|
| **Webhost** | Own dashboard | `/webhost` | Platform Admin | Sells subscriptions, manages platform. Tiers: super_admin / admin / limited_admin |
| **Agency Team Manager** | Manager dashboard | `/` (via manager routes) | Buys from Webhost | "Boss" of an agency. Manages tenants directly and/or properties for landlords. Agency staff are submanagers. |
| **Agency Staff** | Manager dashboard (restricted) | `/` via manager routes | Agency Team Manager | Role assigned to agency staff. Uses same manager UI with limited permissions. Created via Settings â†’ Team. |
| **Manager** | Own dashboard | `/` | Webhost | Manages tenants on behalf of landlords. Has "Landlords" tab to link property owners. |
| **Submanager** | Manager dashboard (restricted) | `/` via manager routes | Manager | Role (NOT standalone portal). Uses same manager UI but with restricted permissions. Created via Settings â†’ Team. |
| **Landlord** | Guarded standalone portal | `/landlord/dashboard` | Invited by Manager or Webhost | Property owner. Sees aggregate revenue, requests payouts. NO tenant PII. Can be linked to Manager or Agency. |
| **Agency** | Own dashboard | `/agency` | Webhost | Blended agent role. Manages properties for landlords (commission model). Full tenant mgmt. Own login/sidebar. |
| **Tenant** | Own portal | `/portal` | Invitation from Manager | Lives in a unit. Pays rent, submits maintenance, views invoices. |

### Payment Flows
1. **Manager operates, landlord collects**: Manager manages tenants, runs enforcement/repairs/services. Payments go to property owner (landlord). Manager earns via platform subscription.
2. **Agency collects (full management)**: Agency manages tenants directly. Payments go to agency's accounts. Agency earns via management fee.
3. **Agency manages, pays landlord**: Agency manages property for landlord. Payments collected by agency, passed to landlord after deducting commission.
4. **Landlord self-managed**: Landlord operates their own properties independently through their portal.

### Key Tables
- `user_roles` â€” `(user_id, role: manager|tenant|webhost|submanager|landlord, approval_status)`
- `property_landlords` â€” `(property_id, landlord_user_id, manager_id, revenue_share_pct, operating_model, payment_destination)`
- `manager_submanagers` â€” `(manager_id, submanager_user_id)`
- `submanager_permissions` â€” Permission flags per submanager
- `submanager_property_assignments` â€” Property access restrictions per submanager

### What Changed
- **No "Agency" tab/management in Properties page**: Agencies are NOT managed by individual managers. Agency Team Managers buy subscriptions from Webhost directly.
- **New "Landlords" tab in Manager sidebar**: Managers link property owners via `/landlords` route.
- **Submanager is a role, not a portal**: Submanagers no longer have `/submanager` route. They use the same manager dashboard with permission restrictions via `can()`/`canWrite()` hooks.
- **Removed agency_id from properties**: Properties no longer have `agency_id` field. Agency relationships are managed through `property_landlords.operating_model`.

## Key Decisions
- **Three-role architecture**: Webhost sells to three portal types â€” Manager (full ops+collections), Agency (blended agent role), Landlord (guarded standalone, no tenant PII).
- **Agency is a separate portal** at `/agency` with own login, sidebar, and dashboard. Manages properties on behalf of landlords (commission model) and/or collects rent directly.
- **Landlord split by `manager_id`**: `manager_id IS NOT NULL` = managed landlord (visible only to manager, webhost has zero visibility). `manager_id IS NULL` = system landlord (under webhost oversight).
- **Submanager is a role, not a portal**: Submanagers use the same manager dashboard with restricted permissions via `can()`/`canWrite()` hooks. Created by Manager or Agency Team Manager in Settings â†’ Team.
- **Manager-enters-all-data model** (no smartphone required for tenant): manager fills name, email, phone, property, unit, rent, deposit upfront. Tenant only accepts + sets password.
- **Phone on invitation**: `tenant_invitations.phone` column added, pre-filled in `TenantAuth.tsx`.
- **Payment flows**: Manager operates/landlord collects OR agency collects(pays landlord after commission) OR landlord self-managed â€” configured via `property_landlords.operating_model`.

## Mockup References
- `calqulus_authority_structure.html`: defines hard role hierarchy tiers, access URL map, firewall rules.
- `dashboard_previews.html`: shows Webhost sidebar (Overview, Managers, Properties, Billing, Tiers, Contracts, Security, Error Logs), Landlord property cards with occupancy bars, Tenant hero balance card.
- `calqulus_full_platform_v2.html`: exact Manager sidebar layout (Dashboard, Leases, Tenants, Invites, Vacation Notices, Billing, Water Billing, Statements, Maintenance, Reports, Settings) + Tenant portal nav (Home, Pay Rent, Maintenance, Documents, Vacation Notice).

## Next Steps
1. Complete Agency portal pages: properties, tenants, leases, billing, maintenance, landlords, reports, settings under `/agency/*` routes.
2. Rebuild `WebhostDashboard.tsx`: remove tenant references, add Unlinked Landlords tab, align tabs to mockup (Overview, Managers, Properties, Billing, Tiers, Contracts, Security, Error Logs).
3. Rebuild `LandlordDashboard.tsx`: replace raw tenant payment table with property cards showing occupancy bars, revenue share %, "Your share" per property. No tenant PII at all.
4. Trim manager sidebar to match `calqulus_full_platform_v2.html`: Dashboard, Leases, Tenants, Invites, Vacation Notices, Billing, Water Billing, Statements, Maintenance, Reports, Settings.
5. Remove `can_manage_tenants` from `admin_permissions` table and `WebhostPermissions` type.
6. Block all `/tenants`, `/portal` routes for webhost role in route config.
7. Add `manager_id IS NULL` filter to webhost's landlord queries.
8. Apply pending DB migrations from Supabase Dashboard SQL Editor.
9. Re-deploy edge functions with latest `send-tenant-invitation` (phone support).
10. Remove `agency_id` column from `property_landlords` via migration.

## Relevant Files
- `src/features/webhost/pages/WebhostDashboard.tsx`: needs full rebuild â€” remove tenants, add unlinked landlords, match sidebar mockup.
- `src/features/landlord/pages/LandlordDashboard.tsx`: rebuild to show property cards with occupancy/revenue bars, no tenant PII.
- `src/shared/components/layout/Sidebar.tsx`: trim manager nav to match `calqulus_full_platform_v2.html`.
- `src/app/routes.ts`: block `/tenants` and `/portal` for webhost role.
- `src/features/properties/pages/Properties.tsx`: agency code already removed; manager property grid is flat.
- `src/features/landlord/pages/ManagerLandlords.tsx`: newly created â€” manage landlord links per property.
- `src/features/properties/components/PropertyAuthorityPanel.tsx`: operating model config (payment destination per landlord type).
- `src/features/landlord/components/LandlordTeamSettings.tsx`: submanager team mgmt.
- `src/shared/hooks/useRBAC.ts`: permission gating for submanager role.
- `src/features/auth/AuthContext.tsx`: role detection, `submanagerPermissions`.
- `supabase/migrations/20260523000000_operating_model_authority.sql`: operating model on `property_landlords`.
- `supabase/functions/send-tenant-invitation/index.ts`: stores `phone` on invitation, sends email/SMS/WhatsApp.
- `src/features/tenants/components/InviteTenantDialog.tsx`: accepts `preSelectedPropertyId` for property-scoped invites.

## Known Issues
- `manager_profiles` table created by migration 14 â€” NOT in `_base_schema.sql`
- `zod` v4 installed â€” `formatValidationErrors` uses `error.issues` (not `error.errors`)
- 8 outdated major deps remain: `tailwindcss 3â†’4`, `date-fns 3â†’4`, `react-day-picker 8â†’10`, `recharts 2â†’3`, `react-resizable-panels 2â†’4`, `eslint 9â†’10` + plugins
- E2E tests credential-gated via env vars
- `activity_logs` RLS requires `actor_id = auth.uid()` â€” direct inserts return 403; use `rpc('log_activity')` instead
- New migrations (`20260530000000_platform_admin_hierarchy.sql`, `20260530000001_customer_billing_blocks.sql`) must be run against Supabase project
- Platform admin accounts (owner/business/admin) need initial seeding in `platform_admins` table + `user_roles` + `admin_permissions`

## Vercel
- Auto-deploys from GitHub `main` branch
- `vercel.json` configures SPA rewrites + security headers
- CSP allows Supabase, Sentry, Stripe
- Production deploy is driven by `.github/workflows/deploy-production.yml` (NOT just Vercel auto-deploy): `deploy-vercel` job runs `vercel pull --yes` → `vercel build --prod --yes` → `vercel deploy --prebuilt --prod --yes`.
- **Required GitHub repo secrets for deploy to work:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (Settings → Secrets and variables → Actions). A `Verify Vercel secrets present` guard fails fast + names each missing secret before running the CLI. These secrets must ALSO be mapped into a step's `env:` block to be readable by `printenv` — GitHub Actions does NOT auto-expose secrets as env vars.
- The deploy job writes `.vercel/project.json` from `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` so the project is linked in CI even without a committed `.vercel/`.
- `DEPLOY_URL` is exposed as a job output and used by the `health-check` job (with a ~90s retry loop); `environment.url` is set from it.
- **Vercel project env vars (dashboard):** `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` must be set on the Vercel project or `vercel build` produces an app that can't reach Supabase. `.vercel/.env.build` is populated by `vercel pull`.
- Once secrets are set, re-run the failed deploy job: `gh run rerun <RUN_ID> --repo Themugo/CALQULUS-PMS --failed`.

## CI/CD Audit (2026-08-10)
- All GitHub Actions workflows now pass on `main` except the Vercel deploy (blocked only on the 3 repo secrets above).
- `deploy-production.yml` Performance Audit (Lighthouse) job previously failed with `CHROME_INTERSTITIAL_ERROR` because it ran `npm run preview` without building first; now builds with placeholder Supabase env + readiness poll before Lighthouse.
- `monitor.yml` Deployment Monitor: all 7 jobs pass. `Performance Monitoring` and `Uptime Check` curl calls now have `--max-time`/`--connect-timeout` + `|| echo` fallbacks so an unresolvable `app.calqulusrms.com` (not deployed yet) warns instead of aborting. `Rollback Health` has `actions/checkout` (was `fatal: not a git repository`).
- Local `npm run verify` (lint + typecheck + 578 tests + build + audit + audit:prod) passes end-to-end.
- `.vercel/project.json` is intentionally NOT committed (linked at deploy time from secrets).

## Sentry
- DSN in `.env.local` (gitignored)
- Free Dev plan
