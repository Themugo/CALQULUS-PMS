/**
 * Landlord portfolio math from billed / collected / share fields.
 * Does not invent expense ledgers — management fee is the unshared
 * portion of collected rent (same formula as get_landlord_revenue).
 */

export function occupancyPercent(occupied: number, totalUnits: number): number {
  if (totalUnits <= 0) return 0;
  return Math.round((occupied / totalUnits) * 100);
}

export function landlordNetShare(collected: number, revenueSharePct: number): number {
  return collected * (revenueSharePct / 100);
}

export function managementFeeFromShare(collected: number, revenueSharePct: number): number {
  return collected - landlordNetShare(collected, revenueSharePct);
}

export function collectionRatePercent(collected: number, billed: number): number {
  if (billed <= 0) return 0;
  return Math.round((collected / billed) * 100);
}

export const LANDLORD_PRIMARY_SECTIONS = [
  "Portfolio overview",
  "Income",
  "Collections",
  "Outstanding",
  "Occupancy",
  "Expenses",
  "Property performance",
  "Recent activity",
] as const;
