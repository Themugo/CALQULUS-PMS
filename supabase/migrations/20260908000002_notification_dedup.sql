-- Notification de-duplication (audit 2026-10-24, finding M11).
-- Scheduled senders (payment reminders, due-invoice and overdue notifications)
-- claim a key '<function>:<invoice_id>:<yyyy-mm-dd>' before sending so a
-- cron re-run or repeated manual trigger cannot message a tenant twice a day.
-- RLS is enabled with no policies: only the service role (edge functions) can
-- read or write it. Idempotent. Do NOT apply to any environment until the
-- Phase 2D migration reconciliation has been completed and approved.

CREATE TABLE IF NOT EXISTS public.notification_dedup (
  key     text PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_dedup ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notification_dedup FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.notification_dedup TO service_role;

CREATE INDEX IF NOT EXISTS notification_dedup_sent_at_idx
  ON public.notification_dedup (sent_at);
