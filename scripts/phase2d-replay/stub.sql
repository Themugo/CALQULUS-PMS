-- Local-replay stubs for hosted-Supabase infrastructure (TEST ONLY, never for a remote DB).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA cron; CREATE SCHEMA net;
CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, encrypted_password text,
  raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}', created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(), email_confirmed_at timestamptz, last_sign_in_at timestamptz, phone text, banned_until timestamptz);
CREATE TABLE auth.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, created_at timestamptz DEFAULT now());
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true),''),'anon') $$;
CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.email', true),'') $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true),'')::jsonb,'{}'::jsonb) $$;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, owner uuid, public boolean DEFAULT false, file_size_limit bigint, allowed_mime_types text[], avif_autodetection boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id), name text, owner uuid, metadata jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name,'/') $$;
CREATE TABLE cron.job (jobid bigserial PRIMARY KEY, jobname text, schedule text, command text);
CREATE FUNCTION cron.schedule(jobname text, schedule text, command text) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE FUNCTION cron.unschedule(jobname text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}', params jsonb DEFAULT '{}', headers jsonb DEFAULT '{}', timeout_milliseconds int DEFAULT 1000) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, anon;
