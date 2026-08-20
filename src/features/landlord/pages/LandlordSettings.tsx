import LandlordLayout from "@/features/landlord/components/LandlordLayout";
import LandlordBankDetails from "@/features/landlord/components/LandlordBankDetails";
import LandlordNotificationPreferences from "@/features/landlord/components/LandlordNotificationPreferences";
import LandlordTeamSettings from "@/features/landlord/components/LandlordTeamSettings";
import LandlordMessages from "@/features/landlord/components/LandlordMessages";
import { useLandlordPortfolio } from "@/features/landlord/hooks/useLandlordPortfolio";

export default function LandlordSettings() {
  const { properties } = useLandlordPortfolio();

  return (
    <LandlordLayout
      title="Settings"
      description="Bank details, notifications, and messages with your property manager."
    >
      <div className="space-y-6">
        <LandlordTeamSettings />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LandlordBankDetails />
          <LandlordNotificationPreferences />
        </div>
        {properties.length > 0 ? <LandlordMessages properties={properties} /> : null}
      </div>
    </LandlordLayout>
  );
}
