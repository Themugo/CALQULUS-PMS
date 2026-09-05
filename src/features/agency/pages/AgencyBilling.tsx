import React from "react";
import { useQuery } from "@tanstack/react-query";
import AgencyLayout from "@/features/agency/components/AgencyLayout";
import Billing from "@/features/billing/pages/Billing";
import AgencyPaymentRoutingPanel from "@/features/billing/components/AgencyPaymentRoutingPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Skeleton } from "@/shared/components/ui/skeleton";

const AgencyBilling = () => {
 const {user}=useAuth();
 const {data:agencyId,isLoading}=useQuery({queryKey:['current-agency-id',user?.id],enabled:!!user?.id,queryFn:async()=>{const {data,error}=await supabase.from('manager_profiles').select('agency_id').eq('manager_user_id',user!.id).maybeSingle();if(error)throw error;return data?.agency_id??null}});
 return <AgencyLayout title="Billing" description="Invoices and collections across client portfolios.">{isLoading?<Skeleton className="h-32 w-full mb-4"/>:agencyId?<div className="mb-5"><AgencyPaymentRoutingPanel agencyId={agencyId}/></div>:null}<Billing/></AgencyLayout>;
};
export default AgencyBilling;
