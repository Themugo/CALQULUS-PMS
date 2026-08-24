import { Link } from "react-router-dom";
import { ChevronRight, Handshake } from "lucide-react";
import AgencyLayout from "@/features/agency/components/AgencyLayout";
import { useAgencyPortfolio } from "@/features/agency/lib/useAgencyPortfolio";
import { AGENCY_ROUTES, agencyClientPath } from "@/features/agency/lib/agencyPaths";
import {
  agencyClientStatus,
  agencyClientStatusChipClass,
  agencyClientStatusLabel,
} from "@/features/agency/lib/agencyPortfolio";
import { formatKes } from "@/features/landlord/lib/formatKes";
import LandlordLinksManager from "@/features/landlord/components/LandlordLinksManager";
import { occupancyRateColor } from "@/shared/lib/statusBadge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/ui/error-state";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

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
              <TableHead className="text-right">Collections</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" aria-label="Open client" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data!.clients.map((client) => {
              const status = agencyClientStatus(client);
              return (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link to={agencyClientPath(client.id)} className="font-medium hover:underline">
                      {client.name}
                    </Link>
                    {client.email ? <p className="text-xs text-muted-foreground">{client.email}</p> : null}
                  </TableCell>
                  <TableCell className="text-right">{client.propertyCount}</TableCell>
                  <TableCell className="text-right">{client.occupied}/{client.units}</TableCell>
                  <TableCell className={`text-right ${occupancyRateColor(client.occupancyRate)}`}>
                    {client.occupancyRate}%
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatKes(client.collectedMtd)}
                    {client.outstanding > 0 ? (
                      <span className="block text-xs font-normal text-destructive">
                        {formatKes(client.outstanding)} outstanding
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${agencyClientStatusChipClass(status)}`}
                    >
                      {agencyClientStatusLabel(status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={agencyClientPath(client.id)}
                      aria-label={`Open ${client.name}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <section>
        <h2 className="section-title mb-2">Property links</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Existing landlord links and invitations. Open{" "}
          <Link className="underline" to={AGENCY_ROUTES.portfolio}>Portfolio</Link> to inspect a building.
        </p>
        <LandlordLinksManager />
      </section>
    </AgencyLayout>
  );
}
