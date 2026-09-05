import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  DoorOpen,
  FileChartColumn,
  FileText,
  Gauge,
  Handshake,
  Home,
  UserPlus,
  Wrench,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AgencyLayout from "@/features/agency/components/AgencyLayout";
import { useAgencyPortfolio } from "@/features/agency/lib/useAgencyPortfolio";
import { AGENCY_OPS_ROUTES, AGENCY_ROUTES, agencyClientPath, agencyPropertyPath } from "@/features/agency/lib/agencyPaths";
import {
  AGENCY_TREND_COLORS,
  agencyClientStatus,
  agencyClientStatusChipClass,
  agencyClientStatusLabel,
  agencyCollectionRate,
  buildAgencyAttentionItems,
} from "@/features/agency/lib/agencyPortfolio";
import { AGENCY_CARD } from "@/features/agency/theme";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import ManagerActivityLog from "@/features/dashboard/components/ManagerActivityLog";
import { DashboardSectionHeader } from "@/features/dashboard/components/DashboardSectionHeader";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { formatKes } from "@/features/landlord/lib/formatKes";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/ui/error-state";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { occupancyRateColor } from "@/shared/lib/statusBadge";
import { cn } from "@/shared/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const ATTENTION_ICON: Record<string, typeof CreditCard> = {
  Arrears: CreditCard,
  Leases: FileText,
  "Unlinked buildings": Building2,
};

const KPI_META = [
  { key: "clients", label: "Clients", icon: Handshake },
  { key: "properties", label: "Properties", icon: Building2 },
  { key: "units", label: "Units", icon: DoorOpen },
  { key: "occupancy", label: "Occupancy", icon: Home },
  { key: "collections", label: "Collections", icon: CreditCard },
] as const;

export default function AgencyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useAgencyPortfolio();

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const attention = data
    ? buildAgencyAttentionItems({
        outstanding: data.outstanding,
        overdueInvoices: data.overdueInvoices,
        expiringLeases: data.expiringLeases,
        unlinkedCount: data.unlinkedCount,
        formatAmount: formatKes,
        hrefs: {
          billing: data.overdueInvoices > 0 ? `${AGENCY_ROUTES.billing}?filter=overdue` : AGENCY_ROUTES.billing,
          leases: AGENCY_OPS_ROUTES.leases,
          clients: AGENCY_ROUTES.clients,
        },
      })
    : [];

  const { data: openMaintenance = 0 } = useQuery({
    queryKey: ["agency-dashboard-open-maintenance", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("maintenance_requests")
        .select("id", { count: "exact", head: true })
        .eq("manager_id", user!.id)
        .in("status", ["open", "pending", "in_progress"]);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const hasNothingToShow = !isLoading && data && data.clientCount === 0 && data.totalProperties === 0;
  const hasSeriesActivity = (data?.series ?? []).some((point) => point.paid > 0 || point.pending > 0);
  const attentionCount = attention.length + (openMaintenance > 0 ? 1 : 0);
  const collectionRate = data ? agencyCollectionRate(data.collectedMtd, data.outstanding) : 0;
  const linkageRate = data && data.totalProperties > 0
    ? Math.round(((data.totalProperties - data.unlinkedCount) / data.totalProperties) * 100)
    : 100;

  return (
    <AgencyLayout
      title="Executive command centre"
      description="A live view of your client book, portfolio health, collections and operational exceptions."
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="hidden rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground sm:inline-flex">
            Today · {dateLabel}
          </span>
          <Button size="sm" asChild>
            <Link to={AGENCY_ROUTES.clients}>
              <Handshake className="h-4 w-4" aria-hidden />
              Add client
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to={AGENCY_ROUTES.reports}>
              <BarChart3 className="h-4 w-4" aria-hidden />
              Reports
            </Link>
          </Button>
        </div>
      }
    >
      {isError ? <ErrorState title="Couldn't load the agency book" onRetry={() => void refetch()} className="mb-5" /> : null}

      {hasNothingToShow ? (
        <section aria-label="Agency setup progress" className="mb-5 rounded-xl border border-[var(--portal-accent-border)] bg-[var(--portal-accent-surface)] p-4 sm:flex sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
              <Handshake className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Agency setup</p>
              <h2 className="mt-0.5 text-base font-semibold text-foreground">Build the first version of your agency book</h2>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Set the profile, link a landlord and add the first building to unlock portfolio intelligence.</p>
            </div>
          </div>
          <Button size="sm" className="mt-3 min-h-10 shrink-0 sm:mt-0" asChild>
            <Link to="/agency/onboarding">Continue setup<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
          </Button>
        </section>
      ) : null}

      <section className="mb-5 min-w-0" aria-labelledby="agency-kpi-title">
        <DashboardSectionHeader
          id="agency-kpi-title"
          eyebrow="Agency health"
          title="Portfolio at a glance"
          description="Live totals from your agency portfolio"
          className="mb-3"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {isLoading || !data
            ? KPI_META.map(({ key }) => <Skeleton key={key} className="h-[112px] rounded-xl" />)
            : (
              <>
                {[
                  <StatCard key="clients" compact title="Clients" value={String(data.clientCount)} change={data.unlinkedCount > 0 ? `${data.unlinkedCount} unlinked` : "All properties linked"} changeType={data.unlinkedCount > 0 ? "negative" : "neutral"} icon={Handshake} iconColor="primary" />,
                  <StatCard key="properties" compact title="Properties" value={String(data.totalProperties)} change="Buildings on the book" changeType="neutral" icon={Building2} iconColor="primary" />,
                  <StatCard key="units" compact title="Units" value={String(data.totalUnits)} change={`${data.totalOccupied} occupied`} changeType="neutral" icon={DoorOpen} iconColor="primary" />,
                  <StatCard key="occupancy" compact title="Occupancy" value={`${data.occupancyRate}%`} change={data.totalUnits > 0 ? `${Math.max(0, data.totalUnits - data.totalOccupied)} vacant` : "No units yet"} changeType={data.occupancyRate >= 70 ? "neutral" : "negative"} icon={Home} iconColor={data.occupancyRate >= 70 ? "primary" : "warning"} progressValue={data.occupancyRate} />,
                  <StatCard key="collections" compact title="Collections" value={formatKes(data.collectedMtd)} change={`${collectionRate}% collection rate`} changeType={collectionRate >= 80 ? "positive" : "neutral"} icon={CreditCard} iconColor="primary" />,
                ]}
              </>
            )}
        </div>
      </section>

      <div className="mb-5 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
        <section className={cn(AGENCY_CARD.panel, "xl:col-span-8")} aria-labelledby="agency-performance-title">
          <div className="flex items-start justify-between gap-4">
            <DashboardSectionHeader id="agency-performance-title" eyebrow="Performance" title="Collections trend" description="Collected versus outstanding over the last six months" className="mb-0" />
            <div className="hidden shrink-0 rounded-lg border border-[var(--portal-accent-border)] bg-[var(--portal-accent-surface)] px-3 py-2 text-right sm:block">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-primary">Collection rate</p>
              <p className="mt-0.5 font-heading text-lg font-semibold text-foreground">{collectionRate}%</p>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="mt-4 h-[224px] w-full rounded-lg" />
          ) : !hasSeriesActivity ? (
            <EmptyState icon={CreditCard} title="No billing activity yet" description="Once invoices are raised and collected, your six-month performance trend will appear here." className="mt-4 min-h-[224px] py-8" />
          ) : (
            <div className="chart-frame mt-4 h-[224px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.series ?? []} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={fmtCompact} width={42} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, boxShadow: "0 10px 24px rgba(16,42,67,.10)" }}
                    formatter={(value, name) => [formatKes(Number(value ?? 0)), name === "paid" ? "Collected" : "Outstanding"]}
                  />
                  <Area type="monotone" dataKey="paid" stroke={AGENCY_TREND_COLORS.collected} strokeWidth={2.2} fill="transparent" />
                  <Area type="monotone" dataKey="pending" stroke={AGENCY_TREND_COLORS.outstanding} strokeWidth={2.2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: AGENCY_TREND_COLORS.collected }} />Collected</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: AGENCY_TREND_COLORS.outstanding }} />Outstanding</span>
            <span className="ml-auto hidden items-center gap-1.5 sm:inline-flex"><Gauge className="h-3.5 w-3.5 text-primary" />{linkageRate}% client/property linkage</span>
          </div>
        </section>

        <section className={cn(AGENCY_CARD.panel, "xl:col-span-4")} aria-labelledby="agency-snapshot-title">
          <DashboardSectionHeader id="agency-snapshot-title" eyebrow="Health signals" title="Portfolio snapshot" className="mb-2" />
          <div className="space-y-0.5">
            {[
              { label: "Properties", value: data ? String(data.totalProperties) : "—" },
              { label: "Units", value: data ? String(data.totalUnits) : "—" },
              { label: "Occupied", value: data ? `${data.totalOccupied}/${data.totalUnits}` : "—" },
              { label: "Collected", value: data ? formatKes(data.collectedMtd) : "—" },
              { label: "Outstanding", value: data ? formatKes(data.outstanding) : "—", attention: Boolean(data?.outstanding) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className={cn("text-sm font-semibold tabular-nums", row.attention ? "text-destructive" : "text-foreground")}>{row.value}</span>
              </div>
            ))}
          </div>
          {data ? (
            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground"><span>Client / property linkage</span><span className="text-foreground">{linkageRate}%</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${linkageRate}%` }} /></div>
            </div>
          ) : null}
        </section>
      </div>

      <section className="mb-5 min-w-0" aria-labelledby="agency-attention-title">
        <DashboardSectionHeader id="agency-attention-title" eyebrow="Action queue" title="Needs attention" description="Prioritized items requiring a decision or follow-up" className="mb-3" />
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : attentionCount === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 card-shadow"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-text)]"><CheckCircle2 className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-foreground">All caught up</p><p className="text-xs text-muted-foreground">No arrears, expiring leases, unlinked buildings or open maintenance require attention.</p></div></div></div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {attention.map((item) => {
              const Icon = ATTENTION_ICON[item.label] ?? AlertTriangle;
              return (
                <Link key={item.label} to={item.href} className="group min-w-0 rounded-xl border border-border bg-card p-4 shadow-[0_5px_16px_rgba(16,42,67,0.05)] transition hover:-translate-y-0.5 hover:border-[var(--portal-accent-border)] hover:shadow-[0_10px_24px_rgba(16,42,67,0.09)]">
                  <div className="flex items-start justify-between gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--portal-accent-surface)] text-primary"><Icon className="h-4 w-4" aria-hidden /></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" /></div>
                  <p className="mt-3 truncate text-base font-semibold text-foreground">{item.value}</p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-primary">{item.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-4.5 text-muted-foreground">{item.detail}</p>
                </Link>
              );
            })}
            {openMaintenance > 0 ? (
              <Link to={AGENCY_OPS_ROUTES.maintenance} className="group min-w-0 rounded-xl border border-border bg-card p-4 shadow-[0_5px_16px_rgba(16,42,67,0.05)] transition hover:-translate-y-0.5 hover:border-[var(--portal-accent-border)] hover:shadow-[0_10px_24px_rgba(16,42,67,0.09)]">
                <div className="flex items-start justify-between gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--portal-accent-surface)] text-primary"><Wrench className="h-4 w-4" /></span><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
                <p className="mt-3 text-base font-semibold text-foreground">{openMaintenance} open</p><p className="mt-0.5 text-[11px] font-semibold text-primary">Maintenance</p><p className="mt-1 text-xs leading-4.5 text-muted-foreground">Requests across your client buildings.</p>
              </Link>
            ) : null}
          </div>
        )}
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <section className={cn(AGENCY_CARD.panel, "min-w-0")} aria-labelledby="agency-clients-title">
          <div className="mb-3 flex items-start justify-between gap-2">
            <DashboardSectionHeader id="agency-clients-title" eyebrow="Client book" title="Client performance" description="Landlord portfolios ranked by collections" className="mb-0" />
            <Button variant="ghost" size="sm" className="shrink-0" asChild><Link to={AGENCY_ROUTES.clients}>View all<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (data?.clients.length ?? 0) === 0 ? (
            <EmptyState icon={Handshake} title="No clients linked yet" description="Link a landlord to a building to begin tracking the client book." actionLabel="Open clients" onAction={() => navigate(AGENCY_ROUTES.clients)} className="min-h-0 py-8" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Client</TableHead><TableHead className="text-right">Occ.</TableHead><TableHead className="text-right">Collected</TableHead><TableHead className="hidden text-right md:table-cell">Outstanding</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                <TableBody>{data!.clients.slice(0, 6).map((client) => { const status = agencyClientStatus(client); return <TableRow key={client.id}>
                  <TableCell className="min-w-[150px]"><Link to={agencyClientPath(client.id)} className="block truncate font-medium text-foreground hover:text-primary hover:underline">{client.name}</Link><p className="text-[10px] text-muted-foreground">{client.propertyCount} propert{client.propertyCount === 1 ? "y" : "ies"}</p></TableCell>
                  <TableCell className={cn("text-right text-sm font-medium", occupancyRateColor(client.occupancyRate))}>{client.occupancyRate}%</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{formatKes(client.collectedMtd)}</TableCell>
                  <TableCell className={cn("hidden text-right text-sm tabular-nums md:table-cell", client.outstanding > 0 ? "text-destructive" : "text-muted-foreground")}>{formatKes(client.outstanding)}</TableCell>
                  <TableCell className="text-right"><span className={cn("inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold", agencyClientStatusChipClass(status))}>{agencyClientStatusLabel(status)}</span></TableCell>
                </TableRow>; })}</TableBody>
              </Table>
            </div>
          )}
        </section>

        <section className={cn(AGENCY_CARD.panel, "min-w-0")} aria-labelledby="agency-properties-title">
          <div className="mb-3 flex items-start justify-between gap-2"><DashboardSectionHeader id="agency-properties-title" eyebrow="Portfolio detail" title="Property performance" description="Buildings ranked by occupancy and collections" className="mb-0" /><Button variant="ghost" size="sm" className="shrink-0" asChild><Link to={AGENCY_ROUTES.portfolio}>Portfolio<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button></div>
          {isLoading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (data?.properties.length ?? 0) === 0 ? <EmptyState icon={Building2} title="No buildings on the book yet" description="Add a property to start tracking occupancy and collections." actionLabel="Add property" onAction={() => navigate(AGENCY_OPS_ROUTES.buildings)} className="min-h-0 py-8" /> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Property</TableHead><TableHead className="text-right">Occ.</TableHead><TableHead className="text-right">Collected</TableHead><TableHead className="hidden text-right md:table-cell">Outstanding</TableHead></TableRow></TableHeader><TableBody>{data!.properties.slice(0, 6).map((property) => <TableRow key={property.id}><TableCell className="min-w-[170px]"><Link to={agencyPropertyPath(property.id)} className="block truncate font-medium text-foreground hover:text-primary hover:underline">{property.name}</Link><p className="truncate text-[10px] text-muted-foreground">{property.clientName}</p></TableCell><TableCell className={cn("text-right text-sm font-medium", occupancyRateColor(property.occupancyRate))}>{property.occupancyRate}%</TableCell><TableCell className="text-right text-sm font-medium tabular-nums">{formatKes(property.collectedMtd)}</TableCell><TableCell className={cn("hidden text-right text-sm tabular-nums md:table-cell", property.outstanding > 0 ? "text-destructive" : "text-muted-foreground")}>{formatKes(property.outstanding)}</TableCell></TableRow>)}</TableBody></Table></div>}
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-border bg-card p-4 card-shadow" aria-labelledby="agency-actions-title">
        <div className="flex flex-col gap-3 md:flex-row md:items-center"><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Work faster</p><h2 id="agency-actions-title" className="mt-0.5 text-sm font-semibold text-foreground">Quick actions</h2><p className="mt-0.5 text-xs text-muted-foreground">Jump directly into the workflows you use most.</p></div><div className="flex min-w-0 flex-wrap gap-2">
          {[
            [Handshake, "Add client", AGENCY_ROUTES.clients],
            [Building2, "Add property", AGENCY_OPS_ROUTES.buildings],
            [UserPlus, "Invite tenant", AGENCY_OPS_ROUTES.invites],
            [CreditCard, "Create billing", AGENCY_ROUTES.billing],
            [FileChartColumn, "View reports", AGENCY_ROUTES.reports],
          ].map(([Icon, label, href]) => <Button key={label as string} size="sm" variant="outline" className="min-h-10" asChild><Link to={href as string}><Icon className="h-4 w-4" aria-hidden />{label as string}</Link></Button>)}
        </div></div>
      </section>

      <section className={cn(AGENCY_CARD.panel, "mt-4")} aria-labelledby="agency-activity-title">
        <DashboardSectionHeader id="agency-activity-title" eyebrow="Timeline" title="Recent activity" description="The latest activity recorded across your agency workspace" className="mb-2" />
        <ManagerActivityLog compact limit={8} />
      </section>
    </AgencyLayout>
  );
}
