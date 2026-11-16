# Super-admin (webhost) access and login troubleshooting

## Why login shows "network error"
The browser could not reach Supabase. On 2026-11-15 the **CALQULUS PMS** project
(`hmgpltrjlsescfquqxeg`) had status `INACTIVE` (paused). A paused project refuses every
request, so every login, signup and OAuth call fails with "Failed to fetch".

Fix: Supabase Dashboard -> project CALQULUS PMS -> **Restore project**, wait until it is
healthy, then confirm Vercel has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
for that project (redeploy after changing them). Free projects pause after inactivity.

The app now tells the person up front (banner on every sign-in/sign-up form) and the
toast reads "We could not reach the CALQULUS service...".

## Getting your own super-admin account
`bootstrap-webhost` is deliberately disabled outside local development, so use the dashboard:

1. Apply migrations (after Phase 2D reconciliation) so `platform_admins`, `admin_permissions`
   and `user_roles` exist.
2. Supabase -> Authentication -> Users -> **Add user**: your email + a strong password
   (>= 10 chars), tick *Auto Confirm User*.
3. SQL editor, replacing the email:

```sql
-- The role-protection trigger only lets the service role grant webhost; mark this SQL session as such.
select set_config('request.jwt.claim.role', 'service_role', false);

do $$
declare uid uuid; em text := 'you@yourdomain.com'; nm text := 'Your Name';
begin
  select id into uid from auth.users where lower(email) = lower(em);
  if uid is null then raise exception 'create the auth user first'; end if;
  insert into public.profiles (id, full_name, email) values (uid, nm, em)
    on conflict (id) do update set full_name = excluded.full_name;
  delete from public.user_roles where user_id = uid and role = 'manager' and approval_status = 'pending';
  insert into public.user_roles (user_id, role, approval_status) values (uid, 'webhost', 'approved')
    on conflict do nothing;
  delete from public.admin_permissions where user_id = uid;
  insert into public.admin_permissions (user_id, admin_level, can_create_webhosts, can_manage_billing,
    can_manage_managers, can_manage_properties, can_view_activity_logs, can_manage_system_landlords,
    can_manage_agencies, can_manage_organizations, can_read_unattached_tenants, can_resolve_unattached_tenants)
  values (uid, 'super_admin', true, true, true, true, true, true, true, true, true, true);
  insert into public.platform_admins (user_id, admin_type, display_name, email,
    can_create_admins, can_manage_managers, can_manage_billing, can_manage_properties,
    can_manage_landlords, can_view_activity_logs, can_manage_platform_settings, is_immutable)
  values (uid, 'owner', nm, em, true, true, true, true, true, true, true, true)
    on conflict (user_id) do nothing;
end $$;
```

4. Sign in at `https://admin.<your-domain>/webhost/login` (or `/webhost/login` on localhost).
   Non-admin accounts are refused and signed out. Further admins are invited from the
   webhost dashboard (Admin invitations).

This exact SQL was run against a full replay of the migration chain on a scratch database.
