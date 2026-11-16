-- Webhost marketplace baseline tables (contractors, workflows, utilities).
-- Used by phase67/72/73 *_atomic RPCs but never created by any migration (they lived only in the
-- original hand-built database). IF NOT EXISTS makes this a no-op wherever they already exist.
-- Writes are RPC-only; reads are limited to platform webhost admins and, for property-scoped
-- tables, the managing user of the property.

CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  unit text, category text, description text, priority text DEFAULT 'medium',
  budget numeric, estimated_cost numeric, scheduled_date timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_orders_read ON public.work_orders;
CREATE POLICY work_orders_read ON public.work_orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = work_orders.property_id AND p.manager_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.work_orders FROM anon, authenticated;
REVOKE ALL ON public.work_orders FROM anon;

CREATE TABLE IF NOT EXISTS public.contractor_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  contractor_id uuid, proposed_amount numeric, estimated_duration text,
  status text NOT NULL DEFAULT 'pending', notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_bids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contractor_bids_read ON public.contractor_bids;
CREATE POLICY contractor_bids_read ON public.contractor_bids FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost') OR EXISTS (SELECT 1 FROM public.work_orders w JOIN public.properties p ON p.id = w.property_id WHERE w.id = contractor_bids.work_order_id AND p.manager_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.contractor_bids FROM anon, authenticated;
REVOKE ALL ON public.contractor_bids FROM anon;

CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, category text, description text, steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  average_duration text, usage_count integer NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'active',
  last_used timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workflow_templates_read ON public.workflow_templates;
CREATE POLICY workflow_templates_read ON public.workflow_templates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost'));
REVOKE INSERT, UPDATE, DELETE ON public.workflow_templates FROM anon, authenticated;
REVOKE ALL ON public.workflow_templates FROM anon;

CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.workflow_templates(id) ON DELETE SET NULL,
  entity_id text, entity_name text, entity_type text, status text NOT NULL DEFAULT 'active',
  current_step integer NOT NULL DEFAULT 0, total_steps integer NOT NULL DEFAULT 0, progress numeric NOT NULL DEFAULT 0,
  assignee text, started_date timestamptz NOT NULL DEFAULT now(), completed_date timestamptz, estimated_completion timestamptz
);
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workflow_instances_read ON public.workflow_instances;
CREATE POLICY workflow_instances_read ON public.workflow_instances FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost'));
REVOKE INSERT, UPDATE, DELETE ON public.workflow_instances FROM anon, authenticated;
REVOKE ALL ON public.workflow_instances FROM anon;

CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  step_number integer NOT NULL, name text NOT NULL, description text, type text,
  status text NOT NULL DEFAULT 'pending', assignee text, started_date timestamptz, completed_date timestamptz
);
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workflow_steps_read ON public.workflow_steps;
CREATE POLICY workflow_steps_read ON public.workflow_steps FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost'));
REVOKE INSERT, UPDATE, DELETE ON public.workflow_steps FROM anon, authenticated;
REVOKE ALL ON public.workflow_steps FROM anon;

CREATE TABLE IF NOT EXISTS public.workflow_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, "trigger" text, action text, target text, frequency text,
  status text NOT NULL DEFAULT 'active', last_run timestamptz, next_run timestamptz, success_rate numeric
);
ALTER TABLE public.workflow_automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workflow_automations_read ON public.workflow_automations;
CREATE POLICY workflow_automations_read ON public.workflow_automations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost'));
REVOKE INSERT, UPDATE, DELETE ON public.workflow_automations FROM anon, authenticated;
REVOKE ALL ON public.workflow_automations FROM anon;

CREATE TABLE IF NOT EXISTS public.utility_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid, property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  unit text, utility_type text, connection_type text, status text NOT NULL DEFAULT 'active',
  connection_date timestamptz, monthly_rate numeric, current_reading numeric, previous_reading numeric,
  last_billing_date timestamptz, next_billing_date timestamptz
);
ALTER TABLE public.utility_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS utility_connections_read ON public.utility_connections;
CREATE POLICY utility_connections_read ON public.utility_connections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = utility_connections.property_id AND p.manager_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.utility_connections FROM anon, authenticated;
REVOKE ALL ON public.utility_connections FROM anon;

CREATE TABLE IF NOT EXISTS public.utility_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.utility_connections(id) ON DELETE CASCADE,
  provider_id uuid, property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  unit text, utility_type text, billing_period text, consumption numeric, rate numeric, amount numeric,
  status text NOT NULL DEFAULT 'pending', due_date timestamptz, paid_date timestamptz
);
ALTER TABLE public.utility_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS utility_bills_read ON public.utility_bills;
CREATE POLICY utility_bills_read ON public.utility_bills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost') OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = utility_bills.property_id AND p.manager_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.utility_bills FROM anon, authenticated;
REVOKE ALL ON public.utility_bills FROM anon;
