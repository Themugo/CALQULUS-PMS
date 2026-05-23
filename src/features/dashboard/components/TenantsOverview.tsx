import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Users, ArrowRight, Home, Mail } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  property: string | null;
  unit: string | null;
  status: string;
  photo_url: string | null;
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  inactive: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export function TenantsOverview() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const generateSignedUrls = useCallback(async (tenantsList: Tenant[]) => {
    const urlMap: Record<string, string> = {};
    
    for (const tenant of tenantsList) {
      if (tenant.photo_url) {
        let filePath = tenant.photo_url;
        if (filePath.includes('/tenant-photos/')) {
          filePath = filePath.split('/tenant-photos/').pop() || filePath;
        }
        
        const { data, error } = await supabase.storage
          .from('tenant-photos')
          .createSignedUrl(filePath, 3600);
        
        if (data && !error) {
          urlMap[tenant.id] = data.signedUrl;
        }
      }
    }
    
    setSignedUrls(urlMap);
  }, []);

  const fetchTenants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, email, phone, property, unit, status, photo_url")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) { console.error(error); return; }
      setTenants(data || []);
      
      if (data && data.length > 0) {
        generateSignedUrls(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [generateSignedUrls]);

  useEffect(() => {
    fetchTenants();

    const channel = supabase
      .channel('tenants-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        fetchTenants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTenants]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 card-shadow animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-semibold text-card-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Recent Tenants
        </h3>
        <Link to="/tenants">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">No tenants yet</p>
          <Link to="/tenants">
            <Button variant="outline" size="sm" className="mt-3">
              Add Tenant
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tenants.map((tenant, index) => (
            <Link
              key={tenant.id}
              to="/tenants"
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-slide-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={signedUrls[tenant.id]} alt={tenant.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getInitials(tenant.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-card-foreground text-sm truncate">
                  {tenant.name}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {tenant.property && (
                    <span className="flex items-center gap-1 truncate">
                      <Home className="h-3 w-3" />
                      {tenant.property}{tenant.unit && ` - ${tenant.unit}`}
                    </span>
                  )}
                  {!tenant.property && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {tenant.email}
                    </span>
                  )}
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={cn("text-xs capitalize", statusStyles[tenant.status] || statusStyles.inactive)}
              >
                {tenant.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
