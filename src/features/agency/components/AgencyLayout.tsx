import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import {
  Building2, Users, LogOut, LayoutDashboard, FileText,
  Wrench, CreditCard, Settings, BarChart3, Menu, X,
  Calendar, Handshake, Droplets, Mail, FileSpreadsheet, ChevronRight,
} from 'lucide-react';
import { BrandMark } from '@/shared/components/branding/BrandMark';
import { Footer } from '@/shared/components/layout/Footer';

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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-muted/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — light executive, indigo agency identity */}
      <aside className={`
        fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border flex flex-col
        transform transition-transform duration-300
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Top indigo accent line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo/0 via-indigo/60 to-indigo/0 flex-shrink-0" />

        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size="md" showWordmark subtitle="Agency" />
          </div>
          <button className="lg:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
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
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground border-transparent'}
                `}
              >
                <item.icon className={`h-4 w-4 flex-shrink-0 transition-colors
                  ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {active && <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 border-t border-border">
          {user && (
            <div className="px-3 py-2 mb-2 rounded-lg bg-navy-mid/5 border border-navy-mid/10">
              <p className="text-[9px] text-navy-mid uppercase tracking-wider font-semibold mb-0.5">Agency</p>
              <p className="text-xs text-foreground/70 truncate font-medium">{user.email}</p>
            </div>
          )}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-transparent
              hover:border-destructive/20 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
        <div className="h-0.5 w-full bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 flex-shrink-0" />
      </aside>

      {/* Main content area */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open menu"
              className="lg:hidden text-muted-foreground hover:text-foreground transition-colors p-2 -ml-1.5 rounded-lg hover:bg-muted/50 min-h-10 min-w-10 inline-flex items-center justify-center"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            {title && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-navy-mid font-medium hidden sm:inline">Agency</span>
                  <ChevronRight className="h-3.5 w-3.5 hidden sm:inline text-muted-foreground/50" />
                  <h1 className="font-heading font-semibold text-foreground truncate">{title}</h1>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[160px]">{user?.email}</span>
            <div className="h-8 w-8 rounded-full bg-navy-primary flex items-center justify-center text-white text-xs font-bold">
              {(user?.email || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden animate-fade-in outline-none">
          {children}
        </main>

        {/* Footer */}
        <Footer variant="agency" />
      </div>
    </div>
  );
};

export default AgencyLayout;
