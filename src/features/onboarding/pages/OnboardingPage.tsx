import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useRoleOnboarding } from "@/features/onboarding/hooks/useRoleOnboarding";
import { OnboardingProgress } from "@/features/onboarding/components/OnboardingProgress";
import { useQuery } from "@tanstack/react-query";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import { Layout } from "@/shared/components/layout/Layout";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { fetchActivationFacts } from "@/features/dashboard/hooks/useManagerActivation";
import type { ActivationFacts } from "@/features/dashboard/lib/activationPath";

/**
 * Role onboarding resume. Facts come from the backend; progress re-resolves.
 *
 * Uses the same fact query as the dashboard checklist. A separate copy used to hard-code
 * hasPaymentMethod=false, leaseCount=0 and paidInvoiceCount=0, so this page disagreed with
 * the dashboard and could never reach 100%.
 */
export default function OnboardingPage() {
  const { userRole } = useAuth();
  const { managerId } = useManagerScope();

  const { data: facts, isLoading } = useQuery<ActivationFacts>({
    queryKey: ["role-onboarding-facts", managerId],
    queryFn: () => fetchActivationFacts(managerId!),
    enabled: !!managerId,
  });

  const progress = useRoleOnboarding(facts);

  // Each role has its own guided flow; this resume screen is for managers.
  if (userRole?.role === "webhost") return <Navigate to="/webhost" replace />;
  if (userRole?.role === "agency") return <Navigate to="/agency/onboarding" replace />;
  if (userRole?.role === "landlord") return <Navigate to="/landlord/onboarding" replace />;

  if (!managerId) {
    return (
      <Layout title="Complete setup" subtitle="Finish onboarding to unlock full portfolio operations.">
        <div className="p-6">
          <p className="text-sm text-muted-foreground">Account has no manager scope yet.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Complete setup" subtitle="Finish onboarding to unlock full portfolio operations.">
      <div className="space-y-6 p-6">
        {isLoading || !facts || !progress ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <OnboardingProgress progress={progress} />
        )}
      </div>
    </Layout>
  );
}
