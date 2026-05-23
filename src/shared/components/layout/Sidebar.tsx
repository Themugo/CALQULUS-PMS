import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Settings, LogOut, ChevronRight, ChevronLeft, X,
  History, Receipt, Globe, Shield, Users, FileText, Wrench,
  MessageSquare, Calendar, CreditCard, FileSignature, Home, BarChart3, Store,
  ChevronDown, Menu,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { useViewOnly } from "@/shared/contexts/ViewOnlyContext";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import rentflowLogo from "@/assets/rentflow-logo.png";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavItem[];
}

const managerNavGroups: NavGroup[] = [
  {
    name: "Overview",
    icon: LayoutDashboard,
    children: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    name: "Properties",
    icon: Building2,
    children: [
      { name: "Properties", href: "/properties", icon: Building2 },
      { name: "Tenants", href: "/tenants", icon: Users },
      { name: "Leases", href: "/leases", icon: FileText },
      { name: "Contracts", href: "/contracts", icon: FileSignature },
      { name: "Units", href: "/properties", icon: Home },
    ],
  },
  {
    name: "Finance",
    icon: CreditCard,
    children: [
      { name: "Billing", href: "/billing", icon: CreditCard },
      { name: "Payment History", href: "/payments", icon: History },
      { name: "Platform Billing", href: "/platform-billing", icon: Receipt },
    ],
  },
  {
    name: "Operations",
    icon: Wrench,
    children: [
      { name: "Maintenance", href: "/maintenance", icon: Wrench },
      { name: "Services", href: "/services", icon: Store },
      { name: "Vacation Notices", href: "/vacation-notices", icon: Calendar },
    ],
  },
  {
    name: "Communication",
    icon: MessageSquare,
    children: [
      { name: "Communications", href: "/communications", icon: MessageSquare },
    ],
  },
  {
    name: "Account",
    icon: Settings,
    children: [
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const webhostNav: NavItem[] = [
  { name: "Webhost Portal", href: "/webhost", icon: Shield },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isWebhost } = useAuth();
  const { isViewOnly } = useViewOnly();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    managerNavGroups.map(g => g.name)
  );

  const navigation = isWebhost
    ? { groups: [] as NavGroup[], flat: webhostNav }
    : { groups: managerNavGroups, flat: [] as NavItem[] };

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const anyChildActive = (children: NavItem[]) =>
    children.some(c => isActive(c.href));

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
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
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border flex-shrink-0",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          {collapsed ? (
            <img src={rentflowLogo} alt="RF" className="h-8 w-auto" />
          ) : (
            <div className="flex items-center gap-3">
              <img src={rentflowLogo} alt="RentFlow" className="h-9 w-auto" />
            </div>
          )}
          <div className="flex items-center gap-1">
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
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-1 scrollbar-hide">
          {/* Flat nav (webhost) */}
          {navigation.flat.map((item) => {
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
                    ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                    : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn(
                  "h-4 w-4 flex-shrink-0",
                  active ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-primary"
                )} />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-sidebar-primary text-sidebar-primary-foreground">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );
          })}

          {/* Grouped nav (manager) */}
          {navigation.groups.map((group) => {
            const groupActive = !collapsed && anyChildActive(group.children);
            const isExpanded = expandedGroups.includes(group.name);
            return (
              <div key={group.name} className="space-y-0.5">
                {/* Group header */}
                {collapsed ? (
                  <div className="flex justify-center py-2">
                    <div className="h-px w-6 bg-sidebar-border" />
                  </div>
                ) : (
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors touch-manipulation",
                      groupActive
                        ? "text-sidebar-primary"
                        : "text-sidebar-muted/60 hover:text-sidebar-muted"
                    )}
                  >
                    <group.icon className="h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{group.name}</span>
                    <ChevronDown className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )} />
                  </button>
                )}
                {/* Group children */}
                {(isExpanded || collapsed) && group.children.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={handleNavClick}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation",
                        collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                        collapsed && "mx-0",
                        active
                          ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                          : "text-sidebar-muted hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                        collapsed ? "ml-0" : "ml-3"
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 flex-shrink-0",
                        active ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-primary"
                      )} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.name}</span>
                          {active && <ChevronRight className="h-3.5 w-3.5 text-sidebar-primary flex-shrink-0" />}
                          {item.badge && (
                            <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-sidebar-primary text-sidebar-primary-foreground">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn(
          "border-t border-sidebar-border flex-shrink-0",
          collapsed ? "p-2" : "p-3"
        )}>
          {!collapsed && user && (
            <p className="text-xs text-sidebar-muted truncate px-3 mb-2">{user.email}</p>
          )}
          {isViewOnly ? (
            <button
              onClick={() => navigate('/webhost')}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors touch-manipulation",
                collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                "text-purple-400 hover:bg-sidebar-accent/50 hover:text-purple-300"
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
                "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              title={collapsed ? "Sign Out" : undefined}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
