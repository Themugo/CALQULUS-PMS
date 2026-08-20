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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Occupancy</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
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
                <TableCell className="text-right text-sm">{formatKes(property.collectedMtd)}</TableCell>
                <TableCell className={`text-right text-sm ${property.outstanding > 0 ? "text-destructive" : ""}`}>
                  {formatKes(property.outstanding)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AgencyLayout>
  );
}
