import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

export interface SimpleProperty {
  id: string;
  name: string;
}

/**
 * Lightweight { id, name } list of the current manager's properties, used to
 * populate property-picker dropdowns (e.g. Statements, Water Billing).
 */
export function useManagerPropertiesSimple() {
  const { user } = useAuth();

  const { data: properties = [], isLoading } = useQuery<SimpleProperty[]>({
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

  return { properties, isLoading };
}
