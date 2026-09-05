import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import AgencyLayout from "@/features/agency/components/AgencyLayout";
import { useAgencyPortfolio } from "@/features/agency/lib/useAgencyPortfolio";
import { AGENCY_OPS_ROUTES, agencyPropertyPath } from "@/features/agency/lib/agencyPaths";
import { formatKes } from "@/features/landlord/lib/formatKes";
import { occupancyRateColor } from "@/shared/lib/statusBadge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/ui/error-state";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

export default function AgencyPortfolio() {
  const { data, isLoading, isError, refetch } = useAgencyPortfolio();
  const maxCollected = Math.max(0, ...(data?.properties ?? []).map((p) => p.collectedMtd));

  return (
    <AgencyLayout
      title="Portfolio"
      description="Every building on the book, with the client, occupancy, and collections for this month."
      actions={
        <Button variant="outline" asChild>
          <Link to={AGENCY_OPS_ROUTES.buildings}>Manage buildings</Link>
        </Button>
      }
    >
      {isError ? <ErrorState title="Couldn't load portfolio" onRetry={() => void refetch()} className="mb-6" /> : null}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (data?.properties.length ?? 0) === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties on the book"
          description="Add a building, then link a client."
        />
      ) : (
        <>
          <div
            className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6"
            aria-label="Portfolio totals"
          >
            {[
              { label: "Properties", value: String(data!.totalProperties) },
              { label: "Units", value: `${data!.totalOccupied}/${data!.totalUnits}` },
              { label: "Occupancy", value: `${data!.occupancyRate}%` },
              { label: "Collected this month", value: formatKes(data!.collectedMtd) },
              { label: "Outstanding", value: formatKes(data!.outstanding), attention: data!.outstanding > 0 },
              { label: "Clients", value: String(data!.clientCount) },
            ].map((cell) => (
              <div key={cell.label} className="bg-card p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cell.label}</p>
                <p className={`mt-1 font-heading text-base font-bold sm:text-lg ${cell.attention ? "text-destructive" : ""}`}>
                  {cell.value}
                </p>
              </div>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Occupancy</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="hidden w-32 lg:table-cell">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <Link to={agencyPropertyPath(property.id)} className="font-medium hover:underline">
                      {property.name}
                    </Link>
                    {property.address ? <p className="text-xs text-muted-foreground">{property.address}</p> : null}
                  </TableCell>
                  <TableCell className="text-sm">{property.clientName}</TableCell>
                  <TableCell className="text-right text-sm">{property.occupied}/{property.units}</TableCell>
                  <TableCell className={`text-right text-sm ${occupancyRateColor(property.occupancyRate)}`}>
                    {property.occupancyRate}%
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatKes(property.collectedMtd)}</TableCell>
                  <TableCell className={`text-right text-sm ${property.outstanding > 0 ? "text-destructive" : ""}`}>
                    {formatKes(property.outstanding)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`Collected ${formatKes(property.collectedMtd)} this month`}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--portal-accent)]"
                        style={{ width: `${maxCollected > 0 ? Math.max(4, Math.round((property.collectedMtd / maxCollected) * 100)) : 0}%` }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </AgencyLayout>
  );
}
