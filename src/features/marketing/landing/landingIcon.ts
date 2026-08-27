/**
 * Safe icon resolver for the landing page config.
 *
 * Marketing content references icons by *name string* ("Building2"), never by
 * arbritrary component references, so a future webhost/admin CMS cannot
 * inject executable code. The resolver maps a fixed allow-list of lucide icon
 * names to components. Unknown or unregistered names resolve to `Building2`
 * (a safe default) — never to a user-supplied component.
 */
import {
  Activity,
  BarChart3,
  Building2,
  Check,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Landmark,
  LifeBuoy,
  Lock,
  Network,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Shield,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Building2,
  BarChart3,
  Check,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Landmark,
  LifeBuoy,
  Lock,
  Network,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
  Wrench,
};

export const LANDING_ICON_NAMES = Object.keys(ICON_REGISTRY) as string[];

export type LandingIconName = keyof typeof ICON_REGISTRY;

/** Resolve a config icon name to a lucide component. Always returns a safe component. */
export function landingIcon(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? Building2;
}

/** True if `name` is a known, registered icon name. */
export function hasIcon(name: string): boolean {
  return name in ICON_REGISTRY;
}