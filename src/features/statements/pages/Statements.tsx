import { Layout } from "@/shared/components/layout/Layout";
import { PropertyStatementTab } from "@/features/properties/components/PropertyStatementTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useState } from "react";
import { FileSpreadsheet, Building2 } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";

const Statements = () => {
  const { user } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["manager-properties-simple", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("manager_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <Layout
      title="Statements"
      subtitle="Generate monthly collection statements per property"
      headerActions={
        <Select value={selectedProperty ?? ""} onValueChange={v => setSelectedProperty(v || null)}>
          <SelectTrigger className="w-[220px] h-9 text-sm">
            <SelectValue placeholder="Select a property…" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((p: { id: string; name: string }) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {!selectedProperty && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-muted-foreground">Select a property</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Choose a property from the dropdown above to generate statements.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {selectedProperty && !isLoading && (
        <PropertyStatementTab
          propertyId={selectedProperty}
          propertyName={properties.find((p: { id: string; name: string }) => p.id === selectedProperty)?.name ?? "Property"}
        />
      )}
    </Layout>
  );
};

export default Statements;
