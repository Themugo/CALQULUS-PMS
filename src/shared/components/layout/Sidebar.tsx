import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Settings, LogOut, ChevronRight, ChevronLeft, X,
  Globe, Shield, Users, FileText, Wrench,
  Calendar, CreditCard, BarChart3, Droplets, Mail,
  Handshake, FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { useViewOnly } from "@/shared/contexts/ViewOnlyContext";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import calqulusLogo from "@/assets/calqulus-logo-new.png";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const managerNav: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Leases", href: "/leases", icon: FileText },
  { name: "Tenants", href: "/tenants", icon: Users },
  { name: "Invites", href: "/invites", icon: Mail },
  { name: "Vacation Notices", href: "/vacation-notices", icon: Calendar },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Water Billing", href: "/water-billing", icon: Droplets },
  { name: "Statements", href: "/statements", icon: FileSpreadsheet },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const webhostNav: NavItem[] = [
  { name: "Webhost Portal", href: "/webhost", icon: Shield },
];

const agencyNav: NavItem[] = [
  { name: "Agency Portal", href: "/agency", icon: Handshake },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isWebhost, isAgency } = useAuth();
  const { isViewOnly } = useViewOnly();
  const [collapsed, setCollapsed] = useState(false);

  const navigation = isWebhost ? webhostNav : isAgency ? agencyNav : managerNav;

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const handleNavClick = () => { if (onClose) onClose(); };
  const handleSignOut = async () => { await signOut(); };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => onClose?.()}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen flex flex-col sidebar-gradient transition-all duration-300 ease-in-out",
          "lg:translate-x-0",
          collapsed ? "w-16" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top gold accent line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-400/60 to-transparent flex-shrink-0" />

        {/* Logo area */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border flex-shrink-0",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          {collapsed ? (
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-9 w-auto object-contain" />
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <img src={calqulusLogo} alt="CALQULUS PMS" className="h-10 w-auto object-contain flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-heading font-bold text-sm text-gradient leading-none truncate">CALQULUS</p>
                <p className="text-[10px] text-sidebar-muted font-medium tracking-widest uppercase mt-0.5">PMS</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost" size="icon"
              className="hidden lg:flex text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              className="lg:hidden text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-0.5 scrollbar-hide">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation",
                  collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                  active
                    ? "bg-gradient-to-r from-amber-400/15 to-transparent border border-amber-400/25 text-amber-300 shadow-sm"
                    : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground border border-transparent"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  active ? "text-amber-400" : "text-sidebar-muted group-hover:text-amber-400/70"
                )} />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {item.badge}
                      </Badge>
                    )}
                    {active && (
                      <div className="w-1 h-4 rounded-full bg-amber-400 flex-shrink-0" />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom gold accent */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent flex-shrink-0" />

        {/* Footer */}
        <div className={cn(
          "flex-shrink-0",
          collapsed ? "p-2" : "p-3"
        )}>
          {!collapsed && user && (
            <div className="px-3 py-2 mb-2 rounded-lg bg-sidebar-accent/40 border border-sidebar-border">
              <p className="text-[10px] text-sidebar-muted uppercase tracking-wider font-semibold mb-0.5">Signed in as</p>
              <p className="text-xs text-amber-300/80 truncate font-medium">{user.email}</p>
            </div>
          )}
          {isViewOnly ? (
            <button
              onClick={() => navigate('/webhost')}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors touch-manipulation",
                collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                "text-amber-500 hover:bg-sidebar-accent/50 hover:text-amber-400/70"
              )}
              title={collapsed ? "Back to Webhost Portal" : undefined}
            >
              <Globe className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Back to Webhost Portal</span>}
            </button>
          ) : (
            <button
              onClick={handleSignOut}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors touch-manipulation",
                collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                "text-sidebar-muted hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20"
              )}
              title={collapsed ? "Sign Out" : undefined}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          )}
        </div>

        {/* Bottom gold line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-400/40 to-transparent flex-shrink-0" />
      </aside>
    </>
  );
}
