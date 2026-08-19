import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  X,
  Globe,
  Shield,
  Users,
  FileText,
  Wrench,
  Calendar,
  CreditCard,
  BarChart3,
  Droplets,
  Mail,
  Handshake,
  FileSpreadsheet,
  UserX,
  Building2,
  FileCheck,
  Receipt,
  Wallet,
  MessageSquare,
  User,
  Home,
  Star,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { useRBAC, type PermissionKey } from "@/shared/hooks/useRBAC";
import { useViewOnly } from "@/shared/contexts/ViewOnlyContext";
import { useNavHistory } from "@/shared/hooks/useNavHistory";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { BrandMark } from "@/shared/components/branding/BrandMark";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  permission?: PermissionKey;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const managerNavGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "PORTFOLIO",
    items: [
      { name: "Properties", href: "/properties", icon: Building2, permission: "view_properties" },
      { name: "Landlords", href: "/landlords", icon: Handshake, permission: "view_properties" },
    ],
  },
  {
    title: "OCCUPANCY",
    items: [
      { name: "Leases", href: "/leases", icon: FileText, permission: "view_leases" },
      { name: "Tenants", href: "/tenants", icon: Users, permission: "view_tenants" },
      { name: "Invites", href: "/invites", icon: Mail, permission: "view_tenants" },
      { name: "Vacation Notices", href: "/vacation-notices", icon: Calendar, permission: "view_tenants" },
      { name: "Tenant Screening", href: "/tenant-screening", icon: UserX, permission: "view_tenants" },
    ],
  },
  {
    title: "COLLECTIONS",
    items: [
      { name: "Billing", href: "/billing", icon: CreditCard, permission: "view_invoices" },
      { name: "Water Billing", href: "/water-billing", icon: Droplets, permission: "view_invoices" },
      { name: "Statements", href: "/statements", icon: FileSpreadsheet, permission: "view_invoices" },
      { name: "Payment History", href: "/payments", icon: Wallet, permission: "view_invoices" },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { name: "Maintenance", href: "/maintenance", icon: Wrench, permission: "view_maintenance" },
      { name: "Contracts", href: "/contracts", icon: FileCheck, permission: "view_contracts" },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { name: "Platform Billing", href: "/platform-billing", icon: Receipt },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const webhostNavGroups: NavGroup[] = [
  {
    title: "PLATFORM OVERSIGHT",
    items: [
      { name: "Webhost Portal", href: "/webhost", icon: Shield },
    ],
  },
];

const agencyNavGroups: NavGroup[] = [
  {
    title: "AGENCY WORKSPACE",
    items: [
      { name: "Agency Portal", href: "/agency", icon: Handshake },
      { name: "Properties", href: "/agency/properties", icon: Building2 },
      { name: "Tenants", href: "/agency/tenants", icon: Users },
      { name: "Leases", href: "/agency/leases", icon: FileText },
      { name: "Billing", href: "/agency/billing", icon: CreditCard },
      { name: "Water Billing", href: "/agency/water-billing", icon: Droplets },
      { name: "Statements", href: "/agency/statements", icon: FileSpreadsheet },
      { name: "Invites", href: "/agency/invites", icon: Mail },
      { name: "Maintenance", href: "/agency/maintenance", icon: Wrench },
      { name: "Landlords", href: "/agency/landlords", icon: Users },
      { name: "Reports", href: "/agency/reports", icon: BarChart3 },
      { name: "Settings", href: "/agency/settings", icon: Settings },
    ],
  },
];

const landlordNavGroups: NavGroup[] = [
  {
    title: "PROPERTY OWNER",
    items: [
      { name: "Portfolio", href: "/landlord/dashboard", icon: Building2 },
    ],
  },
];

const tenantNavGroups: NavGroup[] = [
  {
    title: "TENANT PORTAL",
    items: [
      { name: "Home", href: "/portal", icon: Home },
      { name: "Payments", href: "/portal/payments", icon: CreditCard },
      { name: "Maintenance", href: "/portal/maintenance", icon: Wrench },
      { name: "Documents", href: "/portal/documents", icon: FileText },
      { name: "Vacation Notice", href: "/portal/vacation-notices", icon: Calendar },
      { name: "Inbox", href: "/portal/inbox", icon: MessageSquare },
      { name: "Profile", href: "/portal/profile", icon: User },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isWebhost, isAgency, isLandlord, isTenant } = useAuth();
  const { can } = useRBAC();
  const { isViewOnly } = useViewOnly();
  const { favorites } = useNavHistory();
  const [collapsed, setCollapsed] = useState(false);

  const rawNavGroups = isWebhost
    ? webhostNavGroups
    : isAgency
    ? agencyNavGroups
    : isLandlord
    ? landlordNavGroups
    : isTenant
    ? tenantNavGroups
    : managerNavGroups;

  // Filter items dynamically based on permission checks
  const navGroups = rawNavGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);

  const isActive = (href: string) => {
    if (href === "/" || href === "/webhost" || href === "/agency" || href === "/portal") {
      return location.pathname === href;
    }
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => onClose?.()}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen flex flex-col bg-sidebar-background border-r border-sidebar-border text-sidebar-foreground transition-all duration-300 ease-in-out select-none",
          "lg:translate-x-0",
          collapsed ? "w-16" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top Accent Stripe — CALQULUS blue */}
        <div className="h-0.5 w-full bg-sidebar-primary flex-shrink-0" />

        {/* Workspace Brand Header */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border/80 flex-shrink-0 px-3",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {collapsed ? (
            <BrandMark size="nav" />
          ) : (
            <BrandMark size="md" showWordmark subtitle="PMS" />
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60 h-7 w-7 rounded-md"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close sidebar"
              className="lg:hidden text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60 h-7 w-7 rounded-md"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Workspace Context Switcher Bar */}
        <div className="p-2 border-b border-sidebar-border/60">
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-sidebar-border">
          {/* Pinned / Favorites Group */}
          {!collapsed && favorites.length > 0 && (
            <div className="space-y-0.5 pb-2 border-b border-sidebar-border/40">
              <div className="px-3 py-1 text-[10px] font-semibold text-sidebar-muted uppercase tracking-wider flex items-center justify-between">
                <span>PINNED MODULES</span>
              </div>
              {favorites.map((fav) => {
                const active = isActive(fav.href);
                return (
                  <Link
                    key={fav.href}
                    to={fav.href}
                    onClick={handleNavClick}
                    className={cn(
                      "group relative flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-2 border-transparent"
                    )}
                  >
                    <Star className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground")} />
                    <span className="flex-1 truncate">{fav.name}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Regular Groups */}
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-0.5">
              {!collapsed && group.title && (
                <div className="px-3 py-1 text-[10px] font-semibold text-sidebar-muted uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md text-xs font-medium transition-all duration-150 touch-manipulation",
                      collapsed ? "justify-center p-2.5" : "px-3 py-2",
                      active
                        ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-2 border-transparent"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0 transition-colors",
                        active
                          ? "text-primary"
                          : "text-sidebar-muted group-hover:text-sidebar-foreground"
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.badge && (
                          <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary/20 text-primary border-primary/30">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Area */}
        <div className={cn("border-t border-sidebar-border/80 flex-shrink-0", collapsed ? "p-2" : "p-3")}>
          {!collapsed && user && (
            <div className="px-2.5 py-2 mb-2 rounded-md bg-sidebar-accent/30 border border-sidebar-border/50">
              <p className="text-[10px] text-sidebar-muted font-medium uppercase tracking-wider">Signed in</p>
              <p className="text-xs font-semibold text-sidebar-foreground truncate mt-0.5">{user.email}</p>
            </div>
          )}

          {isViewOnly ? (
            <button
              onClick={() => navigate("/webhost")}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md text-xs font-medium transition-colors touch-manipulation text-warning hover:bg-warning/10",
                collapsed ? "justify-center p-2.5" : "px-3 py-2"
              )}
              title={collapsed ? "Back to Webhost" : undefined}
            >
              <Globe className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Back to Webhost</span>}
            </button>
          ) : (
            <button
              onClick={handleSignOut}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md text-xs font-medium text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation",
                collapsed ? "justify-center p-2.5" : "px-3 py-2"
              )}
              title={collapsed ? "Sign Out" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
