import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Building2, ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/shared/lib/utils";

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

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address, units, occupied, image_url")
        .order("name", { ascending: true })
        .limit(4);

      if (error) { console.error(error); return; }
      setProperties(data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return "bg-emerald-500";
    if (rate >= 70) return "bg-amber-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow animate-fade-in">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
          <Skeleton className="h-7 sm:h-8 w-20 sm:w-24" />
        </div>
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-lg bg-muted/30">
              <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-32 mb-1.5 sm:mb-2" />
                <Skeleton className="h-3 w-20 sm:w-24" />
              </div>
              <Skeleton className="h-5 sm:h-6 w-14 sm:w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 card-shadow animate-fade-in">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="font-heading text-base sm:text-lg font-semibold text-card-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Properties
        </h3>
        <Link to="/properties">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm">
            View All
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-6 sm:py-8">
          <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/50 mb-2 sm:mb-3" />
          <p className="text-muted-foreground text-xs sm:text-sm">No properties yet</p>
          <Link to="/properties">
            <Button variant="outline" size="sm" className="mt-2 sm:mt-3 h-7 sm:h-8 text-xs">
              Add Property
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {properties.map((property, index) => {
            const occupancyRate = property.units > 0 
              ? Math.round((property.occupied / property.units) * 100) 
              : 0;
            
            return (
              <Link
                key={property.id}
                to={`/properties/${property.id}`}
                className="flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-slide-in touch-manipulation"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                  {property.image_url ? (
                    <img 
                      src={property.image_url} 
                      alt={property.name}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm text-card-foreground truncate">
                    {property.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                    <span className="truncate">{property.address}</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] sm:text-xs px-1.5 sm:px-2",
                      occupancyRate >= 90 && "border-emerald-500/50 text-emerald-600",
                      occupancyRate >= 70 && occupancyRate < 90 && "border-amber-500/50 text-amber-600",
                      occupancyRate < 70 && "border-red-500/50 text-red-600"
                    )}
                  >
                    {property.occupied}/{property.units}
                  </Badge>
                  <div className="mt-1 sm:mt-1.5 w-14 sm:w-20 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all", getOccupancyColor(occupancyRate))}
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
