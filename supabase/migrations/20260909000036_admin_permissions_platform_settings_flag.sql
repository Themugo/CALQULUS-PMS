-- The app (AuthContext.fetchWebhostPermissions) and the webhost routes read
-- admin_permissions.can_manage_platform_settings, but the column only existed on
-- platform_admins. The select therefore failed, permissions loaded as null and
-- even the super admin lost Applications, Operations, Deployments, Public Site,
-- Brand Studio and Settings. Add the column and keep it in step.
ALTER TABLE public.admin_permissions
  ADD COLUMN IF NOT EXISTS can_manage_platform_settings boolean NOT NULL DEFAULT false;

UPDATE public.admin_permissions ap
   SET can_manage_platform_settings = true
 WHERE ap.admin_level = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = ap.user_id AND pa.can_manage_platform_settings);

CREATE OR REPLACE FUNCTION public.sync_admin_permissions_platform_settings() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'admin_permissions' THEN
    IF NEW.admin_level = 'super_admin'
       OR EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = NEW.user_id AND pa.can_manage_platform_settings AND NOT pa.suspended) THEN
      NEW.can_manage_platform_settings := true;
    END IF;
    RETURN NEW;
  END IF;
  -- platform_admins changed: mirror onto admin_permissions
  UPDATE public.admin_permissions
     SET can_manage_platform_settings = (NEW.can_manage_platform_settings AND NOT NEW.suspended) OR admin_level = 'super_admin'
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_admin_permissions_platform_settings() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_admin_permissions_platform_settings ON public.admin_permissions;
CREATE TRIGGER trg_admin_permissions_platform_settings BEFORE INSERT OR UPDATE ON public.admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_permissions_platform_settings();
DROP TRIGGER IF EXISTS trg_platform_admins_platform_settings ON public.platform_admins;
CREATE TRIGGER trg_platform_admins_platform_settings AFTER INSERT OR UPDATE OF can_manage_platform_settings, suspended ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_permissions_platform_settings();
