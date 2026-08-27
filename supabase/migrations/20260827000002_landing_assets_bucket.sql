-- ============================================================
-- Landing asset store: public `landing-images` storage bucket
--
-- The webhost/admin landing editor uploads marketing images (hero, role,
-- property, capability) to this bucket via `uploadLandingAsset`. The public
-- homepage serves them by public URL, so the bucket is public (matching the
-- existing public image buckets: profile-photos, company-logos, property-images).
--
-- Writes are limited to webhost platform admins (same RLS helper the
-- landing_page_content table uses); reads are public.
-- ============================================================

-- ── 1. Bucket ────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('landing-images', 'landing-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 2. Policies ─────────────────────────────────────────────
-- Public read: the published landing page loads these images without auth.
DROP POLICY IF EXISTS "landing_images_public_read" ON storage.objects;
CREATE POLICY "landing_images_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'landing-images');

-- Webhost platform admins may upload/replace/delete landing assets.
DROP POLICY IF EXISTS "landing_images_webhost_insert" ON storage.objects;
CREATE POLICY "landing_images_webhost_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'landing-images' AND public.is_webhost_platform_admin());

DROP POLICY IF EXISTS "landing_images_webhost_update" ON storage.objects;
CREATE POLICY "landing_images_webhost_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'landing-images' AND public.is_webhost_platform_admin())
  WITH CHECK (bucket_id = 'landing-images' AND public.is_webhost_platform_admin());

DROP POLICY IF EXISTS "landing_images_webhost_delete" ON storage.objects;
CREATE POLICY "landing_images_webhost_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'landing-images' AND public.is_webhost_platform_admin());
