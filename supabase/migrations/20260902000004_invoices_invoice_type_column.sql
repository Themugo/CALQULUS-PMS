-- invoices.invoice_type existed only in the original hand-built database. Later migrations
-- (invoice atomic v2, billing operations views) read and write it, so a fresh project needs it.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'rent';
