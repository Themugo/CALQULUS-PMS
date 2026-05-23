import { lazy, type LazyExoticComponent, type ComponentType } from "react";

// ── Lazy-loaded page components ─────────────────────────────────────
const Dashboard = lazy(() => import("@/features/dashboard/pages/Dashboard"));
const Tenants = lazy(() => import("@/features/tenants/pages/Tenants"));
const Leases = lazy(() => import("@/features/leases/pages/Leases"));
const Billing = lazy(() => import("@/features/billing/pages/Billing"));
const Properties = lazy(() => import("@/features/properties/pages/Properties"));
const PropertyDetail = lazy(() => import("@/features/properties/pages/PropertyDetail"));
const Maintenance = lazy(() => import("@/features/maintenance/pages/Maintenance"));
const Communications = lazy(() => import("@/features/communications/CommunicationsPage"));
const Settings = lazy(() => import("@/features/settings/pages/Settings"));
const Auth = lazy(() => import("@/features/auth/pages/Auth"));
const LandlordAuth = lazy(() => import("@/features/auth/pages/LandlordAuth"));
const WebhostAuth = lazy(() => import("@/features/auth/pages/WebhostAuth"));
const TenantAuth = lazy(() => import("@/features/auth/pages/TenantAuth"));
const TenantLogin = lazy(() => import("@/features/auth/pages/TenantLogin"));
const TenantSelfRegister = lazy(() => import("@/features/auth/pages/TenantSelfRegister"));
const DemoControlPanel = lazy(() => import("@/features/demo/DemoControlPanel"));
const LegalPage = lazy(() => import("@/features/legal/LegalPage"));
const WebhostDashboard = lazy(() => import("@/features/webhost/pages/WebhostDashboard"));
const TenantPortal = lazy(() => import("@/features/tenant-portal/pages/TenantPortal"));
const PaymentHistory = lazy(() => import("@/features/payments/pages/PaymentHistory"));
const TenantProfile = lazy(() => import("@/features/tenant-portal/pages/TenantProfile"));
const TenantContracts = lazy(() => import("@/features/tenant-portal/pages/TenantContracts"));
const TenantMaintenance = lazy(() => import("@/features/tenant-portal/pages/TenantMaintenance"));
const TenantVacationNotices = lazy(() => import("@/features/tenant-portal/pages/TenantVacationNotices"));
const TenantInbox = lazy(() => import("@/features/tenant-portal/pages/TenantInbox"));
const TenantDocuments = lazy(() => import("@/features/tenant-portal/pages/TenantDocuments"));
const ManagerPaymentHistory = lazy(() => import("@/features/payments/pages/ManagerPaymentHistory"));
const Contracts = lazy(() => import("@/features/contracts/pages/Contracts"));
const VacationNotices = lazy(() => import("@/features/vacation-notices/pages/VacationNotices"));
const Reports = lazy(() => import("@/features/reports/pages/Reports"));
const ServicesPage = lazy(() => import("@/features/services/pages/ServicesPage"));
const ResetPassword = lazy(() => import("@/features/auth/pages/ResetPassword"));
const PendingApproval = lazy(() => import("@/features/auth/pages/PendingApproval"));
const InstallApp = lazy(() => import("@/shared/pages/InstallApp"));
const SubmanagerDashboard = lazy(() => import("@/features/submanager/pages/SubmanagerDashboard"));
const ActivateAccount = lazy(() => import("@/features/auth/pages/ActivateAccount"));
const ManagerPlatformBilling = lazy(() => import("@/features/payments/pages/ManagerPlatformBilling"));
const LandlordPortalAuth = lazy(() => import("@/features/auth/pages/LandlordPortalAuth"));
const LandlordDashboard = lazy(() => import("@/features/landlord/pages/LandlordDashboard"));
const LandlordInvitationAccept = lazy(() => import("@/features/landlord/pages/LandlordInvitationAccept"));
const NotFoundPage = lazy(() => import("@/shared/pages/NotFound"));

// ── Route definition types ──────────────────────────────────────────
export interface RouteDef {
  path: string;
  element: LazyExoticComponent<ComponentType>;
  protected?: boolean;
  redirect?: string;
}

export interface RoleRouteConfig {
  /** The role this config applies to */
  role: string;
  /** Fallback path when no route matches */
  fallback: string;
  /** Routes for this role */
  routes: RouteDef[];
  /** Optional: wrap all routes in a context provider */
  wrapper?: "viewOnly";
}

// ── Shared public routes (available when not logged in) ─────────────
export const publicRoutes: RouteDef[] = [
  { path: "/install", element: InstallApp },
  { path: "/demo", element: DemoControlPanel },
  { path: "/legal", element: LegalPage },
  { path: "/auth", element: Auth },
  { path: "/landlord", element: LandlordAuth },
  { path: "/landlord/login", element: LandlordPortalAuth },
  { path: "/landlord/invitation", element: LandlordInvitationAccept },
  { path: "/tenant/login", element: TenantLogin },
  { path: "/tenant/signup", element: TenantSelfRegister },
  { path: "/activate", element: ActivateAccount },
  { path: "/reset-password", element: ResetPassword },
  { path: "/portal/*", redirect: "/tenant/login" },
  { path: "/landlord/dashboard", redirect: "/landlord/login" },
  { path: "/", redirect: "/landlord" },
  { path: "*", redirect: "/landlord" },
];

// ── Admin domain routes (when not logged in on admin.* subdomain) ───
export const adminDomainRoutes: RouteDef[] = [
  { path: "/webhost/login", element: WebhostAuth },
  { path: "/demo", element: DemoControlPanel },
  { path: "*", redirect: "/webhost/login" },
];

// ── Role-based route configs ────────────────────────────────────────
export const roleRouteConfigs: RoleRouteConfig[] = [
  {
    role: "webhost",
    fallback: "/webhost",
    routes: [
      { path: "/webhost/login", redirect: "/webhost" },
      { path: "/webhost", element: WebhostDashboard, protected: true },
      { path: "*", redirect: "/webhost" },
    ],
  },
  {
    role: "submanager",
    fallback: "/submanager",
    wrapper: "viewOnly",
    routes: [
      { path: "/auth", redirect: "/submanager" },
      { path: "/landlord", redirect: "/submanager" },
      { path: "/submanager", element: SubmanagerDashboard, protected: true },
      { path: "*", redirect: "/submanager" },
    ],
  },
  {
    role: "landlord",
    fallback: "/landlord/dashboard",
    routes: [
      { path: "/landlord/login", redirect: "/landlord/dashboard" },
      { path: "/landlord/invitation", element: LandlordInvitationAccept },
      { path: "/landlord/dashboard", element: LandlordDashboard, protected: true },
      { path: "/reset-password", element: ResetPassword },
      { path: "*", redirect: "/landlord/dashboard" },
    ],
  },
  {
    role: "tenant",
    fallback: "/portal",
    routes: [
      { path: "/auth", redirect: "/portal" },
      { path: "/portal", element: TenantPortal, protected: true },
      { path: "/portal/payments", element: PaymentHistory, protected: true },
      { path: "/portal/profile", element: TenantProfile, protected: true },
      { path: "/portal/contracts", element: TenantContracts, protected: true },
      { path: "/portal/maintenance", element: TenantMaintenance, protected: true },
      { path: "/portal/services", element: ServicesPage, protected: true },
      { path: "/portal/vacation-notices", element: TenantVacationNotices, protected: true },
      { path: "/portal/inbox", element: TenantInbox, protected: true },
      { path: "/portal/documents", element: TenantDocuments, protected: true },
      { path: "*", element: NotFoundPage },
    ],
  },
  {
    role: "manager-pending",
    fallback: "*",
    routes: [
      { path: "/install", element: InstallApp },
      { path: "*", element: PendingApproval },
    ],
  },
  {
    role: "manager",
    fallback: "/",
    routes: [
      { path: "/install", element: InstallApp },
      { path: "/auth", redirect: "/" },
      { path: "/landlord", redirect: "/" },
      { path: "/tenant/login", redirect: "/" },
      { path: "/tenant/signup", redirect: "/" },
      { path: "/portal/*", redirect: "/" },
      { path: "/", element: Dashboard, protected: true },
      { path: "/payments", element: ManagerPaymentHistory, protected: true },
      { path: "/communications", element: Communications, protected: true },
      { path: "/platform-billing", element: ManagerPlatformBilling, protected: true },
      { path: "/my-billing", redirect: "/platform-billing" },
      { path: "/my-contracts", redirect: "/platform-billing" },
      { path: "/properties", element: Properties, protected: true },
      { path: "/properties/:id", element: PropertyDetail, protected: true },
      { path: "/tenants", element: Tenants, protected: true },
      { path: "/billing", element: Billing, protected: true },
      { path: "/maintenance", element: Maintenance, protected: true },
      { path: "/services", element: ServicesPage, protected: true },
      { path: "/contracts", element: Contracts, protected: true },
      { path: "/leases", element: Leases, protected: true },
      { path: "/vacation-notices", element: VacationNotices, protected: true },
      { path: "/reports", element: Reports, protected: true },
      { path: "/settings", element: Settings, protected: true },
      { path: "*", element: NotFoundPage },
    ],
  },
];

// ── Auth-only routes (user logged in but role not yet resolved) ─────
export const authOnlyRoutes: RouteDef[] = [
  { path: "/install", element: InstallApp },
  { path: "/demo", element: DemoControlPanel },
  { path: "/legal", element: LegalPage },
  { path: "/landlord", element: LandlordAuth },
  { path: "/auth", element: Auth },
  { path: "/webhost/login", element: WebhostAuth },
  { path: "/webhost", element: PageLoaderStub },
  { path: "/tenant/login", element: TenantLogin },
  { path: "/tenant/signup", element: TenantSelfRegister },
  { path: "/tenant/invitation", element: TenantAuth },
  { path: "/activate", element: ActivateAccount },
  { path: "/reset-password", element: ResetPassword },
  { path: "*", element: PageLoaderStub },
];

// ── Fallback routes (unknown state) ─────────────────────────────────
export const fallbackRoutes: RouteDef[] = [
  { path: "/install", element: InstallApp },
  { path: "/auth", element: Auth },
  { path: "/landlord", element: LandlordAuth },
  { path: "/webhost/login", element: WebhostAuth },
  { path: "/tenant/login", element: TenantLogin },
  { path: "/tenant/signup", element: TenantSelfRegister },
  { path: "/activate", element: ActivateAccount },
  { path: "/reset-password", element: ResetPassword },
  { path: "*", redirect: "/landlord" },
];

// Stub for PageLoader used in route config (actual PageLoader is rendered directly in AppRoutes)
function PageLoaderStub() {
  return null;
}
