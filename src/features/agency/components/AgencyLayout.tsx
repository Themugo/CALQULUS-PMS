import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import {
  Building2, Users, LogOut, LayoutDashboard, FileText,
  Wrench, CreditCard, Settings, BarChart3, Menu, X,
  Calendar, Handshake, Droplets, Mail, FileSpreadsheet, ChevronRight,
} from 'lucide-react';
import calqulusLogo from '@/assets/calqulus-logo-new.png';

const navItems = [
  { label: 'Dashboard',        href: '/agency',                    icon: LayoutDashboard },
  { label: 'Properties',       href: '/agency/properties',         icon: Building2 },
  { label: 'Tenants',          href: '/agency/tenants',            icon: Users },
  { label: 'Leases',           href: '/agency/leases',             icon: FileText },
  { label: 'Landlords',        href: '/agency/landlords',          icon: Handshake },
  { label: 'Billing',          href: '/agency/billing',            icon: CreditCard },
  { label: 'Water Billing',    href: '/agency/water-billing',      icon: Droplets },
  { label: 'Invites',          href: '/agency/invites',            icon: Mail },
  { label: 'Statements',       href: '/agency/statements',         icon: FileSpreadsheet },
  { label: 'Maintenance',      href: '/agency/maintenance',        icon: Wrench },
  { label: 'Vacation Notices', href: '/agency/vacation-notices',   icon: Calendar },
  { label: 'Reports',          href: '/agency/reports',            icon: BarChart3 },
  { label: 'Settings',         href: '/agency/settings',           icon: Settings },
];

interface AgencyLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AgencyLayout = ({ children, title }: AgencyLayoutProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/agency') return location.pathname === '/agency';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 z-50 h-full w-64 sidebar-gradient border-r border-amber-400/10
        transform transition-transform duration-300
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        {/* Top gold line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent flex-shrink-0" />

        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-amber-400/10 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-9 w-auto object-contain flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-heading font-bold text-sm text-gradient leading-none truncate">CALQULUS</p>
              <p className="text-[9px] text-amber-400/50 font-semibold tracking-[0.2em] uppercase mt-0.5">Agency Portal</p>
            </div>
          </div>
          <button className="lg:hidden text-white/40 hover:text-white/70 transition-colors p-1"
            onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5 scrollbar-hide">
          {navItems.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 border touch-manipulation
                  ${active
                    ? 'bg-gradient-to-r from-amber-400/15 to-transparent border-amber-400/25 text-amber-300'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80 border-transparent'}
                `}
              >
                <item.icon className={`h-4 w-4 flex-shrink-0 transition-colors
                  ${active ? 'text-amber-400' : 'text-white/40 group-hover:text-amber-400/60'}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {active && <div className="w-1 h-4 rounded-full bg-amber-400 flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 border-t border-amber-400/10">
          {user && (
            <div className="px-3 py-2 mb-2 rounded-lg bg-amber-400/5 border border-amber-400/10">
              <p className="text-[9px] text-amber-400/50 uppercase tracking-wider font-semibold mb-0.5">Agency</p>
              <p className="text-xs text-amber-300/70 truncate font-medium">{user.email}</p>
            </div>
          )}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              text-white/40 hover:bg-red-500/10 hover:text-red-400 border border-transparent
              hover:border-red-500/20 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-400/30 to-transparent flex-shrink-0" />
      </aside>

      {/* Main content area */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-muted/50"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            {title && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-amber-500/70 font-medium hidden sm:inline">Agency</span>
                  <ChevronRight className="h-3.5 w-3.5 hidden sm:inline text-muted-foreground/50" />
                  <h1 className="font-heading font-semibold text-foreground truncate">{title}</h1>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[160px]">{user?.email}</span>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 text-xs font-bold">
              {(user?.email || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AgencyLayout;
