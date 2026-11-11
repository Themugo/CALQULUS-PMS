/**
 * Roles a landlord can give to people who help run their property (a hired manager, a family member, a caretaker, an accountant). Every property belongs to its owner, the landlord.
 * The landlord decides the role and the properties; the permission set below is only the starting
 * point and every switch can be changed afterwards. Agencies use a different route: the agency
 * links landlords and decides what each landlord may see.
 */
export type LandlordTeamRoleId = "property_manager" | "family_member" | "caretaker" | "accountant" | "custom";

export interface LandlordTeamPermissions {
  can_view_properties: boolean;
  can_view_tenants: boolean;
  can_view_leases: boolean;
  can_view_invoices: boolean;
  can_view_maintenance: boolean;
  can_view_contracts: boolean;
  can_view_activity_logs: boolean;
  can_record_payments: boolean;
  can_edit_tenants: boolean;
  can_manage_maintenance: boolean;
  can_create_invoices: boolean;
  can_approve_moveouts: boolean;
  can_send_notices: boolean;
  can_upload_documents: boolean;
  restrict_to_assigned_properties: boolean;
}

const none: LandlordTeamPermissions = {
  can_view_properties: true,
  can_view_tenants: false,
  can_view_leases: false,
  can_view_invoices: false,
  can_view_maintenance: false,
  can_view_contracts: false,
  can_view_activity_logs: false,
  can_record_payments: false,
  can_edit_tenants: false,
  can_manage_maintenance: false,
  can_create_invoices: false,
  can_approve_moveouts: false,
  can_send_notices: false,
  can_upload_documents: false,
  restrict_to_assigned_properties: true,
};

export const LANDLORD_TEAM_ROLES: ReadonlyArray<{
  id: LandlordTeamRoleId;
  label: string;
  description: string;
  permissions: LandlordTeamPermissions;
}> = [
  {
    id: "property_manager",
    label: "Property manager",
    description: "Runs day-to-day operations: tenants, billing, payments, maintenance and notices.",
    permissions: {
      ...none,
      can_view_tenants: true, can_view_leases: true, can_view_invoices: true, can_view_maintenance: true,
      can_record_payments: true, can_edit_tenants: true, can_manage_maintenance: true,
      can_create_invoices: true, can_approve_moveouts: true, can_send_notices: true, can_upload_documents: true,
    },
  },
  {
    id: "family_member",
    label: "Family member",
    description: "Helps run the property: sees tenants, billing and maintenance and can record payments. No tenant editing or invoices.",
    permissions: {
      ...none,
      can_view_tenants: true, can_view_leases: true, can_view_invoices: true, can_view_maintenance: true,
      can_record_payments: true, can_manage_maintenance: true, can_send_notices: true, can_upload_documents: true,
    },
  },
  {
    id: "caretaker",
    label: "Caretaker",
    description: "On-site: sees tenants and units, handles maintenance and notices. No billing or payments.",
    permissions: {
      ...none,
      can_view_tenants: true, can_view_leases: true, can_view_maintenance: true,
      can_manage_maintenance: true, can_send_notices: true, can_upload_documents: true,
    },
  },
  {
    id: "accountant",
    label: "Accountant",
    description: "Billing only: invoices and payments. No tenant editing or maintenance.",
    permissions: {
      ...none,
      can_view_tenants: true, can_view_invoices: true, can_record_payments: true, can_create_invoices: true,
    },
  },
  {
    id: "custom",
    label: "Custom",
    description: "Start from view-only access and switch on exactly what this person needs.",
    permissions: { ...none, can_view_tenants: true, can_view_leases: true, can_view_invoices: true, can_view_maintenance: true },
  },
];

export function teamRolePreset(id: LandlordTeamRoleId) {
  return LANDLORD_TEAM_ROLES.find((r) => r.id === id) ?? LANDLORD_TEAM_ROLES[LANDLORD_TEAM_ROLES.length - 1];
}
