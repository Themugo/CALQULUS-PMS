/**
 * Group bills by the account the money will be collected into.
 *
 * The STK initiator refuses a single prompt whose bills resolve to different collection
 * accounts (409). The key here mirrors that server check exactly — account id, method,
 * paybill, till — so the UI never offers a combination the server will reject.
 */
export interface RouteLike {
  account_id?: string | null;
  payment_method?: string | null;
  paybill_number?: string | null;
  till_number?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  account_label?: string | null;
}

export const NO_DESTINATION = "none";

export function destinationKey(route: RouteLike | null | undefined): string {
  if (!route || !route.account_id) return NO_DESTINATION;
  return [route.account_id, route.payment_method ?? "", route.paybill_number ?? "", route.till_number ?? ""].join("|");
}

export function destinationLabel(route: RouteLike | null | undefined): string {
  if (!route || !route.account_id) return "Pay at the office";
  switch (route.payment_method) {
    case "mpesa_paybill": return `M-Pesa Paybill ${route.paybill_number ?? ""}`.trim();
    case "mpesa_till": return `M-Pesa Till ${route.till_number ?? ""}`.trim();
    case "bank_transfer": return `${route.bank_name ?? "Bank"} ${route.bank_account_number ?? ""}`.trim();
    default: return route.account_label || "Office / cash";
  }
}

export interface DestinationGroup<T> { key: string; label: string; items: T[] }

export function groupByDestination<T>(items: T[], routeOf: (item: T) => RouteLike | null | undefined): DestinationGroup<T>[] {
  const groups = new Map<string, DestinationGroup<T>>();
  for (const item of items) {
    const route = routeOf(item);
    const key = destinationKey(route);
    const g = groups.get(key) ?? { key, label: destinationLabel(route), items: [] };
    g.items.push(item);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/**
 * Once a bill is picked, only bills collected into the same account may be added.
 * Returns the reason a bill is locked, or null when it can be selected.
 */
export function lockedReason(selectedKeys: string[], billKey: string): string | null {
  if (selectedKeys.length === 0) return null;
  return selectedKeys.includes(billKey) ? null : "Goes to a different account — pay it separately";
}
