import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
import { AGENCY_OPS_ROUTES, AGENCY_ROUTES } from "@/features/agency/lib/agencyPaths";
import { formatKes } from "@/features/landlord/lib/formatKes";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/ui/error-state";
import { occupancyRateColor } from "@/shared/lib/statusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function AgencyDashboard() {
  const { data, isLoading, isError, refetch } = useAgencyPortfolio();

  const attention = [
    data && data.outstanding > 0
      ? { label: "Arrears", value: formatKes(data.outstanding), detail: `${data.overdueInvoices} overdue invoice${data.overdueInvoices === 1 ? "" : "s"}`, href: AGENCY_ROUTES.billing }
      : null,
    data && data.expiringLeases > 0
      ? { label: "Leases", value: `${data.expiringLeases} expiring`, detail: "Review before they lapse", href: AGENCY_OPS_ROUTES.leases }
      : null,
    data && data.unlinkedCount > 0
      ? { label: "Unlinked buildings", value: `${data.unlinkedCount} without a client`, detail: "Link a landlord to the property", href: AGENCY_ROUTES.clients }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <AgencyLayout
      title="How are our clients and portfolios performing?"
      description="Clients are landlords you run buildings for. Collections are rent received this month. Occupancy is occupied units across the book."
    >
      {isError ? <ErrorState title="Couldn't load the agency book" onRetry={() => void refetch()} className="mb-6" /> : null}

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
        {isLoading || !data
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card p-4">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-7 w-20" />
              </div>
            ))
          : [
              { label: "Clients", value: String(data.clientCount), hint: data.unlinkedCount > 0 ? `${data.unlinkedCount} unlinked` : "Linked landlords" },
              { label: "Properties", value: String(data.totalProperties), hint: "Buildings on the book" },
              { label: "Units", value: String(data.totalUnits), hint: `${data.totalOccupied} occupied` },
              { label: "Occupancy", value: `${data.occupancyRate}%`, hint: `${data.totalOccupied}/${data.totalUnits} units` },
              { label: "Collections", value: formatKes(data.collectedMtd), hint: "Received this month" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="mt-1 font-heading text-lg font-bold sm:text-2xl">{stat.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{stat.hint}</p>
              </div>
            ))}
      </div>

      <section className="mb-6">
        <h2 className="section-title mb-3">Needs attention</h2>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overdue invoices, expiring leases, or unlinked buildings right now.</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {attention.map((item) => (
              <div key={item.label} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <Button size="sm" variant="outline" className="min-h-11 shrink-0" asChild>
                  <Link to={item.href}>
                    Open {item.label.toLowerCase()}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="rounded-lg border border-border bg-card p-5 xl:col-span-7">
          <h2 className="text-sm font-semibold">Portfolio activity</h2>
          <p className="mb-4 text-xs text-muted-foreground">Collected versus outstanding invoices over six months</p>
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <div className="chart-frame h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.series ?? []} margin={{ top: 10, right: 5, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={fmtCompact} width={44} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value, name) => [formatKes(Number(value ?? 0)), name === "paid" ? "Collected" : "Pending"]}
                  />
                  <Area type="monotone" dataKey="paid" stroke="hsl(var(--navy-mid))" strokeWidth={2} fill="transparent" />
                  <Area type="monotone" dataKey="pending" stroke="hsl(var(--warning))" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5 xl:col-span-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Client portfolio performance</h2>
              <p className="text-xs text-muted-foreground">Collected this month by landlord</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to={AGENCY_ROUTES.clients}>Clients</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (data?.clients.length ?? 0) === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">No clients linked yet. Link a landlord to a building.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Occ.</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.clients.slice(0, 6).map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <p className="font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.propertyCount} propert{client.propertyCount === 1 ? "y" : "ies"}</p>
                    </TableCell>
                    <TableCell className={`text-right text-sm ${occupancyRateColor(client.occupancyRate)}`}>{client.occupancyRate}%</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatKes(client.collectedMtd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>

      {(data?.properties.length ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">
          Open a building from{" "}
          <Link className="underline" to={AGENCY_ROUTES.portfolio}>Portfolio</Link>.
        </p>
      )}
    </AgencyLayout>
  );
}
