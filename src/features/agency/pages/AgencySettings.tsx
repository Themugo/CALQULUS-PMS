import AgencyLayout from "@/features/agency/components/AgencyLayout";
import Settings from "@/features/settings/pages/Settings";

const AgencySettings = () => (
  <AgencyLayout title="Settings" description="Organization, users, notifications, and billing for this agency.">
    <Settings />
  </AgencyLayout>
);

export default AgencySettings;
