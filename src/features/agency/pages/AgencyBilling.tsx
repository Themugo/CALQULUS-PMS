import AgencyLayout from "@/features/agency/components/AgencyLayout";
import Billing from "@/features/billing/pages/Billing";

const AgencyBilling = () => (
  <AgencyLayout title="Billing" description="Invoices and collections across client portfolios.">
    <Billing />
  </AgencyLayout>
);

export default AgencyBilling;
