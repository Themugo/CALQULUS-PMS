/**
 * Maps operational statuses onto CALQULUS status-badge tones.
 * Color is reserved for meaning: success, warning, danger, info, or neutral.
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export function statusBadgeClass(tone: StatusTone): string {
  return `status-badge status-${tone}`;
}

export function tenantStatusTone(status: string): StatusTone {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    default:
      return "neutral";
  }
}

export function leaseStatusTone(status: string): StatusTone {
  switch (status) {
    case "active":
      return "success";
    case "expiring":
      return "warning";
    case "expired":
    case "terminated":
      return "danger";
    case "pending":
      return "info";
    default:
      return "neutral";
  }
}

export function invoiceStatusTone(status: string): StatusTone {
  switch (status) {
    case "paid":
    case "succeeded":
    case "success":
    case "complete":
      return "success";
    case "partially_paid":
      return "info";
    case "pending":
    case "processing":
      return "warning";
    case "overdue":
    case "failed":
      return "danger";
    case "cancelled":
    case "canceled":
      return "neutral";
    default:
      return "neutral";
  }
}

/** Tenant-facing payment/invoice labels — Pending, Successful, Failed, Cancelled, Partially paid. */
export function invoiceStatusLabel(status: string): string {
  switch (status) {
    case "paid":
    case "succeeded":
    case "success":
    case "complete":
      return "Successful";
    case "partially_paid":
      return "Partially paid";
    case "pending":
    case "processing":
      return "Pending";
    case "overdue":
      return "Overdue";
    case "failed":
      return "Failed";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    default:
      return status.replace(/_/g, " ");
  }
}

export function payoutStatusTone(status: string): StatusTone {
  switch (status) {
    case "paid":
      return "success";
    case "approved":
      return "info";
    case "pending":
      return "warning";
    case "rejected":
      return "danger";
    default:
      return "neutral";
  }
}

export function maintenanceStatusTone(status: string): StatusTone {
  switch (status) {
    case "open":
      return "warning";
    case "in_progress":
      return "info";
    case "completed":
      return "success";
    default:
      return "neutral";
  }
}

export function maintenancePriorityTone(priority: string): StatusTone {
  switch (priority) {
    case "urgent":
    case "high":
      return "danger";
    case "medium":
      return "warning";
    default:
      return "neutral";
  }
}

export function occupancyTone(rate: number): StatusTone {
  if (rate >= 90) return "success";
  if (rate >= 70) return "info";
  if (rate >= 50) return "warning";
  return "danger";
}

export function occupancyRateColor(rate: number): string {
  const tone = occupancyTone(rate);
  if (tone === "success") return "text-success";
  if (tone === "info") return "text-primary";
  if (tone === "warning") return "text-warning";
  return "text-destructive";
}

/** Compact age label for work-order tables, e.g. "Today", "1d", "12d". */
export function requestAgeLabel(isoDate: string, now = Date.now()): string {
  const parsed = new Date(isoDate).getTime();
  if (Number.isNaN(parsed)) return "—";
  const days = Math.max(0, Math.floor((now - parsed) / 86_400_000));
  if (days === 0) return "Today";
  return `${days}d`;
}
