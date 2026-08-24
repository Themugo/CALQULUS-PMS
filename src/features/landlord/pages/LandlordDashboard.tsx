import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, Building2, TriangleAlert, Wrench } from "lucide-react";
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
import {
  LANDLORD_TREND_COLORS,
  arrearsTone,
  attentionToneClass,
  buildAttentionItems,
  collectionRate,
  netShare,
} from "@/features/landlord/lib/portfolioMetrics";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { ErrorState } from "@/shared/components/ui/error-state";
import { occupancyRateColor, payoutStatusTone, statusBadgeClass } from "@/shared/lib/statusBadge";

export default function LandlordDashboard() {
  const { portfolio, properties, isLoading, isError, refetch } = useLandlordPortfolio();
  const { payouts, isLoading: payoutsLoading } = useLandlordPayouts();
  const trendQuery = useLandlordIncomeTrend(properties);
  const pendingPayouts = payouts.filter((p) => p.status === "pending").length;
  const recentPayouts = payouts.slice(0, 6);

  const rate = collectionRate(portfolio.totalCollectedRent, portfolio.totalExpectedRent);
  const attention = buildAttentionItems(portfolio, pendingPayouts, LANDLORD_ROUTES, formatKes);

  const strip: Array<{ label: string; value: string; href: string; className?: string }> = [
    { label: "Properties", value: String(portfolio.totalProperties), href: LANDLORD_ROUTES.portfolio },
    { label: "Units", value: `${portfolio.totalOccupied}/${portfolio.totalUnits} occupied`, href: LANDLORD_ROUTES.portfolio },
    { label: "Occupancy", value: `${portfolio.occupancyRate}%`, href: LANDLORD_ROUTES.portfolio, className: occupancyRateColor(portfolio.occupancyRate) },
    { label: "Collection rate", value: `${rate}%`, href: LANDLORD_ROUTES.financials },
    {
      label: "Outstanding",
      value: formatKes(portfolio.totalArrears),
      href: LANDLORD_ROUTES.statements,
      className: arrearsTone(portfolio.totalArrears) === "destructive" ? "text-destructive" : undefined,
    },
    { label: "Net to you", value: formatKes(portfolio.netLandlordShareMTD), href: LANDLORD_ROUTES.financials },
  ];

  return (
    <LandlordLayout
      title="How is my property portfolio performing?"
      description="Collected is rent received this month. Outstanding is uncollected arrears. Net is your share after the revenue split. Tenant names stay with your manager."
      actions={<LandlordPayoutDialog properties={properties} />}
    >
      {isError ? (
        <ErrorState title="Couldn't load your portfolio" onRetry={() => void refetch()} className="mb-6" />
      ) : null}

      {/* Portfolio summary — deep navy band is chrome, never a page fill */}
      <section
        aria-label="Portfolio summary"
        className="overflow-hidden rounded-xl border border-navy-primary/20 bg-navy-primary text-white"
      >
        <div className="h-0.5 w-full bg-[var(--portal-accent)]" aria-hidden />
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {isLoading ? (
            <Skeleton className="h-14 w-full bg-white/10" />
          ) : (
            <>
              <div className="min-w-0">
                <p className="font-heading text-base font-semibold">Your portfolio</p>
                <p className="mt-0.5 text-xs text-white/70">
                  {portfolio.totalProperties} {portfolio.totalProperties === 1 ? "property" : "properties"} ·{" "}
                  {portfolio.totalUnits} units · {portfolio.totalOccupied} occupied
                </p>
                <div className="mt-3 max-w-xs">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>Collected this month</span>
                    <span className="tabular-nums text-white/90">
                      {formatKes(portfolio.totalCollectedRent)} of {formatKes(portfolio.totalExpectedRent)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[var(--portal-accent)]"
                      style={{ width: `${rate}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--portal-accent)]">Net to you this month</p>
                <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
                  {formatKes(portfolio.netLandlordShareMTD)}
                </p>
                <p className="mt-0.5 text-xs text-white/60">After the revenue split on collected rent</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Portfolio facts — one bordered strip, not manager-style stat cards */}
      <section aria-label="Portfolio totals" className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <dl className="grid grid-cols-2 divide-x divide-border sm:grid-cols-3 lg:grid-cols-6">
            {strip.map((stat) => (
              <Link key={stat.label} to={stat.href} className="px-4 py-3 transition-colors hover:bg-muted/40">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
                <dd className={`mt-0.5 font-heading text-lg font-semibold tabular-nums ${stat.className ?? ""}`}>
                  {stat.value}
                </dd>
              </Link>
            ))}
          </dl>
        )}
      </section>

      {attention.length > 0 && !isLoading ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Needs attention</h2>
            <span className="meta-text">{attention.length} items</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {attention.map((item) => (
              <Link key={item.label} to={item.href} className={`rounded-lg border p-3 text-left ${attentionToneClass(item.tone)}`}>
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
            <h2 className="section-title">Income &amp; collection trend</h2>
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
            <div className="chart-frame h-[220px]">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendQuery.data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip formatter={(v) => formatKes(Number(v ?? 0))} />
                  <Bar dataKey="collected" name="Collected" fill={LANDLORD_TREND_COLORS.collected} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="net" name="Net to you" fill={LANDLORD_TREND_COLORS.net} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
                    <p className="text-sm font-semibold tabular-nums">{formatKes(payout.amount)}</p>
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
                      <TableCell className={`text-right tabular-nums ${arrearsTone(prop.outstandingArrears) === "destructive" ? "text-destructive" : ""}`}>
                        {formatKes(prop.outstandingArrears)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatKes(netShare(prop.collectedRent, prop.revenue_share_pct))}
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
