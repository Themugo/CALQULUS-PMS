import { CALQULUS_COLOR, CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";
import type { LandlordPortfolioSnapshot } from "./types";

/**
 * Landlord portal money semantics.
 * Financial figures are presented neutrally — colour is reserved for
 * status (arrears, occupancy thresholds, maintenance urgency), never
 * to paint every shilling green.
 */

/** Share of billed rent actually collected, 0–100. 0 when nothing was billed. */
export function collectionRate(collected: number, expected: number): number {
  if (expected <= 0) return 0;
  return Math.min(100, Math.round((collected / expected) * 100));
}

/** Landlord's net share of a collected amount, rounded to whole shillings. */
export function netShare(collected: number, sharePct: number): number {
  return Math.round((collected * sharePct) / 100);
}

export type AttentionTone = "destructive" | "warning" | "neutral";

/** Outstanding arrears are the only money figure allowed a status colour. */
export function arrearsTone(arrears: number): AttentionTone {
  return arrears > 0 ? "destructive" : "neutral";
}

export function attentionToneClass(tone: AttentionTone): string {
  if (tone === "destructive") return "border-destructive/20 bg-destructive/5";
  if (tone === "warning") return "border-warning/20 bg-warning/5";
  return "border-border bg-muted/20";
}

export interface LandlordAttentionItem {
  label: string;
  value: string;
  href: string;
  tone: AttentionTone;
}

interface AttentionRoutes {
  statements: string;
  maintenance: string;
  portfolio: string;
}

/** Ordered "what needs attention" list — arrears first, leases last. */
export function buildAttentionItems(
  portfolio: LandlordPortfolioSnapshot,
  pendingPayouts: number,
  routes: AttentionRoutes,
  formatMoney: (amount: number) => string,
): LandlordAttentionItem[] {
  const items: LandlordAttentionItem[] = [];

  if (portfolio.totalArrears > 0) {
    items.push({
      label: "Outstanding",
      value: formatMoney(portfolio.totalArrears),
      href: routes.statements,
      tone: "destructive",
    });
  }

  if (portfolio.urgentMaintenanceCount > 0 || portfolio.openMaintenanceCount > 0) {
    items.push({
      label: "Maintenance",
      value:
        portfolio.urgentMaintenanceCount > 0
          ? `${portfolio.urgentMaintenanceCount} urgent`
          : `${portfolio.openMaintenanceCount} open`,
      href: routes.maintenance,
      tone: "warning",
    });
  }

  if (pendingPayouts > 0) {
    items.push({
      label: "Payouts",
      value: `${pendingPayouts} awaiting review`,
      href: routes.statements,
      tone: "warning",
    });
  }

  if (portfolio.expiringLeasesCount > 0) {
    items.push({
      label: "Leases ending (30d)",
      value: String(portfolio.expiringLeasesCount),
      href: routes.portfolio,
      tone: "neutral",
    });
  }

  return items;
}

/**
 * Landlord chart identity: deep navy for collected, emerald accent for net.
 * Emerald is the portal identity accent — used here and almost nowhere else.
 * Money bars are never the generic success green.
 */
export const LANDLORD_TREND_COLORS = {
  collected: CALQULUS_COLOR.navyPrimary,
  net: CALQULUS_PORTAL_ACCENT.landlord.hex,
} as const;

/** Property detail tab order — performance first, then units, maintenance, documents. */
export const LANDLORD_PROPERTY_TABS = ["performance", "units", "maintenance", "documents"] as const;
export type LandlordPropertyTab = (typeof LANDLORD_PROPERTY_TABS)[number];
