import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Building2, Handshake } from "lucide-react";
import AgencyLayout from "@/features/agency/components/AgencyLayout";
import { useAgencyPortfolio } from "@/features/agency/lib/useAgencyPortfolio";
import { AGENCY_ROUTES, agencyPropertyPath } from "@/features/agency/lib/agencyPaths";
import {
  agencyClientStatus,
  agencyClientStatusChipClass,
  agencyClientStatusLabel,
  agencyCollectionRate,
} from "@/features/agency/lib/agencyPortfolio";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { formatKes } from "@/features/landlord/lib/formatKes";
import { LANDLORD_DOCUMENT_TYPE } from "@/features/landlord/lib/documentTypes";
import ManagerActivityLog from "@/features/dashboard/components/ManagerActivityLog";
import { occupancyRateColor } from "@/shared/lib/statusBadge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/ui/error-state";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

const PENDING_PREFIX = "pending:";

interface ClientDocument {
  id: string;
  document_type: string;
  title: string;
  file_url?: string | null;
  document_url?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  created_at: string;
  properties?: { name: string } | null;
}

export default function AgencyClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAgencyPortfolio();

  const client = data?.clients.find((entry) => entry.id === id);
  const isPending = Boolean(id?.startsWith(PENDING_PREFIX));
  const pendingPropertyId = isPending ? id!.slice(PENDING_PREFIX.length) : null;
  const properties = (data?.properties ?? []).filter((property) =>
    isPending ? property.id === pendingPropertyId : property.clientId === id,
  );

  const { data: maintenanceCount = 0, isLoading: maintenanceLoading } = useQuery({
    queryKey: ["agency-client-maintenance", user?.id, id],
    enabled: Boolean(user?.id) && properties.length > 0,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("maintenance_requests")
        .select("id", { count: "exact", head: true })
        .eq("manager_id", user!.id)
        .in("property_id", properties.map((property) => property.id))
        .in("status", ["pending", "in_progress"]);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["agency-client-documents", user?.id, id],
    enabled: Boolean(user?.id) && Boolean(client) && !isPending,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("landlord_documents")
        .select("id, document_type, title, file_url, document_url, period_start, period_end, created_at, properties(name)")
        .eq("manager_id", user!.id)
        .eq("landlord_user_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (rows ?? []) as ClientDocument[];
    },
  });

  return (
    <AgencyLayout
      title={client?.name ?? "Client"}
      description="This client's buildings, collections, and open items."
      actions={
        <Button variant="outline" asChild>
          <Link to={AGENCY_ROUTES.clients}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Clients
          </Link>
        </Button>
      }
    >
      {isError ? <ErrorState title="Couldn't load this client" onRetry={() => void refetch()} className="mb-6" /> : null}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !client ? (
        <EmptyState
          icon={Handshake}
          title="Client not found"
          description="This client is not linked to your agency."
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${agencyClientStatusChipClass(agencyClientStatus(client))}`}
            >
              {agencyClientStatusLabel(agencyClientStatus(client))}
            </span>
            {client.email ? <span className="text-sm text-muted-foreground">{client.email}</span> : null}
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio ({properties.length})</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div
                className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5"
                aria-label="Client summary"
              >
                {[
                  { label: "Properties", value: String(client.propertyCount) },
                  { label: "Units", value: `${client.occupied}/${client.units}` },
                  { label: "Occupancy", value: `${client.occupancyRate}%` },
                  { label: "Collected this month", value: formatKes(client.collectedMtd) },
                  { label: "Outstanding", value: formatKes(client.outstanding), attention: client.outstanding > 0 },
                ].map((cell) => (
                  <div key={cell.label} className="bg-card p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cell.label}</p>
                    <p className={`mt-1 font-heading text-lg font-bold ${cell.attention ? "text-destructive" : ""}`}>
                      {cell.value}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="portfolio">
              {properties.length === 0 ? (
                <p className="py-8 text-sm text-muted-foreground">No buildings linked to this client yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Occupancy</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <Link to={agencyPropertyPath(property.id)} className="font-medium hover:underline">
                            {property.name}
                          </Link>
                          {property.address ? <p className="text-xs text-muted-foreground">{property.address}</p> : null}
                        </TableCell>
                        <TableCell className="text-right text-sm">{property.occupied}/{property.units}</TableCell>
                        <TableCell className={`text-right text-sm ${occupancyRateColor(property.occupancyRate)}`}>
                          {property.occupancyRate}%
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatKes(property.collectedMtd)}</TableCell>
                        <TableCell className={`text-right text-sm ${property.outstanding > 0 ? "text-destructive" : ""}`}>
                          {formatKes(property.outstanding)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="financial">
              <div
                className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3"
                aria-label="Financial summary"
              >
                {[
                  { label: "Collected this month", value: formatKes(client.collectedMtd) },
                  { label: "Outstanding", value: formatKes(client.outstanding), attention: client.outstanding > 0 },
                  { label: "Collection rate", value: `${agencyCollectionRate(client.collectedMtd, client.outstanding)}%` },
                ].map((cell) => (
                  <div key={cell.label} className="bg-card p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cell.label}</p>
                    <p className={`mt-1 font-heading text-lg font-bold ${cell.attention ? "text-destructive" : ""}`}>
                      {cell.value}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Month-by-month statements and full reports live under{" "}
                <Link className="underline" to="/agency/statements">Statements</Link> and{" "}
                <Link className="underline" to={AGENCY_ROUTES.reports}>Reports</Link>.
              </p>
            </TabsContent>

            <TabsContent value="maintenance">
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
                <Building2 className="h-5 w-5 shrink-0 text-[var(--portal-accent)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-lg font-bold">
                    {maintenanceLoading ? "…" : maintenanceCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Open maintenance {maintenanceCount === 1 ? "request" : "requests"} across this client's buildings.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="min-h-11 shrink-0" asChild>
                  <Link to="/agency/maintenance">Open maintenance</Link>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <ManagerActivityLog compact limit={25} />
            </TabsContent>

            <TabsContent value="documents">
              {isPending ? (
                <p className="py-8 text-sm text-muted-foreground">
                  Documents are shared once the landlord accepts the invitation.
                </p>
              ) : documentsLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : documents.length === 0 ? (
                <p className="py-8 text-sm text-muted-foreground">
                  No documents shared with this client yet. Statements and reports you share to the landlord portal appear here.
                </p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border bg-card">
                  {documents.map((doc) => {
                    const cfg = LANDLORD_DOCUMENT_TYPE[doc.document_type] ?? LANDLORD_DOCUMENT_TYPE.custom;
                    const href = doc.file_url ?? doc.document_url;
                    const Icon = cfg.icon;
                    return (
                      <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {cfg.label}
                              {doc.properties?.name ? ` · ${doc.properties.name}` : ""}
                              {doc.period_start ? ` · ${format(new Date(doc.period_start), "MMM yyyy")}` : ""}
                            </p>
                          </div>
                        </div>
                        {href ? (
                          <Button size="sm" variant="outline" className="min-h-11 shrink-0" asChild>
                            <a href={href} target="_blank" rel="noopener noreferrer">Open</a>
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </AgencyLayout>
  );
}
