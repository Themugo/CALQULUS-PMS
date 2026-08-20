import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Building2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import { logError } from "@/shared/lib/errorLogger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

interface Property {
  id: string;
  name: string;
  address: string;
  units: number;
  occupied: number;
}

export function PropertiesOverview({ showHeader = true }: { showHeader?: boolean }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();

  const fetchProperties = useCallback(async () => {
    try {
      if (!managerId) {
        setProperties([]);
        return;
      }
      if (restrictToAssignedProperties && assignedPropertyIds.length === 0) {
        setProperties([]);
        return;
      }

      let query = supabase
        .from("properties")
        .select("id, name, address, units, occupied")
        .eq("manager_id", managerId)
        .order("name", { ascending: true })
        .limit(8);

      if (restrictToAssignedProperties) {
        query = query.in("id", assignedPropertyIds);
      }

      const { data, error } = await query;

      if (error) {
        logError("PropertiesOverview.fetchProperties", error);
        return;
      }
      setProperties((data ?? []) as Property[]);
    } catch (err) {
      logError("PropertiesOverview.fetchProperties", err);
    } finally {
      setLoading(false);
    }
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties]);

  useEffect(() => {
    fetchProperties();

    const channel = supabase
      .channel("properties-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => {
        fetchProperties();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProperties]);

  const occupancyTone = (rate: number) => {
    if (rate >= 90) return "bg-success";
    if (rate >= 70) return "bg-warning";
    return "bg-destructive";
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow">
        {showHeader ? <Skeleton className="mb-4 h-5 w-40" /> : null}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow">
      {showHeader ? (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="type-card-title flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            Properties
          </h3>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/properties">View all</Link>
          </Button>
        </div>
      ) : (
        <div className="mb-3 flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/properties">View all</Link>
          </Button>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="py-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">No properties yet</p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/properties">Add property</Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Occupancy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => {
              const occupancyRate = property.units > 0
                ? Math.round((property.occupied / property.units) * 100)
                : 0;
              return (
                <TableRow key={property.id}>
                  <TableCell>
                    <Link to={`/properties/${property.id}`} className="font-medium text-foreground hover:underline">
                      {property.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                    {property.address}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex min-w-[7rem] flex-col items-end gap-1">
                      <span className="text-sm text-foreground">
                        {property.occupied}/{property.units}
                      </span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", occupancyTone(occupancyRate))}
                          style={{ width: `${occupancyRate}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
