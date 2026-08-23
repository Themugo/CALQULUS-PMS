import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Globe,
  RefreshCw,
  Server,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WebhostLayout from "@/features/webhost/components/WebhostLayout";
import { useAdminHealthProbes, type ComponentProbe } from "@/features/webhost/hooks/useAdminHealthProbes";
import {
  INFRA_STATUS,
  countProbed,
  deriveSystemStatus,
  getApplicationFacts,
  probeToInfraStatus,
  type InfraStatus,
} from "@/features/webhost/lib/infrastructure";
import { groupSecurityEvents, withoutTenantEntities } from "@/features/webhost/lib/adminSecurity";
import { WEBHOST_OPS_ROUTES, WEBHOST_ROUTES } from "@/features/webhost/lib/webhostPaths";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

type ActivityRow = {
  id: string;
  action: string;
  actor_email: string | null;
  actor_role: string | null;
  entity_type: string | null;
  entity_label: string | null;
  created_at: string;
};

type UsersSlice = {
  managers: number;
  agencies: number;
  webhosts: number;
  landlords: number;
  submanagers: number;
  failedLogins: number;
  permissionEvents: number;
};

const timeFmt = new Intl.DateTimeFormat("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const dayFmt = new Intl.DateTimeFormat("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

function StatusIcon({ status, className }: { status: InfraStatus; className?: string }) {
  const cls = cn("h-3.5 w-3.5", INFRA_STATUS[status].text, className);
  if (status === "operational") return <CheckCircle2 className={cls} />;
  if (status === "down") return <XCircle className={cls} />;
  if (status === "degraded") return <AlertTriangle className={cls} />;
  return <CircleAlert className={cls} />;
}

function StatusCell({ status }: { status: InfraStatus }) {
  const meta = INFRA_STATUS[status];
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={cn("h-2 w-2 rounded-full", meta.dot)} />
      <StatusIcon status={status} />
      <span className={cn("text-xs font-semibold", meta.text)}>{meta.label}</span>
    </span>
  );
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</h2>
      {aside}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: probes = [], isLoading: healthLoading, dataUpdatedAt, refetch, isRefetching } = useAdminHealthProbes();
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  const app = useMemo(
    () =>
      getApplicationFacts(
        { PROD: import.meta.env.PROD, VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string | undefined },
        window.location,
      ),
    [],
  );

  const systemStatus = deriveSystemStatus(probes);
  const probedCount = countProbed(probes);
  const lastProbe = refreshedAt ?? (dataUpdatedAt || null);

  const { data: users, isLoading: usersLoading } = useQuery<UsersSlice>({
    queryKey: ["platform-admin-infra-users"],
    queryFn: async () => {
      const [managers, agencies, webhosts, landlords, submanagers, securityRows] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "manager"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "agency"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "webhost"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "landlord"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "submanager"),
        supabase.from("activity_logs").select("action, entity_type").order("created_at", { ascending: false }).limit(200),
      ]);
      const counts = securityRows.error
        ? { failedLogins: 0, permissionEvents: 0 }
        : groupSecurityEvents((securityRows.data ?? []) as { action: string; entity_type: string | null }[]).counts;
      return {
        managers: managers.count ?? 0,
        agencies: agencies.count ?? 0,
        webhosts: webhosts.count ?? 0,
        landlords: landlords.count ?? 0,
        submanagers: submanagers.count ?? 0,
        failedLogins: counts.failedLogins,
        permissionEvents: counts.permissionEvents,
      };
    },
    staleTime: 30_000,
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<ActivityRow[]>({
    queryKey: ["platform-admin-infra-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, actor_email, actor_role, entity_type, entity_label, created_at")
        .or("action.like.error:%,action.like.warning:%")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return withoutTenantEntities((data ?? []) as ActivityRow[]);
    },
    staleTime: 30_000,
  });

  const { data: activity = [], isLoading: activityLoading } = useQuery<ActivityRow[]>({
    queryKey: ["platform-admin-infra-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, actor_email, actor_role, entity_type, entity_label, created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return withoutTenantEntities((data ?? []) as ActivityRow[]).slice(0, 8);
    },
    staleTime: 30_000,
  });

  const statStrip: { label: string; value: string; href?: string }[] = [
    { label: "Applications", value: "1" },
    { label: "Domains", value: "1" },
    { label: "Environments", value: "1" },
    { label: "Services", value: healthLoading ? "…" : `${probedCount.probed}/${probedCount.total} probed` },
    {
      label: "Users",
      value: usersLoading
        ? "…"
        : String((users?.managers ?? 0) + (users?.agencies ?? 0) + (users?.webhosts ?? 0) + (users?.landlords ?? 0) + (users?.submanagers ?? 0)),
      href: WEBHOST_ROUTES.users,
    },
  ];

  return (
    <WebhostLayout
      title="Infrastructure control center"
      description="Platform services, application runtime, and access — without tenant records."
    >
      <div className="space-y-6">
        {/* System status band — deep navy is chrome, never a page fill */}
        <section
          aria-label="System status"
          className="overflow-hidden rounded-xl border border-navy-primary/20 bg-navy-primary text-white"
        >
          <div className="h-0.5 w-full bg-[var(--portal-accent)]" aria-hidden />
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-3">
              <span aria-hidden className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", INFRA_STATUS[systemStatus].dot)} />
              <div>
                <p className="flex items-center gap-2 font-heading text-base font-semibold">
                  <StatusIcon status={systemStatus} className="h-4 w-4" />
                  {healthLoading ? "Probing services…" : `System ${INFRA_STATUS[systemStatus].label.toLowerCase()}`}
                </p>
                <p className="mt-0.5 text-xs text-white/70">
                  {healthLoading
                    ? "Checking database, API, and storage"
                    : `${probedCount.probed} of ${probedCount.total} services reporting · ${app.name} ${app.version} · ${app.environment}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Globe className="h-3.5 w-3.5" />
                {app.domain}
                <span className="text-white/45">· {app.protocol}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  void refetch().then(() => setRefreshedAt(Date.now()));
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/20 px-2.5 font-medium text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
                Probe now
              </button>
            </div>
          </div>
          <p className="border-t border-white/10 px-4 py-2 text-[11px] text-white/50 sm:px-5">
            {lastProbe ? `Last probe ${timeFmt.format(lastProbe)} · refreshes every 60s` : "Awaiting first probe"}
            {" · "}Deployments, servers, DNS, and certificates are not instrumented on this desk.
          </p>
        </section>

        {/* Compact stat strip — one bordered row, not cards */}
        <section aria-label="Infrastructure totals" className="overflow-hidden rounded-xl border border-border bg-card">
          <dl className="grid grid-cols-2 divide-x divide-border sm:grid-cols-5">
            {statStrip.map((stat) => {
              const body = (
                <>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums">{stat.value}</dd>
                </>
              );
              return stat.href ? (
                <Link key={stat.label} to={stat.href} className="px-4 py-3 transition-colors hover:bg-muted/40">
                  {body}
                </Link>
              ) : (
                <div key={stat.label} className="px-4 py-3">
                  {body}
                </div>
              );
            })}
          </dl>
        </section>

        {/* Service health */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <SectionTitle
            aside={
              <span className="text-[11px] text-muted-foreground">
                Live probes · <span className="font-mono">60s</span> interval
              </span>
            }
          >
            Service health
          </SectionTitle>
          {healthLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-md" />
              ))}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Service</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Latency</th>
                  <th className="hidden px-4 py-2 font-medium md:table-cell">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {probes.map((probe: ComponentProbe) => {
                  const status = probeToInfraStatus(probe.status);
                  return (
                    <tr key={probe.id} className="align-middle">
                      <td className="px-4 py-2.5 text-xs font-semibold">{probe.label}</td>
                      <td className="px-4 py-2.5">
                        <StatusCell status={status} />
                      </td>
                      <td className="hidden px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">
                        {typeof probe.latencyMs === "number" ? `${Math.round(probe.latencyMs)}ms` : "—"}
                      </td>
                      <td className="hidden max-w-0 truncate px-4 py-2.5 text-xs text-muted-foreground md:table-cell">
                        {probe.detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Applications */}
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <SectionTitle
              aside={<Server className="h-3.5 w-3.5 text-[var(--portal-accent)]" aria-hidden />}
            >
              Applications
            </SectionTitle>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Application</th>
                  <th className="px-4 py-2 font-medium">Environment</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Domain</th>
                  <th className="px-4 py-2 font-medium">Backend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="align-middle">
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-semibold">{app.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">v{app.version}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span aria-hidden className={cn("h-2 w-2 rounded-full", app.environment === "production" ? "bg-success" : "bg-warning")} />
                      {app.environment}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2.5 font-mono text-xs text-muted-foreground sm:table-cell">
                    {app.domain} · {app.protocol}
                  </td>
                  <td className="max-w-0 truncate px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {app.backendProject}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              One deployed application. Edge functions report through the API probe above.
            </p>
          </section>

          {/* Alerts */}
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <SectionTitle
              aside={
                <Link
                  to={WEBHOST_OPS_ROUTES.issues}
                  className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
                >
                  All issues <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              Alerts
            </SectionTitle>
            {alertsLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded-md" />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                No error or warning events in the audit log.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  {alerts.map((row) => {
                    const severity: InfraStatus = row.action.startsWith("error:") ? "down" : "warning";
                    return (
                      <tr key={row.id} className="align-middle">
                        <td className="w-28 px-4 py-2.5">
                          <StatusCell status={severity} />
                        </td>
                        <td className="max-w-0 truncate px-4 py-2.5 text-xs">
                          {row.action.replace(/^error:/, "").replace(/^warning:/, "")}
                          {row.entity_label ? <span className="text-muted-foreground"> · {row.entity_label}</span> : null}
                        </td>
                        <td className="w-32 px-4 py-2.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                          {dayFmt.format(new Date(row.created_at))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {!usersLoading && users ? (
              <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
                {users.failedLogins} failed logins · {users.permissionEvents} permission events · last 200 audit rows
                {" · "}
                <Link to={WEBHOST_ROUTES.security} className="font-medium text-primary hover:underline">
                  Security
                </Link>
              </p>
            ) : null}
          </section>
        </div>

        {/* Infrastructure activity */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <SectionTitle
            aside={
              <Link
                to={WEBHOST_ROUTES.audit}
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
              >
                Audit log <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            Infrastructure activity
          </SectionTitle>
          {activityLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-md" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">No recorded activity yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Actor</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="hidden px-4 py-2 font-medium md:table-cell">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activity.map((row) => (
                  <tr key={row.id} className="align-middle">
                    <td className="w-32 px-4 py-2.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {dayFmt.format(new Date(row.created_at))}
                    </td>
                    <td className="hidden max-w-0 truncate px-4 py-2.5 text-xs sm:table-cell">
                      {row.actor_email ?? "system"}
                      {row.actor_role ? <span className="text-muted-foreground"> · {row.actor_role}</span> : null}
                    </td>
                    <td className="max-w-0 truncate px-4 py-2.5 font-mono text-xs">{row.action}</td>
                    <td className="hidden max-w-0 truncate px-4 py-2.5 text-xs text-muted-foreground md:table-cell">
                      {row.entity_label ?? row.entity_type ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Users & access */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <SectionTitle
            aside={
              <Link
                to={WEBHOST_ROUTES.users}
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
              >
                Manage <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            Users & access
          </SectionTitle>
          <dl className="grid grid-cols-3 divide-x divide-border sm:grid-cols-6">
            {[
              { label: "Managers", value: users?.managers },
              { label: "Agencies", value: users?.agencies },
              { label: "Webhosts", value: users?.webhosts },
              { label: "Landlords", value: users?.landlords },
              { label: "Submanagers", value: users?.submanagers },
              { label: "Failed logins", value: users?.failedLogins },
            ].map((item) => (
              <div key={item.label} className="px-4 py-3">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</dt>
                <dd className="mt-0.5 font-heading text-base font-semibold tabular-nums">
                  {usersLoading ? "…" : (item.value ?? 0)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--portal-accent)]" />
          Tenant identities, rent, and leases are not available on this desk. Deployments, servers, and DNS are
          managed outside CALQULUS and are not shown here.
        </p>
      </div>
    </WebhostLayout>
  );
}
