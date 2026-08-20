// @ts-nocheck — Phase 12: remaining local types until live supabase gen types
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Building2, ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import { LazyImage } from "@/shared/components/LazyImage";

interface Property {
  id: string;
  name: string;
  address: string;
  units: number;
  occupied: number;
  image_url: string | null;
}

export function PropertiesOverview() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();
  const assignedPropertyIdsKey = assignedPropertyIds.join(',');

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
        .select("id, name, address, units, occupied, image_url")
        .eq("manager_id", managerId)
        .order("name", { ascending: true })
        .limit(4);

      if (restrictToAssignedProperties) {
        query = query.in("id", assignedPropertyIds);
      }

      const { data, error } = await query;

      if (error) { logError('PropertiesOverview.fetchProperties', error); return; }
      setProperties(data || []);
    } catch (err) {
      logError('PropertiesOverview.fetchProperties', err);
    } finally {
      setLoading(false);
    }
  }, [assignedPropertyIds, managerId, restrictToAssignedProperties]);

  useEffect(() => {
    fetchProperties();

    const channel = supabase
      .channel('properties-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        fetchProperties();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProperties]);

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return "bg-success";
    if (rate >= 70) return "bg-warning";
    return "bg-destructive";
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <Skeleton className="h-5 sm:h-6 w-32 sm:w-40 rounded-lg" />
          <Skeleton className="h-7 sm:h-8 w-20 sm:w-24 rounded-lg" />
        </div>
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/30">
              <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-28 sm:w-36 rounded-md" />
                <Skeleton className="h-3.5 w-24 sm:w-28 rounded-md" />
              </div>
              <Skeleton className="h-6 sm:h-7 w-16 sm:w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="type-card-title flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Properties
        </h3>
        <Link to="/properties">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm mb-3">No properties yet</p>
          <Link to="/properties">
            <Button variant="outline" size="sm">
              Add Property
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {properties.map((property) => {
            const occupancyRate = property.units > 0 
              ? Math.round((property.occupied / property.units) * 100) 
              : 0;
            
            return (
              <Link
                key={property.id}
                to={`/properties/${property.id}`}
                className="group flex items-center gap-3 p-3 rounded-md bg-muted/40 hover:bg-muted border border-border"
              >
                <div className="relative h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border border-border">
                  {property.image_url ? (
                    <LazyImage
                      src={property.image_url}
                      alt={property.name}
                      className="h-full w-full rounded-md"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-sm sm:text-base text-card-foreground truncate">
                    {property.name}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                    <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{property.address}</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1.5">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-semibold border-2",
                      occupancyRate >= 90 && "border-success/50 text-success bg-success/5",
                      occupancyRate >= 70 && occupancyRate < 90 && "border-warning/50 text-warning bg-warning/5",
                      occupancyRate < 70 && "border-destructive/50 text-destructive bg-destructive/5"
                    )}
                  >
                    {property.occupied}/{property.units}
                  </Badge>
                  <div className="mt-1.5 sm:mt-2 w-16 sm:w-20 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", getOccupancyColor(occupancyRate))}
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
