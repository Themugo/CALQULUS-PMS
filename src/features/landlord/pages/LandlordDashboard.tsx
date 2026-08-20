import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Building2,
  PieChart,
  TrendingUp,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import LandlordLayout from "@/features/landlord/components/LandlordLayout";
import { LandlordPayoutDialog } from "@/features/landlord/components/LandlordPayoutDialog";
import { useLandlordPortfolio } from "@/features/landlord/hooks/useLandlordPortfolio";
import { useLandlordIncomeTrend } from "@/features/landlord/hooks/useLandlordOps";
import { useLandlordPayouts } from "@/features/landlord/hooks/useLandlordPayouts";
import { formatKes } from "@/features/landlord/lib/formatKes";
import { LANDLORD_ROUTES, landlordPropertyPath } from "@/features/landlord/lib/landlordPaths";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { ErrorState } from "@/shared/components/ui/error-state";
import { occupancyRateColor, payoutStatusTone, statusBadgeClass } from "@/shared/lib/statusBadge";
import { CALQULUS_COLOR } from "@/shared/theme/tokens";

export default function LandlordDashboard() {
  const { portfolio, properties, isLoading, isError, refetch } = useLandlordPortfolio();
  const { payouts, isLoading: payoutsLoading } = useLandlordPayouts();
  const trendQuery = useLandlordIncomeTrend(properties);
  const pendingPayouts = payouts.filter((p) => p.status === "pending").length;
  const recentPayouts = payouts.slice(0, 6);

  const attention = [
    portfolio.totalArrears > 0
      ? { label: "Outstanding", value: formatKes(portfolio.totalArrears), href: LANDLORD_ROUTES.statements, tone: "destructive" as const }
      : null,
    portfolio.urgentMaintenanceCount > 0 || portfolio.openMaintenanceCount > 0
      ? {
          label: "Maintenance",
          value: portfolio.urgentMaintenanceCount > 0
            ? `${portfolio.urgentMaintenanceCount} urgent`
            : `${portfolio.openMaintenanceCount} open`,
          href: LANDLORD_ROUTES.maintenance,
          tone: "warning" as const,
        }
      : null,
    pendingPayouts > 0
      ? { label: "Payouts", value: `${pendingPayouts} awaiting review`, href: LANDLORD_ROUTES.statements, tone: "warning" as const }
      : null,
    portfolio.expiringLeasesCount > 0
      ? { label: "Leases ending (30d)", value: String(portfolio.expiringLeasesCount), href: LANDLORD_ROUTES.portfolio, tone: "neutral" as const }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <LandlordLayout
      title="How is my property portfolio performing?"
      description="Collected is rent received this month. Outstanding is uncollected arrears. Net is your share after the revenue split. Tenant names stay with your manager."
      actions={<LandlordPayoutDialog properties={properties} />}
    >
      {isError ? (
        <ErrorState title="Couldn't load your portfolio" onRetry={() => void refetch()} className="mb-6" />
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard title="Properties" value={String(portfolio.totalProperties)} change={`${portfolio.totalUnits} units`} icon={Building2} iconColor="neutral" />
            <StatCard title="Units" value={String(portfolio.totalUnits)} change={`${portfolio.totalOccupied} occupied`} icon={Building2} iconColor="neutral" />
            <StatCard
              title="Occupancy"
              value={`${portfolio.occupancyRate}%`}
              change={`${portfolio.totalVacant} vacant`}
              changeType={portfolio.occupancyRate >= 90 ? "positive" : portfolio.occupancyRate >= 70 ? "neutral" : "negative"}
              icon={PieChart}
              iconColor={portfolio.occupancyRate >= 90 ? "success" : "warning"}
              progressValue={portfolio.occupancyRate}
            />
            <StatCard title="Monthly income" value={formatKes(portfolio.totalCollectedRent)} change={`Billed ${formatKes(portfolio.totalExpectedRent)}`} icon={Banknote} iconColor="success" />
            <StatCard
              title="Outstanding"
              value={formatKes(portfolio.totalArrears)}
              change={portfolio.totalArrears > 0 ? "Uncollected arrears" : "No arrears"}
              changeType={portfolio.totalArrears > 0 ? "negative" : "positive"}
              icon={AlertCircle}
              iconColor={portfolio.totalArrears > 0 ? "destructive" : "success"}
            />
            <StatCard title="Net to you" value={formatKes(portfolio.netLandlordShareMTD)} change="Your share this month" changeType="positive" icon={TrendingUp} iconColor="success" />
          </>
        )}
      </div>

      {attention.length > 0 && !isLoading ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Needs attention</h2>
            <span className="meta-text">{attention.length} items</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {attention.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`rounded-lg border p-3 text-left ${
                  item.tone === "destructive"
                    ? "border-destructive/20 bg-destructive/5"
                    : item.tone === "warning"
                      ? "border-warning/20 bg-warning/5"
                      : "border-border bg-muted/20"
                }`}
              >
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`mt-0.5 text-sm font-semibold ${item.tone === "destructive" ? "text-destructive" : ""}`}>{item.value}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  Open <ArrowRight className="h-3 w-3" />
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="rounded-xl border border-border bg-card p-4 xl:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Income trend</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to={LANDLORD_ROUTES.financials}>
                Financials <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          {trendQuery.isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (trendQuery.data?.length ?? 0) === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Income trend appears once collections are recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendQuery.data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip formatter={(v) => formatKes(Number(v ?? 0))} />
                <Bar dataKey="collected" name="Collected" fill={CALQULUS_COLOR.primary} radius={[3, 3, 0, 0]} />
                <Bar dataKey="net" name="Net to you" fill={CALQULUS_COLOR.success} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Recent transactions</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to={LANDLORD_ROUTES.statements}>Statements</Link>
            </Button>
          </div>
          {payoutsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : recentPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Payout requests appear here. Monthly collections are on Statements — unit totals only, no tenant names.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentPayouts.map((payout) => (
                <li key={payout.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{payout.property_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(payout.created_at), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatKes(payout.amount)}</p>
                    <span className={statusBadgeClass(payoutStatusTone(payout.status))}>{payout.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Property performance</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to={LANDLORD_ROUTES.portfolio}>
              Portfolio <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : properties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No properties in your portfolio yet"
            description="Ask your property manager to link buildings to this account. Share the email you used to sign in."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Occupancy</TableHead>
                  <TableHead className="text-right">Monthly income</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Net to you</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((prop) => {
                  const occ = prop.units > 0 ? Math.round((prop.occupied / prop.units) * 100) : 0;
                  return (
                    <TableRow key={prop.id}>
                      <TableCell>
                        <Link to={landlordPropertyPath(prop.id)} className="font-medium text-foreground hover:underline">
                          {prop.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{prop.address}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{prop.units}</TableCell>
                      <TableCell className={`text-right tabular-nums ${occupancyRateColor(occ)}`}>{occ}%</TableCell>
                      <TableCell className="text-right tabular-nums">{formatKes(prop.collectedRent)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${prop.outstandingArrears > 0 ? "text-destructive" : ""}`}>
                        {formatKes(prop.outstandingArrears)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-success">
                        {formatKes((prop.collectedRent * prop.revenue_share_pct) / 100)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {portfolio.activities.length > 0 ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-4">
          <h2 className="section-title mb-3">Portfolio activity</h2>
          <ul className="space-y-2">
            {portfolio.activities.slice(0, 5).map((act) => (
              <li key={act.id} className="flex items-start gap-3">
                {act.type === "maintenance" ? (
                  <Wrench className="mt-0.5 h-4 w-4 text-muted-foreground" />
                ) : (
                  <TriangleAlert className="mt-0.5 h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm">{act.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {act.propertyName ?? "Property"} · {format(new Date(act.timestamp), "dd/MM/yyyy")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </LandlordLayout>
  );
}
