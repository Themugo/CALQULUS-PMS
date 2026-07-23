# This round's changes

## Delete these 2 files (confirmed dead, superseded code — nothing to zip)

    src/features/webhost/components/ContractorMarketplace.tsx
    src/features/webhost/api/contractorMarketplace.ts

Why: these queried three tables (`contractors`, `contractor_bids`, `work_orders`)
that don't exist anywhere in your migrations. Confirmed this isn't a missing-schema
gap like the earlier finds — it's an earlier, abandoned attempt at the same feature
that was properly rebuilt later as your working `ServiceMarketplace.tsx` /
`ServiceProviderProfile.tsx`, backed by the real `service_providers` and
`provider_reviews` tables (which I built a review UI for two rounds ago). Both old
files were confirmed unreferenced anywhere else in the app before deleting.

Side effect: deleting these also removed 49 pre-existing TypeScript errors that
came from the dead file referencing those nonexistent tables — total project error
count dropped from 2067 to 2018.

## Included in this zip: `supabase/functions/self-register-tenant/index.ts`

Fixed to use the verified authenticated email (`user.email`) instead of trusting
a client-supplied email field when a tenant self-registers. Previously someone
could self-register under an email address that wasn't actually theirs — since
`claim-tenant` and other flows match tenants by email, this could let someone
intercept a claim or communication meant for a different person.
