import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, Search } from "lucide-react";
import { Layout } from "@/shared/components/layout/Layout";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { ErrorState } from "@/shared/components/ui/error-state";
import { LoadingState } from "@/shared/components/ui/loading-state";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import { logError } from "@/shared/lib/errorLogger";
import { cn } from "@/shared/lib/utils";
import { leaseStatusTone, statusBadgeClass } from "@/shared/lib/statusBadge";
import { fetchPortfolioUnits, type PortfolioUnitRow } from "@/features/units/lib/portfolioUnits";
import { paginate } from "@/shared/lib/clientTable";
import { TablePager } from "@/shared/components/ui/table-pager";

const unitStatusClass: Record<string, string> = {
  vacant: statusBadgeClass("success"),
  occupied: statusBadgeClass("info"),
  maintenance: statusBadgeClass("warning"),
  reserved: statusBadgeClass("neutral"),
};

const Units = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();
  const assignedKey = assignedPropertyIds.join(",");

  const [rows, setRows] = useState<PortfolioUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    if (!managerId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchPortfolioUnits(managerId, {
        restrictToAssignedProperties,
        assignedPropertyIds,
      });
      setRows(data);
    } catch (error) {
      logError("Units.fetchRows", error);
      setLoadError("Couldn't load units from live records.");
    } finally {
      setLoading(false);
    }
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties]);

  useEffect(() => {
    void fetchRows();
  }, [assignedKey, fetchRows]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!query) return true;
      return (
        row.unitNumber.toLowerCase().includes(query)
        || row.propertyName.toLowerCase().includes(query)
        || (row.tenantName || "").toLowerCase().includes(query)
      );
    });
  }, [rows, searchQuery, statusFilter]);

  const slice = useMemo(() => paginate(filtered, page, 20), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  return (
    <Layout
      title="Units"
      subtitle="Unit, property, tenant, status, rent, lease, and balance from live records."
      headerActions={
        <Button variant="outline" size="sm" className="min-h-11" asChild>
          <Link to="/properties">View properties</Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search unit, property, or tenant"
            aria-label="Search units"
            className="min-h-11 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 min-h-11" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="vacant">Vacant</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadError && !loading && (
        <div className="mb-4">
          <ErrorState title="Couldn't load units" message={loadError} onRetry={() => { void fetchRows(); }} />
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading units…" variant="skeleton" rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Home}
          title={searchQuery || statusFilter !== "all" ? "No matching units" : "No units yet"}
          description={
            searchQuery || statusFilter !== "all"
              ? "Try a different search or status filter."
              : "Add a property, then add units on the property record."
          }
          actionLabel="Open properties"
          onAction={() => navigate("/properties")}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card card-shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Lease</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        to={`/properties/${row.propertyId}?tab=units`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {row.unitNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-muted-foreground">
                      <Link to={`/properties/${row.propertyId}`} className="hover:underline">
                        {row.propertyName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.tenantName ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={cn("capitalize", unitStatusClass[row.status] || statusBadgeClass("neutral"))}>
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.rent != null ? formatCurrency(row.rent) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {row.leaseStatus ? (
                        <span className={cn("capitalize", statusBadgeClass(leaseStatusTone(row.leaseStatus)))}>
                          {row.leaseStatus}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.balance > 0 ? (
                        <span className="font-medium text-destructive">{formatCurrency(row.balance)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3">
            <TablePager page={slice} onPageChange={setPage} noun="units" />
          </div>
        </>
      )}
    </Layout>
  );
};

export default Units;
