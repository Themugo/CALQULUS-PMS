# Live P1 SQL (paste into SQL Editor)

The Supabase SQL Editor runs **SQL only**.

Do **not** paste:

- `supabase/migrations/....sql` (a path → `syntax error at or near "supabase"`)
- English instructions
- `npx supabase functions deploy ...` (that is a CLI command)

Do paste, in order:

1. `apply-live-p1-rls.sql` — stops `user_roles` / `platform_admins` RLS recursion (`42P17`)
2. `apply-live-p1-rpcs.sql` — landlord + manager dashboard RPCs, leftover hardening, invoice payment functions

`apply-live-p1-fixes.sql` is the same content concatenated. Prefer the two-step paste so a later error cannot undo the RLS fix.

Health-check: Dashboard → Edge Functions → deploy `health-check`, JWT verification **off**. Repo already has `[functions.health-check] verify_jwt = false` in `supabase/config.toml`.
