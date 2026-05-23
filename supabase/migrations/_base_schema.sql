-- Base Schema: ONLY tables NOT created by any migration

CREATE TABLE IF NOT EXISTS public.account_activations (
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  token text NOT NULL,
  used_at timestamptz,
  user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  admin_level text NOT NULL,
  can_create_webhosts boolean NOT NULL,
  can_manage_billing boolean NOT NULL,
  can_manage_managers boolean NOT NULL,
  can_manage_properties boolean NOT NULL,
  can_manage_tenants boolean NOT NULL,
  can_view_activity_logs boolean NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  id uuid DEFAULT gen_random_uuid(),
  updated_at timestamptz NOT NULL,
  user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.agencies (
  address text,
  created_at timestamptz NOT NULL,
  email text,
  id uuid DEFAULT gen_random_uuid(),
  logo_url text,
  manager_id uuid,
  name text NOT NULL,
  phone text,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  action text NOT NULL,
  created_at timestamptz NOT NULL,
  details jsonb,
  id uuid DEFAULT gen_random_uuid(),
  ip_address text,
  resource_id uuid,
  resource_type text NOT NULL,
  user_agent text,
  user_email text,
  user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.bank_details (
  account_label text,
  account_name text NOT NULL,
  account_number text NOT NULL,
  bank_name text NOT NULL,
  branch_name text,
  created_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  is_default boolean,
  manager_id uuid NOT NULL,
  paybill_number text,
  property_id uuid,
  swift_code text,
  till_number text,
  unit_id uuid,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.company_settings (
  address text,
  city text,
  company_name text NOT NULL,
  created_at timestamptz NOT NULL,
  email text,
  id uuid DEFAULT gen_random_uuid(),
  logo_url text,
  manager_user_id uuid,
  phone text,
  state text,
  updated_at timestamptz NOT NULL,
  website text,
  zip_code text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.contract_templates (
  content text NOT NULL,
  created_at timestamptz NOT NULL,
  description text,
  id uuid DEFAULT gen_random_uuid(),
  is_default boolean,
  manager_user_id uuid,
  name text NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.contracts (
  approved_at timestamptz,
  approved_by text,
  content text NOT NULL,
  created_at timestamptz NOT NULL,
  deleted_at timestamptz,
  deleted_by text,
  deletion_confirmed_at timestamptz,
  deletion_confirmed_by text,
  deletion_reason text,
  id uuid DEFAULT gen_random_uuid(),
  lease_id uuid,
  manager_signature text,
  manager_signed_at timestamptz,
  pending_approval boolean NOT NULL,
  property_id uuid,
  rejection_reason text,
  status text NOT NULL,
  template_id uuid,
  tenant_id uuid,
  tenant_ip_address text,
  tenant_signature text,
  tenant_signed_at timestamptz,
  title text NOT NULL,
  unit_id uuid,
  updated_at timestamptz NOT NULL,
  uploaded_contract_url text,
  valid_from text,
  valid_until text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.deposit_deductions (
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL,
  created_by text,
  deduction_type text NOT NULL,
  description text NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  maintenance_request_id uuid,
  tenant_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.deposit_refunds (
  bank_account_name text,
  bank_account_number text,
  bank_name text,
  created_at timestamptz NOT NULL,
  final_balance numeric NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  move_out_date date NOT NULL,
  mpesa_number text,
  notes text,
  original_deposit numeric NOT NULL,
  processed_at timestamptz,
  processed_by text,
  refund_amount numeric NOT NULL,
  refund_method text NOT NULL,
  refund_reference text,
  status text NOT NULL,
  tenant_id uuid NOT NULL,
  total_deductions numeric NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.expenditures (
  amount numeric NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL,
  description text,
  id uuid DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  month text NOT NULL,
  property_id uuid,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.invoices (
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL,
  description text,
  due_date date NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  lease_id uuid,
  manager_id uuid,
  paid_date date,
  status text NOT NULL,
  tenant_id uuid,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.leases (
  created_at timestamptz NOT NULL,
  deposit numeric,
  document_url text,
  end_date date NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  manager_id uuid,
  monthly_rent numeric NOT NULL,
  property text NOT NULL,
  property_id uuid,
  start_date date NOT NULL,
  status text NOT NULL,
  tenant_id uuid,
  terms text,
  unit text NOT NULL,
  unit_id uuid,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  assigned_to text,
  budget numeric,
  category text,
  completion_date date,
  created_at timestamptz NOT NULL,
  created_by_role text,
  deduct_from_deposit boolean,
  deposit_deducted_at timestamptz,
  deposit_deduction_amount numeric,
  description text NOT NULL,
  expected_completion_date date,
  id uuid DEFAULT gen_random_uuid(),
  manager_id uuid,
  priority text NOT NULL,
  property_name text NOT NULL,
  requested_date date NOT NULL,
  status text NOT NULL,
  tenant_email text NOT NULL,
  tenant_name text NOT NULL,
  title text NOT NULL,
  unit_id uuid,
  unit_number text,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.manager_ewallet_settings (
  created_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  instructions text,
  is_enabled boolean NOT NULL,
  manager_user_id uuid NOT NULL,
  property_id uuid,
  provider text NOT NULL,
  unit_id uuid,
  updated_at timestamptz NOT NULL,
  wallet_id uuid,
  wallet_name text,
  wallet_phone text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.manager_mpesa_settings (
  consumer_key text,
  consumer_secret text,
  created_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  is_live boolean NOT NULL,
  manager_user_id uuid NOT NULL,
  paybill_account_reference text,
  paybill_enabled boolean NOT NULL,
  paybill_passkey text,
  paybill_shortcode text,
  property_id uuid,
  till_enabled boolean NOT NULL,
  till_passkey text,
  till_shortcode text,
  unit_id uuid,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.manager_submanagers (
  created_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  submanager_user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.manager_subscriptions (
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  manager_user_id uuid NOT NULL,
  payment_method text,
  payment_reference text,
  phone_number text,
  property_count numeric NOT NULL,
  status text NOT NULL,
  stripe_subscription_id uuid,
  subscription_end text,
  subscription_start text,
  tier text NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  invoice_id uuid,
  notes text,
  payment_date date NOT NULL,
  payment_method text NOT NULL,
  receipt_url text NOT NULL,
  reference_number text,
  rejection_reason text,
  status text NOT NULL,
  tenant_id uuid NOT NULL,
  updated_at timestamptz NOT NULL,
  verified_at timestamptz,
  verified_by text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  amount numeric NOT NULL,
  callback_secret text,
  checkout_request_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL,
  failure_reason text,
  id uuid DEFAULT gen_random_uuid(),
  initiated_at timestamptz NOT NULL,
  invoice_id uuid,
  manager_id uuid,
  merchant_request_id uuid,
  mpesa_receipt_number text,
  payment_type text NOT NULL,
  phone_number text NOT NULL,
  status text NOT NULL,
  tenant_id uuid,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  created_at timestamptz NOT NULL,
  currency text,
  email text NOT NULL,
  full_name text,
  id uuid DEFAULT gen_random_uuid(),
  phone text,
  photo_url text,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.properties (
  address text NOT NULL,
  agency_id uuid,
  created_at timestamptz NOT NULL,
  house_label_prefix text,
  house_number text,
  id uuid DEFAULT gen_random_uuid(),
  image_url text,
  manager_id uuid,
  name text NOT NULL,
  number_of_floors numeric,
  occupied numeric NOT NULL,
  payment_details text,
  property_type text,
  rent_per_house numeric,
  revenue numeric NOT NULL,
  status text NOT NULL,
  units numeric NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.property_amenity_charges (
  amount numeric NOT NULL,
  charge_label text NOT NULL,
  charge_type text NOT NULL,
  created_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL,
  manager_id uuid NOT NULL,
  property_id uuid NOT NULL,
  unit_id uuid,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.property_deductions (
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL,
  deduction_name text NOT NULL,
  deduction_type text NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL,
  is_recurring boolean NOT NULL,
  manager_id uuid NOT NULL,
  property_id uuid NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.property_history (
  action text NOT NULL,
  changed_by text,
  created_at timestamptz NOT NULL,
  description text NOT NULL,
  details jsonb,
  id uuid DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  auth_key text NOT NULL,
  created_at timestamptz NOT NULL,
  endpoint text NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  p256dh_key text NOT NULL,
  updated_at timestamptz NOT NULL,
  user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.receipt_settings (
  auto_send_receipts boolean NOT NULL,
  created_at timestamptz NOT NULL,
  footer_message text,
  id uuid DEFAULT gen_random_uuid(),
  include_logo boolean,
  manager_user_id uuid NOT NULL,
  primary_color text,
  secondary_color text,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.submanager_permissions (
  assigned_property_ids uuid[],
  can_view_activity_logs boolean NOT NULL,
  can_view_contracts boolean NOT NULL,
  can_view_invoices boolean NOT NULL,
  can_view_leases boolean NOT NULL,
  can_view_maintenance boolean NOT NULL,
  can_view_properties boolean NOT NULL,
  can_view_tenants boolean NOT NULL,
  created_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  restrict_to_assigned_properties boolean,
  submanager_user_id uuid NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.submanager_property_assignments (
  created_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  property_id uuid NOT NULL,
  submanager_user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tenant_history (
  action text NOT NULL,
  created_at timestamptz NOT NULL,
  description text NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  created_at timestamptz NOT NULL,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  invited_by text NOT NULL,
  property_id uuid,
  property_name text NOT NULL,
  status text NOT NULL,
  tenant_name text NOT NULL,
  token text NOT NULL,
  unit text,
  used_at timestamptz,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tenants (
  account_number text,
  created_at timestamptz NOT NULL,
  deposit_amount numeric,
  deposit_balance numeric,
  deposit_months numeric,
  email text NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  manager_id uuid,
  monthly_rent numeric,
  move_in_date date,
  name text NOT NULL,
  other_charges numeric,
  other_charges_description text,
  phone text,
  photo_url text,
  property text,
  property_id uuid,
  statement_history_months numeric,
  status text NOT NULL,
  unit text,
  unit_id uuid,
  updated_at timestamptz NOT NULL,
  whatsapp text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.unit_water_config (
  created_at timestamptz NOT NULL,
  flat_rate_override numeric,
  has_meter boolean NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  meter_number text,
  property_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.units (
  bathrooms numeric,
  bedrooms numeric,
  created_at timestamptz NOT NULL,
  description text,
  id uuid DEFAULT gen_random_uuid(),
  monthly_rent numeric,
  property_id uuid NOT NULL,
  square_feet numeric,
  status text NOT NULL,
  unit_number text NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.uploaded_documents (
  contract_id uuid,
  created_at timestamptz NOT NULL,
  file_name text NOT NULL,
  file_size numeric,
  file_type text,
  file_url text NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  uploaded_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  approval_status text NOT NULL,
  created_at timestamptz NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  role text NOT NULL,
  tenant_id uuid,
  user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.vacation_notices (
  acknowledged_at timestamptz,
  acknowledged_by text,
  created_at timestamptz NOT NULL,
  forwarding_address text,
  id uuid DEFAULT gen_random_uuid(),
  intended_move_out_date date NOT NULL,
  manager_id uuid,
  manager_notes text,
  notice_date date NOT NULL,
  phone_number text,
  property_id uuid,
  property_name text NOT NULL,
  reason text,
  status text NOT NULL,
  tenant_email text NOT NULL,
  tenant_id uuid NOT NULL,
  tenant_name text NOT NULL,
  tenant_signature text,
  tenant_signed_at timestamptz,
  unit_number text,
  updated_at timestamptz NOT NULL,
  uploaded_document_url text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.water_billing_config (
  billing_cycle_day numeric,
  billing_method text NOT NULL,
  created_at timestamptz NOT NULL,
  flat_rate_amount numeric,
  id uuid DEFAULT gen_random_uuid(),
  invoice_mode text NOT NULL,
  is_active boolean NOT NULL,
  manager_id uuid NOT NULL,
  meter_number text,
  property_id uuid NOT NULL,
  rate_per_unit numeric,
  updated_at timestamptz NOT NULL,
  water_provider text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.water_meter_readings (
  billing_period_end text,
  billing_period_start text,
  consumption numeric,
  created_at timestamptz NOT NULL,
  current_reading numeric NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  invoice_id uuid,
  manager_id uuid NOT NULL,
  notes text,
  previous_reading numeric NOT NULL,
  property_id uuid NOT NULL,
  rate_per_unit numeric NOT NULL,
  reading_date date NOT NULL,
  status text NOT NULL,
  total_amount numeric,
  unit_id uuid NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.webhost_payment_settings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_fee     numeric(10,2) NOT NULL DEFAULT 3000.00,
  subscription_rate    numeric(5,4)  NOT NULL DEFAULT 0.0100,
  mpesa_paybill_number text,
  mpesa_paybill_account text,
  mpesa_till_number    text,
  mpesa_phone_number   text,
  bank_name            text,
  bank_account_name    text,
  bank_account_number  text,
  bank_branch          text,
  bank_swift_code      text,
  payment_instructions text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhost_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.manager_invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number        text NOT NULL UNIQUE,
  amount                numeric(12,2) NOT NULL,
  description           text,
  due_date              date NOT NULL,
  paid_date             date,
  status                text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','overdue','cancelled')),
  invoice_type          text DEFAULT 'subscription'
    CHECK (invoice_type IN ('registration','subscription','penalty','other')),
  property_count        integer,
  rate_per_property     numeric(10,2),
  net_collection        numeric(12,2),
  commission_rate       numeric(5,4),
  subscription_tier     text,
  billing_period_start  date,
  billing_period_end    date,
  overdue_reminder_sent boolean DEFAULT false,
  suspension_notice_sent boolean DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_invoices_manager ON public.manager_invoices(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_invoices_status  ON public.manager_invoices(status);

ALTER TABLE public.manager_invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.manager_contracts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_email    text,
  manager_name     text,
  title            text NOT NULL DEFAULT 'RentFlow Platform Service Agreement',
  contract_type    text NOT NULL DEFAULT 'service_agreement',
  description      text,
  status           text NOT NULL DEFAULT 'pending_signature'
    CHECK (status IN ('pending_signature','signed','expired','terminated')),
  valid_from       date,
  valid_until      date,
  signed_at        timestamptz,
  signed_by        uuid REFERENCES auth.users(id),
  signature_url    text,
  contract_url     text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_contracts_manager ON public.manager_contracts(manager_user_id);

ALTER TABLE public.manager_contracts ENABLE ROW LEVEL SECURITY;

-- Helper function used by multiple migrations
CREATE OR REPLACE FUNCTION public.role_in(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = required_role) $$;

-- Ensure landlord_invitations has invited_by_webhost (migration 02 expects it)
ALTER TABLE IF EXISTS public.landlord_invitations ADD COLUMN IF NOT EXISTS invited_by_webhost boolean DEFAULT false;

-- Add property_id to invoices (migration 12 expects it, only added by patched migration)
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS property_id uuid;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS unit_id uuid;

-- ── Foreign Key Constraints ─────────────────────────────────────────
-- These ensure referential integrity across all core tables.
-- Using IF NOT EXISTS so they are idempotent on re-run.

-- admin_permissions → profiles
ALTER TABLE public.admin_permissions
  ADD CONSTRAINT IF NOT EXISTS admin_permissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- agencies → profiles (manager)
ALTER TABLE public.agencies
  ADD CONSTRAINT IF NOT EXISTS agencies_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- bank_details → profiles (manager)
ALTER TABLE public.bank_details
  ADD CONSTRAINT IF NOT EXISTS bank_details_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- bank_details → properties
ALTER TABLE public.bank_details
  ADD CONSTRAINT IF NOT EXISTS bank_details_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- company_settings → profiles (manager)
ALTER TABLE public.company_settings
  ADD CONSTRAINT IF NOT EXISTS company_settings_manager_user_id_fkey
  FOREIGN KEY (manager_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- contracts → leases
ALTER TABLE public.contracts
  ADD CONSTRAINT IF NOT EXISTS contracts_lease_id_fkey
  FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL;

-- contracts → properties
ALTER TABLE public.contracts
  ADD CONSTRAINT IF NOT EXISTS contracts_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- contracts → tenants
ALTER TABLE public.contracts
  ADD CONSTRAINT IF NOT EXISTS contracts_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- contracts → units
ALTER TABLE public.contracts
  ADD CONSTRAINT IF NOT EXISTS contracts_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

-- deposit_deductions → tenants
ALTER TABLE public.deposit_deductions
  ADD CONSTRAINT IF NOT EXISTS deposit_deductions_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- deposit_refunds → tenants
ALTER TABLE public.deposit_refunds
  ADD CONSTRAINT IF NOT EXISTS deposit_refunds_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- expenditures → profiles (manager)
ALTER TABLE public.expenditures
  ADD CONSTRAINT IF NOT EXISTS expenditures_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- expenditures → properties
ALTER TABLE public.expenditures
  ADD CONSTRAINT IF NOT EXISTS expenditures_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- invoices → leases
ALTER TABLE public.invoices
  ADD CONSTRAINT IF NOT EXISTS invoices_lease_id_fkey
  FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL;

-- invoices → profiles (manager)
ALTER TABLE public.invoices
  ADD CONSTRAINT IF NOT EXISTS invoices_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- invoices → tenants
ALTER TABLE public.invoices
  ADD CONSTRAINT IF NOT EXISTS invoices_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- invoices → properties
ALTER TABLE public.invoices
  ADD CONSTRAINT IF NOT EXISTS invoices_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- invoices → units
ALTER TABLE public.invoices
  ADD CONSTRAINT IF NOT EXISTS invoices_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

-- leases → tenants
ALTER TABLE public.leases
  ADD CONSTRAINT IF NOT EXISTS leases_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- leases → profiles (manager)
ALTER TABLE public.leases
  ADD CONSTRAINT IF NOT EXISTS leases_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- leases → properties
ALTER TABLE public.leases
  ADD CONSTRAINT IF NOT EXISTS leases_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- leases → units
ALTER TABLE public.leases
  ADD CONSTRAINT IF NOT EXISTS leases_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

-- maintenance_requests → profiles (manager)
ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT IF NOT EXISTS maintenance_requests_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- maintenance_requests → units
ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT IF NOT EXISTS maintenance_requests_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

-- manager_ewallet_settings → profiles (manager)
ALTER TABLE public.manager_ewallet_settings
  ADD CONSTRAINT IF NOT EXISTS manager_ewallet_settings_manager_user_id_fkey
  FOREIGN KEY (manager_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- manager_mpesa_settings → profiles (manager)
ALTER TABLE public.manager_mpesa_settings
  ADD CONSTRAINT IF NOT EXISTS manager_mpesa_settings_manager_user_id_fkey
  FOREIGN KEY (manager_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- manager_submanagers → profiles (manager)
ALTER TABLE public.manager_submanagers
  ADD CONSTRAINT IF NOT EXISTS manager_submanagers_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- manager_submanagers → profiles (submanager)
ALTER TABLE public.manager_submanagers
  ADD CONSTRAINT IF NOT EXISTS manager_submanagers_submanager_user_id_fkey
  FOREIGN KEY (submanager_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- manager_subscriptions → profiles (manager)
ALTER TABLE public.manager_subscriptions
  ADD CONSTRAINT IF NOT EXISTS manager_subscriptions_manager_user_id_fkey
  FOREIGN KEY (manager_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- payment_receipts → invoices
ALTER TABLE public.payment_receipts
  ADD CONSTRAINT IF NOT EXISTS payment_receipts_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- payment_receipts → tenants
ALTER TABLE public.payment_receipts
  ADD CONSTRAINT IF NOT EXISTS payment_receipts_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- payment_transactions → invoices
ALTER TABLE public.payment_transactions
  ADD CONSTRAINT IF NOT EXISTS payment_transactions_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- payment_transactions → profiles (manager)
ALTER TABLE public.payment_transactions
  ADD CONSTRAINT IF NOT EXISTS payment_transactions_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- payment_transactions → tenants
ALTER TABLE public.payment_transactions
  ADD CONSTRAINT IF NOT EXISTS payment_transactions_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- properties → agencies
ALTER TABLE public.properties
  ADD CONSTRAINT IF NOT EXISTS properties_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;

-- properties → profiles (manager)
ALTER TABLE public.properties
  ADD CONSTRAINT IF NOT EXISTS properties_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- property_amenity_charges → profiles (manager)
ALTER TABLE public.property_amenity_charges
  ADD CONSTRAINT IF NOT EXISTS property_amenity_charges_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- property_amenity_charges → properties
ALTER TABLE public.property_amenity_charges
  ADD CONSTRAINT IF NOT EXISTS property_amenity_charges_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- property_amenity_charges → units
ALTER TABLE public.property_amenity_charges
  ADD CONSTRAINT IF NOT EXISTS property_amenity_charges_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

-- property_deductions → profiles (manager)
ALTER TABLE public.property_deductions
  ADD CONSTRAINT IF NOT EXISTS property_deductions_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- property_deductions → properties
ALTER TABLE public.property_deductions
  ADD CONSTRAINT IF NOT EXISTS property_deductions_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- property_history → properties
ALTER TABLE public.property_history
  ADD CONSTRAINT IF NOT EXISTS property_history_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- push_subscriptions → profiles
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT IF NOT EXISTS push_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- receipt_settings → profiles (manager)
ALTER TABLE public.receipt_settings
  ADD CONSTRAINT IF NOT EXISTS receipt_settings_manager_user_id_fkey
  FOREIGN KEY (manager_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- submanager_permissions → profiles (manager)
ALTER TABLE public.submanager_permissions
  ADD CONSTRAINT IF NOT EXISTS submanager_permissions_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- submanager_permissions → profiles (submanager)
ALTER TABLE public.submanager_permissions
  ADD CONSTRAINT IF NOT EXISTS submanager_permissions_submanager_user_id_fkey
  FOREIGN KEY (submanager_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- submanager_property_assignments → profiles (manager)
ALTER TABLE public.submanager_property_assignments
  ADD CONSTRAINT IF NOT EXISTS submanager_property_assignments_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- submanager_property_assignments → properties
ALTER TABLE public.submanager_property_assignments
  ADD CONSTRAINT IF NOT EXISTS submanager_property_assignments_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- submanager_property_assignments → profiles (submanager)
ALTER TABLE public.submanager_property_assignments
  ADD CONSTRAINT IF NOT EXISTS submanager_property_assignments_submanager_user_id_fkey
  FOREIGN KEY (submanager_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- tenant_history → tenants
ALTER TABLE public.tenant_history
  ADD CONSTRAINT IF NOT EXISTS tenant_history_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- tenants → profiles (manager)
ALTER TABLE public.tenants
  ADD CONSTRAINT IF NOT EXISTS tenants_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- tenants → properties
ALTER TABLE public.tenants
  ADD CONSTRAINT IF NOT EXISTS tenants_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- tenants → units
ALTER TABLE public.tenants
  ADD CONSTRAINT IF NOT EXISTS tenants_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

-- unit_water_config → properties
ALTER TABLE public.unit_water_config
  ADD CONSTRAINT IF NOT EXISTS unit_water_config_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- unit_water_config → units
ALTER TABLE public.unit_water_config
  ADD CONSTRAINT IF NOT EXISTS unit_water_config_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

-- units → properties
ALTER TABLE public.units
  ADD CONSTRAINT IF NOT EXISTS units_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- uploaded_documents → profiles (manager)
ALTER TABLE public.uploaded_documents
  ADD CONSTRAINT IF NOT EXISTS uploaded_documents_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- user_roles → profiles
ALTER TABLE public.user_roles
  ADD CONSTRAINT IF NOT EXISTS user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- user_roles → tenants
ALTER TABLE public.user_roles
  ADD CONSTRAINT IF NOT EXISTS user_roles_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- vacation_notices → profiles (manager)
ALTER TABLE public.vacation_notices
  ADD CONSTRAINT IF NOT EXISTS vacation_notices_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- vacation_notices → tenants
ALTER TABLE public.vacation_notices
  ADD CONSTRAINT IF NOT EXISTS vacation_notices_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- vacation_notices → properties
ALTER TABLE public.vacation_notices
  ADD CONSTRAINT IF NOT EXISTS vacation_notices_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- water_billing_config → profiles (manager)
ALTER TABLE public.water_billing_config
  ADD CONSTRAINT IF NOT EXISTS water_billing_config_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- water_billing_config → properties
ALTER TABLE public.water_billing_config
  ADD CONSTRAINT IF NOT EXISTS water_billing_config_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- water_meter_readings → profiles (manager)
ALTER TABLE public.water_meter_readings
  ADD CONSTRAINT IF NOT EXISTS water_meter_readings_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- water_meter_readings → properties
ALTER TABLE public.water_meter_readings
  ADD CONSTRAINT IF NOT EXISTS water_meter_readings_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- water_meter_readings → units
ALTER TABLE public.water_meter_readings
  ADD CONSTRAINT IF NOT EXISTS water_meter_readings_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

-- water_meter_readings → invoices
ALTER TABLE public.water_meter_readings
  ADD CONSTRAINT IF NOT EXISTS water_meter_readings_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- bank_transactions → profiles (manager)
ALTER TABLE public.bank_transactions
  ADD CONSTRAINT IF NOT EXISTS bank_transactions_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- bank_transactions → bank_integration_settings
ALTER TABLE public.bank_transactions
  ADD CONSTRAINT IF NOT EXISTS bank_transactions_bank_integration_id_fkey
  FOREIGN KEY (bank_integration_id) REFERENCES public.bank_integration_settings(id) ON DELETE SET NULL;

-- bank_transactions → invoices
ALTER TABLE public.bank_transactions
  ADD CONSTRAINT IF NOT EXISTS bank_transactions_matched_invoice_id_fkey
  FOREIGN KEY (matched_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- bank_transactions → tenants
ALTER TABLE public.bank_transactions
  ADD CONSTRAINT IF NOT EXISTS bank_transactions_matched_tenant_id_fkey
  FOREIGN KEY (matched_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- notification_failures → payment_transactions
ALTER TABLE public.notification_failures
  ADD CONSTRAINT IF NOT EXISTS notification_failures_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES public.payment_transactions(id) ON DELETE SET NULL;

-- notification_failures → profiles (tenant)
ALTER TABLE public.notification_failures
  ADD CONSTRAINT IF NOT EXISTS notification_failures_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- notification_failures → profiles (manager)
ALTER TABLE public.notification_failures
  ADD CONSTRAINT IF NOT EXISTS notification_failures_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- payment_allocations → payment_transactions
ALTER TABLE public.payment_allocations
  ADD CONSTRAINT IF NOT EXISTS payment_allocations_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES public.payment_transactions(id) ON DELETE CASCADE;

-- payment_allocations → invoices
ALTER TABLE public.payment_allocations
  ADD CONSTRAINT IF NOT EXISTS payment_allocations_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

-- payment_allocations → tenants
ALTER TABLE public.payment_allocations
  ADD CONSTRAINT IF NOT EXISTS payment_allocations_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- payment_allocations → profiles (manager)
ALTER TABLE public.payment_allocations
  ADD CONSTRAINT IF NOT EXISTS payment_allocations_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- tenant_credit_ledger → tenants
ALTER TABLE public.tenant_credit_ledger
  ADD CONSTRAINT IF NOT EXISTS tenant_credit_ledger_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- tenant_credit_ledger → profiles (manager)
ALTER TABLE public.tenant_credit_ledger
  ADD CONSTRAINT IF NOT EXISTS tenant_credit_ledger_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- tenant_credit_ledger → properties
ALTER TABLE public.tenant_credit_ledger
  ADD CONSTRAINT IF NOT EXISTS tenant_credit_ledger_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- tenant_credit_ledger → payment_transactions
ALTER TABLE public.tenant_credit_ledger
  ADD CONSTRAINT IF NOT EXISTS tenant_credit_ledger_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES public.payment_transactions(id) ON DELETE SET NULL;

-- fraud_flags → tenants
ALTER TABLE public.fraud_flags
  ADD CONSTRAINT IF NOT EXISTS fraud_flags_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- fraud_flags → payment_transactions
ALTER TABLE public.fraud_flags
  ADD CONSTRAINT IF NOT EXISTS fraud_flags_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES public.payment_transactions(id) ON DELETE CASCADE;

-- security_audit_log → profiles
ALTER TABLE public.security_audit_log
  ADD CONSTRAINT IF NOT EXISTS security_audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- bank_integration_settings → profiles (manager)
ALTER TABLE public.bank_integration_settings
  ADD CONSTRAINT IF NOT EXISTS bank_integration_settings_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- property_billing_config → properties
ALTER TABLE public.property_billing_config
  ADD CONSTRAINT IF NOT EXISTS property_billing_config_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- property_billing_config → profiles (manager)
ALTER TABLE public.property_billing_config
  ADD CONSTRAINT IF NOT EXISTS property_billing_config_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- manager_notification_settings → profiles (manager)
ALTER TABLE public.manager_notification_settings
  ADD CONSTRAINT IF NOT EXISTS manager_notification_settings_manager_user_id_fkey
  FOREIGN KEY (manager_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- property_landlords → properties
ALTER TABLE public.property_landlords
  ADD CONSTRAINT IF NOT EXISTS property_landlords_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- property_landlords → profiles (landlord)
ALTER TABLE public.property_landlords
  ADD CONSTRAINT IF NOT EXISTS property_landlords_landlord_user_id_fkey
  FOREIGN KEY (landlord_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- api_rate_limits → profiles
ALTER TABLE public.api_rate_limits
  ADD CONSTRAINT IF NOT EXISTS api_rate_limits_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- dead_letter_queue → profiles (manager)
ALTER TABLE public.dead_letter_queue
  ADD CONSTRAINT IF NOT EXISTS dead_letter_queue_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── Unique Constraints ──────────────────────────────────────────────
-- Prevent duplicate role assignments per user
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_key
  ON public.user_roles(user_id, role);

-- Ensure invoice_number is unique per manager
CREATE UNIQUE INDEX IF NOT EXISTS invoices_manager_invoice_number_key
  ON public.invoices(manager_id, invoice_number) WHERE invoice_number IS NOT NULL AND invoice_number != '';

-- Prevent duplicate bank transactions from concurrent webhook deliveries
CREATE UNIQUE INDEX IF NOT EXISTS bank_transactions_manager_external_id_key
  ON public.bank_transactions(manager_id, external_id) WHERE external_id IS NOT NULL AND external_id != '';

-- ── Performance Indexes ─────────────────────────────────────────────
-- These indexes cover the most frequently queried columns across the
-- application. Without them, full table scans occur on every filter/sort.

-- invoices: filtered by status, tenant, due_date; sorted by due_date
CREATE INDEX IF NOT EXISTS idx_invoices_status         ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id      ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date       ON public.invoices(due_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_manager_status ON public.invoices(manager_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_lease_id       ON public.invoices(lease_id);

-- tenants: filtered by manager, status, property
CREATE INDEX IF NOT EXISTS idx_tenants_manager_id   ON public.tenants(manager_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status       ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id  ON public.tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email        ON public.tenants(email);

-- leases: filtered by status, manager, tenant
CREATE INDEX IF NOT EXISTS idx_leases_status       ON public.leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_manager_id   ON public.leases(manager_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id    ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id  ON public.leases(property_id);

-- properties: filtered by manager, status
CREATE INDEX IF NOT EXISTS idx_properties_manager_id ON public.properties(manager_id);
CREATE INDEX IF NOT EXISTS idx_properties_status     ON public.properties(status);

-- user_roles: looked up on every auth check
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role    ON public.user_roles(role);

-- maintenance_requests: filtered by manager, status
CREATE INDEX IF NOT EXISTS idx_maintenance_manager_id ON public.maintenance_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status     ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_unit_id    ON public.maintenance_requests(unit_id);

-- contracts: filtered by tenant, lease, status
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_lease_id  ON public.contracts(lease_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status    ON public.contracts(status);

-- payment_transactions: filtered by tenant, manager, status
CREATE INDEX IF NOT EXISTS idx_payment_tx_tenant_id    ON public.payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_manager_id   ON public.payment_transactions(manager_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status       ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_checkout_req ON public.payment_transactions(checkout_request_id);

-- payment_receipts: filtered by tenant, status
CREATE INDEX IF NOT EXISTS idx_payment_receipts_tenant_id ON public.payment_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_status    ON public.payment_receipts(status);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_invoice   ON public.payment_receipts(invoice_id);

-- profiles: email lookup during auth
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- admin_permissions: user_id lookup on every webhost login
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON public.admin_permissions(user_id);

-- submanager_permissions: submanager_user_id lookup
CREATE INDEX IF NOT EXISTS idx_submanager_perms_user_id ON public.submanager_permissions(submanager_user_id);

-- submanager_property_assignments: submanager_user_id lookup
CREATE INDEX IF NOT EXISTS idx_submanager_assignments_user_id ON public.submanager_property_assignments(submanager_user_id);
CREATE INDEX IF NOT EXISTS idx_submanager_assignments_property ON public.submanager_property_assignments(property_id);

-- company_settings: manager_user_id lookup
CREATE INDEX IF NOT EXISTS idx_company_settings_manager ON public.company_settings(manager_user_id);

-- manager_mpesa_settings: manager_user_id lookup
CREATE INDEX IF NOT EXISTS idx_mpesa_settings_manager ON public.manager_mpesa_settings(manager_user_id);

-- manager_notification_settings: manager_user_id lookup
CREATE INDEX IF NOT EXISTS idx_notification_settings_manager ON public.manager_notification_settings(manager_user_id);

-- receipt_settings: manager_user_id lookup
CREATE INDEX IF NOT EXISTS idx_receipt_settings_manager ON public.receipt_settings(manager_user_id);

-- units: property_id lookup (very frequent)
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status      ON public.units(status);

-- property_history: property_id lookup
CREATE INDEX IF NOT EXISTS idx_property_history_property ON public.property_history(property_id);

-- tenant_history: tenant_id lookup
CREATE INDEX IF NOT EXISTS idx_tenant_history_tenant ON public.tenant_history(tenant_id);

-- uploaded_documents: manager_id lookup
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_manager ON public.uploaded_documents(manager_id);

-- expenditures: manager_id, month lookup
CREATE INDEX IF NOT EXISTS idx_expenditures_manager_month ON public.expenditures(manager_id, month);

-- water_billing_config: property_id, manager_id lookup
CREATE INDEX IF NOT EXISTS idx_water_billing_property ON public.water_billing_config(property_id);
CREATE INDEX IF NOT EXISTS idx_water_billing_manager  ON public.water_billing_config(manager_id);

-- water_meter_readings: unit_id, property_id, manager_id lookup
CREATE INDEX IF NOT EXISTS idx_water_readings_unit     ON public.water_meter_readings(unit_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_property ON public.water_meter_readings(property_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_manager  ON public.water_meter_readings(manager_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_status   ON public.water_meter_readings(status);

-- vacation_notices: tenant_id, manager_id, status lookup
CREATE INDEX IF NOT EXISTS idx_vacation_tenant_id  ON public.vacation_notices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vacation_manager_id ON public.vacation_notices(manager_id);
CREATE INDEX IF NOT EXISTS idx_vacation_status     ON public.vacation_notices(status);

-- tenant_invitations: token, email, status lookup
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token  ON public.tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email  ON public.tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_status ON public.tenant_invitations(status);

-- manager_subscriptions: manager_user_id, status lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_manager ON public.manager_subscriptions(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON public.manager_subscriptions(status);

-- deposit_refunds: tenant_id, status lookup
CREATE INDEX IF NOT EXISTS idx_deposit_refunds_tenant ON public.deposit_refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deposit_refunds_status ON public.deposit_refunds(status);

-- deposit_deductions: tenant_id lookup
CREATE INDEX IF NOT EXISTS idx_deposit_deductions_tenant ON public.deposit_deductions(tenant_id);

-- bank_details: manager_id lookup
CREATE INDEX IF NOT EXISTS idx_bank_details_manager ON public.bank_details(manager_id);

-- property_amenity_charges: property_id, manager_id lookup
CREATE INDEX IF NOT EXISTS idx_amenity_charges_property ON public.property_amenity_charges(property_id);
CREATE INDEX IF NOT EXISTS idx_amenity_charges_manager  ON public.property_amenity_charges(manager_id);

-- property_deductions: property_id, manager_id lookup
CREATE INDEX IF NOT EXISTS idx_property_deductions_property ON public.property_deductions(property_id);
CREATE INDEX IF NOT EXISTS idx_property_deductions_manager  ON public.property_deductions(manager_id);

-- push_subscriptions: user_id lookup
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- account_activations: user_id, token lookup
CREATE INDEX IF NOT EXISTS idx_account_activations_user  ON public.account_activations(user_id);
CREATE INDEX IF NOT EXISTS idx_account_activations_token ON public.account_activations(token);

-- manager_submanagers: manager_id, submanager_user_id lookup
CREATE INDEX IF NOT EXISTS idx_manager_submanagers_manager    ON public.manager_submanagers(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_submanagers_submanager ON public.manager_submanagers(submanager_user_id);

-- manager_ewallet_settings: manager_user_id lookup
CREATE INDEX IF NOT EXISTS idx_ewallet_settings_manager ON public.manager_ewallet_settings(manager_user_id);
