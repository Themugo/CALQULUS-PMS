import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, CreditCard, ShieldAlert, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WebhostLayout from "@/features/webhost/components/WebhostLayout";
import { useAdminHealthProbes, type ProbeStatus } from "@/features/webhost/hooks/useAdminHealthProbes";
import { groupSecurityEvents } from "@/features/webhost/lib/adminSecurity";
import { WEBHOST_OPS_ROUTES, WEBHOST_ROUTES } from "@/features/webhost/lib/webhostPaths";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

type TowerStats = {
  organizations: number;
  users: number;
  ownSessions: number | null;
  sessionsUnavailable: boolean;
  revenueMtd: number;
  transactions: number;
  properties: number;
  pendingSubscriptions: number;
};

type SecuritySlice = {
  authEvents: number;
  failedLogins: number;
  permissionEvents: number;
  alerts: number;
};

function probeClass(status: ProbeStatus) {
  if (status === "healthy") return "text-success";
  if (status === "degraded") return "text-warning";
  if (status === "unhealthy") return "text-destructive";
  return "text-muted-foreground";
}

function probeLabel(status: ProbeStatus) {
  if (status === "healthy") return "Healthy";
  if (status === "degraded") return "Degraded";
  if (status === "unhealthy") return "Unhealthy";
  return "Not probed";
}

export default function AdminDashboard() {
  const { data: probes = [], isLoading: healthLoading } = useAdminHealthProbes();

  const { data: stats, isLoading: statsLoading } = useQuery<TowerStats>({
    queryKey: ["platform-admin-tower-stats"],
    queryFn: async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
      const [
        managers,
        agencies,
        webhosts,
        landlords,
        submanagers,
        paidMtd,
        invoices,
        properties,
        pendingInvoices,
        sessions,
      ] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "manager"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "agency"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "webhost"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "landlord"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "submanager"),
        supabase.from("manager_invoices").select("amount").eq("status", "paid").gte("paid_date", startOfMonth),
        supabase.from("manager_invoices").select("id", { count: "exact", head: true }),
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("manager_invoices").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("user_sessions").select("id", { count: "exact", head: true }),
      ]);

      const users =
        (webhosts.count ?? 0) +
        (managers.count ?? 0) +
        (agencies.count ?? 0) +
        (landlords.count ?? 0) +
        (submanagers.count ?? 0);

      const sessionsUnavailable = Boolean(sessions.error);
      const ownSessions = sessionsUnavailable ? null : (sessions.count ?? 0);

      const revenueMtd = ((paidMtd.data ?? []) as { amount: number | null }[]).reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0,
      );

      return {
        organizations: (managers.count ?? 0) + (agencies.count ?? 0),
        users,
        ownSessions,
        sessionsUnavailable,
        revenueMtd,
        transactions: invoices.count ?? 0,
        properties: properties.count ?? 0,
        pendingSubscriptions: pendingInvoices.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  const { data: security, isLoading: securityLoading } = useQuery<SecuritySlice>({
    queryKey: ["platform-admin-security-slice"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("action, entity_type")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as { action: string; entity_type: string | null }[];
      return groupSecurityEvents(rows).counts;
    },
    staleTime: 30_000,
  });

  return (
    <WebhostLayout
      title="Platform control tower"
      description="Organizations, users, subscriptions, and security — without tenant records."
    >
      <div className="space-y-8">
        <section>
          <h2 className="section-title mb-3">Platform</h2>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
            {[
              { label: "Organizations", value: statsLoading ? "…" : String(stats?.organizations ?? 0), href: WEBHOST_ROUTES.organizations },
              { label: "Users", value: statsLoading ? "…" : String(stats?.users ?? 0), href: WEBHOST_ROUTES.users },
              {
                label: "Active sessions",
                value: statsLoading
                  ? "…"
                  : stats?.sessionsUnavailable
                    ? "Not available"
                    : String(stats?.ownSessions ?? 0),
                note: stats?.sessionsUnavailable
                  ? "Platform-wide session count is not exposed"
                  : "Your sessions only",
                href: WEBHOST_ROUTES.security,
              },
              { label: "Revenue", value: statsLoading ? "…" : fmt(stats?.revenueMtd ?? 0), note: "Paid this month", href: WEBHOST_ROUTES.subscriptions },
              { label: "Transactions", value: statsLoading ? "…" : String(stats?.transactions ?? 0), note: "Manager invoices", href: WEBHOST_ROUTES.subscriptions },
            ].map((item) => (
              <Link key={item.label} to={item.href} className="bg-card p-4 hover:bg-muted/40">
                <p className="type-label">{item.label}</p>
                <p className="mt-1 font-heading text-xl font-semibold">{item.value}</p>
                {"note" in item && item.note ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.note}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-title mb-3">System health</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {healthLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              : probes.map((probe) => (
                  <div key={probe.id} className="rounded-xl border border-border bg-card p-4">
                    <p className="type-label">{probe.label}</p>
                    <p className={cn("mt-1 text-sm font-semibold", probeClass(probe.status))}>{probeLabel(probe.status)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{probe.detail}</p>
                  </div>
                ))}
          </div>
        </section>

        <section>
          <h2 className="section-title mb-3">Security</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Authentication events", value: security?.authEvents ?? 0, href: WEBHOST_ROUTES.security },
              { label: "Failed logins", value: security?.failedLogins ?? 0, href: WEBHOST_ROUTES.security },
              { label: "Permission events", value: security?.permissionEvents ?? 0, href: WEBHOST_ROUTES.audit },
              { label: "Alerts", value: security?.alerts ?? 0, href: WEBHOST_OPS_ROUTES.issues },
            ].map((item) => (
              <Link key={item.label} to={item.href} className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40">
                <p className="type-label">{item.label}</p>
                <p className="mt-1 font-heading text-lg font-semibold">{securityLoading ? "…" : item.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">From the audit log · last 200 events</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-title mb-3">Business</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link to={WEBHOST_ROUTES.organizations} className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40">
              <p className="type-label flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Organizations</p>
              <p className="mt-1 font-heading text-lg font-semibold">{statsLoading ? "…" : stats?.organizations ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Manager and agency accounts</p>
            </Link>
            <Link to={WEBHOST_ROUTES.subscriptions} className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40">
              <p className="type-label flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Subscriptions</p>
              <p className="mt-1 font-heading text-lg font-semibold">{statsLoading ? "…" : stats?.pendingSubscriptions ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Pending manager invoices</p>
            </Link>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="type-label flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Usage</p>
              <p className="mt-1 font-heading text-lg font-semibold">{statsLoading ? "…" : stats?.properties ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Properties on the platform · tenant records stay blocked</p>
            </div>
          </div>
        </section>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Tenant identities, rent, and leases are not available on this desk.
        </p>
      </div>
    </WebhostLayout>
  );
}
