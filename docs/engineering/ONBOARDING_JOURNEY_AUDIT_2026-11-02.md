# Onboarding journey audit — 2026-11-02

Scope: manager, landlord and agency guided setup, the shared "resume setup" screen, the dashboard entry points, and the links each step points at. Tenant invitation (Phase 7) and registration/approval (Phase 2F) were audited earlier and not re-opened.

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| 1 | Saving a wizard step through `save_manager_company_settings_atomic` blanked address, city, state, zip, email, phone, website, brand colour and logo, replaced `brand_config` outright, and (agency/manager) blanked the `agencies` row (county, KRA PIN, registration no., WhatsApp). | High (data loss) | Wizards now use `saveOnboardingSettings` (read, merge, send full record). Migration 20260909000015 makes the RPC presence-aware and merges `brand_config` (nested `onboarding` merged key by key). Verified on a throwaway Postgres 16 stub. |
| 2 | Manager "property types" step wrote `company_name = "CALQULUS Workspace"`; landlord steps wrote "My property business" when the draft was empty. Real organization names were overwritten with placeholders. | High | Placeholders removed; the name is only sent when the person typed one. |
| 3 | Nothing linked a new manager or landlord into the guided setup (`/onboarding/manager`, `/landlord/onboarding` were reachable only from the resend-verification email link). | High (journey dead end) | "Guided setup" button on the manager dashboard checklist; "Finish setting up your profile" on the empty landlord dashboard. |
| 4 | Manager team step created an account with `auth.signUp`, a random password and client-supplied `role`/`manager_id` metadata. The invitee never got usable credentials and was never linked (`manager_submanagers` row), so the step could never complete. | High | Step now opens Settings → Team (the real flow: name, password, permissions via `provision_submanager_atomic`). |
| 5 | "Back" buttons called `skipStep` and moved FORWARD (manager, landlord; agency partly). | Medium | Real `goBack` everywhere. |
| 6 | Wizards always restarted at step 1 and showed a green tick for any step before the current one, so skipped steps looked done. | Medium | Resume at the first unfinished step; ticks only for steps that are actually complete. |
| 7 | Landlord facts were stubs: property types always empty, property count read `properties.manager_id` (the manager) instead of `property_landlords`, so "first property" and "portfolio" never completed. | Medium | Facts read `property_landlords` and the saved `landlordPropertyTypes`. |
| 8 | Manager wizard required the optional team step to reach "complete". | Medium | Complete once the required steps are done. |
| 9 | `/onboarding` resume screen hard-coded `hasPaymentMethod=false`, `leaseCount=0`, `paidInvoiceCount=0`, disagreed with the dashboard, and optional steps blocked 100%, so it could never finish. | Medium | Reuses the dashboard's `fetchActivationFacts`; optional steps no longer block completion; agency/landlord are redirected to their own flows. |
| 10 | Dead links: `/tenant/account`, `/landlord/properties`, `/landlord/revenue`, and the literal `/properties/:firstPropertyId`. | Medium | Repointed to `/portal/profile`, `/landlord/portfolio`, `/landlord/financials`, `/properties`. A test now asserts every onboarding href is a registered route. |
| 11 | Agency "landlords" step was marked done when any unit existed. | Low | Uses a landlord count. |

## Not changed / open
- Skipped optional steps are not persisted across reloads (the dashboard keeps its own local skip list).
- Landlord "first property" asks a landlord to add a building, but in practice a manager links it; the copy on the empty dashboard already says so. Product decision needed on whether the landlord wizard should drop that step.
- The tenant onboarding path in `roleOnboarding.ts` is not wired to any screen.
- Migration 20260909000015 changes how `save_manager_company_settings_atomic` treats absent keys (they are kept). Full-form saves are unaffected. `brand_config` keys can no longer be removed by omitting them; set them to null/default instead.
- Migrations now unapplied: 20260908000001/2 and 20260909000001-15.

## Verification
tsc clean, lint 0 errors, vitest green (see session). Not exercised in a real browser or against the real database.

## Second pass (2026-11-04): tenant journey
Audited `TenantSelfRegister`, `TenantAuth` (invitation), `ActivateAccount`, `PendingApproval`.
- Fixed: the invitation "check your email" screen offered "try again", which re-submitted signup. It now uses the shared resend-verification button (60 s cooldown, generic copy).
- No defects found in self-registration, activation (token validated server-side, URL scrubbed, password and terms enforced) or the pending-approval poll.
- Still open (product decisions): landlord "first property" step vs manager-linked buildings; skipped optional wizard steps are not persisted; the tenant path in `roleOnboarding.ts` is unwired.

## Third pass (2026-11-07): skipped steps persist
"Skip for now" choices are now stored in `brand_config.onboarding.skipped` (merge-safe save) via `useSkippedOnboardingSteps`. Manager, landlord and agency wizards no longer resume into a step the person skipped, across reloads and devices. Skipping still never blocks completion. Remaining open: landlord "first property" step vs manager-linked buildings (product decision); tenant path in `roleOnboarding.ts` unwired.

## Fourth pass (2026-11-07): ownership model settled
Product rule (from the owner): every property belongs to its landlord. The landlord either (a) manages it directly and assigns a hired manager or family members as a team, or (b) puts it under an agency. Agencies run the whole flow (payments, repairs, bills) or take limited roles such as enforcing payments while the landlord collects. Agencies link landlords and set what each landlord can see; a landlord does not hire an agency's staff.
- Landlord wizard: first-property copy now says a manager or agency may link the property instead; new optional "Who helps you manage?" step (completed by `landlord_team_members`, never pulls a returning user back).
- Landlord team screen: role presets (Property manager, Family member, Caretaker, Accountant, Custom) and per-property access chosen at add time; maintenance switch added. Presets are starting points; every switch stays editable.
- Existing agency service models cover: full management + collection; management with landlord collecting; agency collects + enforces with owner operating. NOT covered: agency enforces payments only while the landlord collects and operates. Adding it needs a new `operating_model` value (CHECK constraint and payment-routing RPCs), so it is left for a product decision.
