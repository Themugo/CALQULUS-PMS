import { Link } from "react-router-dom";
import { Handshake } from "lucide-react";
import AgencyLayout from "@/features/agency/components/AgencyLayout";
import { useAgencyPortfolio } from "@/features/agency/lib/useAgencyPortfolio";
import { AGENCY_ROUTES } from "@/features/agency/lib/agencyPaths";
import { formatKes } from "@/features/landlord/lib/formatKes";
import ManagerLandlords from "@/features/landlord/pages/ManagerLandlords";
import { occupancyRateColor } from "@/shared/lib/statusBadge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/ui/error-state";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";

export default function AgencyClients() {
  const { data, isLoading, isError, refetch } = useAgencyPortfolio();

  return (
    <AgencyLayout
      title="Clients"
      description="Landlords whose buildings you run. Occupancy and collections are rolled up from their properties."
    >
      {isError ? <ErrorState title="Couldn't load clients" onRetry={() => void refetch()} className="mb-6" /> : null}

      {isLoading ? (
        <Skeleton className="mb-8 h-48 w-full" />
      ) : (data?.clients.length ?? 0) === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No clients linked"
          description="Link a landlord to a building to see portfolio performance here."
        />
      ) : (
        <Table className="mb-8">
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Properties</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Occupancy</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data!.clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <p className="font-medium">{client.name}</p>
                  {client.email ? <p className="text-xs text-muted-foreground">{client.email}</p> : null}
                  {client.pending ? <Badge variant="outline" className="mt-1 text-xs">Invitation pending</Badge> : null}
                </TableCell>
                <TableCell className="text-right">{client.propertyCount}</TableCell>
                <TableCell className="text-right">{client.occupied}/{client.units}</TableCell>
                <TableCell className={`text-right ${occupancyRateColor(client.occupancyRate)}`}>{client.occupancyRate}%</TableCell>
                <TableCell className="text-right">{formatKes(client.collectedMtd)}</TableCell>
                <TableCell className={`text-right ${client.outstanding > 0 ? "text-destructive" : ""}`}>
                  {formatKes(client.outstanding)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <section>
        <h2 className="section-title mb-2">Property links</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Existing landlord links and invitations. Open{" "}
          <Link className="underline" to={AGENCY_ROUTES.portfolio}>Portfolio</Link> to inspect a building.
        </p>
        <ManagerLandlords />
      </section>
    </AgencyLayout>
  );
}
