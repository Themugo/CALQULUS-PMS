-- Idempotent seed: ensure a published `landing_page_content` row exists so the
-- webhost/admin landing editor always has a row to merge edits into and the
-- public page always has a published source of truth.
--
-- The seed inserts an EMPTY config (once, if no `scope='landing'` row exists).
-- The public provider (`createSupabaseLandingContentProvider`) merges an empty
-- persisted config over the shipped TS `defaultLandingConfig`, so an empty row
-- means "serve the packaged defaults". Webhost/admin saves then merge into this
-- same row via `upsert_landing_section`.
--
-- Safe to run repeatedly. Run against the live DB SQL Editor (or `supabase db reset`).
INSERT INTO public.landing_page_content (scope, config, published, updated_by)
SELECT 'landing', '{}'::jsonb, true, auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.landing_page_content WHERE scope = 'landing'
);