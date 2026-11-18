import { LatePenaltyPolicyCard } from "@/features/settings/components/LatePenaltyPolicyCard";
import AgencyOperationsCenter from "@/features/agency/components/AgencyOperationsCenter";

export default function AgencySettings() {
  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 pt-4">
        <LatePenaltyPolicyCard ownerRole="agency" />
      </div>
      <AgencyOperationsCenter />
    </>
  );
}
