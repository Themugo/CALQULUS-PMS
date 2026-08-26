import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { User } from "lucide-react";
import { PortalAuthShell } from "@/features/auth/components/AuthHeroChrome";
import { TenantDeskPreview } from "@/features/auth/components/TenantDeskPreview";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

describe("Tenant portal auth chrome", () => {
  it("renders the tenant desk for one unit without other tenants or landlord PII", () => {
    render(
      <MemoryRouter>
        <PortalAuthShell
          portalName="Tenant"
          badgeLabel="Your unit"
          icon={User}
          tagline="Your lease only."
          heroTitle="Pay rent, report a repair, read your lease."
          heroDescription="Balance and repairs for the unit you occupy."
          features={[
            { icon: User, text: "Rent & water", detail: "Pay your invoices. Receipts stay on this tenancy." },
          ]}
          otherPortals={[
            { label: "Manager", href: PUBLIC_ROUTES.managerSignIn },
            { label: "Landlord", href: PUBLIC_ROUTES.landlordLogin },
            { label: "Agency", href: PUBLIC_ROUTES.agencyLogin },
          ]}
          formTitle="Sign in"
          formSubtitle="Use the email on your invitation."
          submitLabel="Sign in"
          aside={<TenantDeskPreview />}
        >
          <button type="submit">Sign in</button>
        </PortalAuthShell>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Pay rent, report a repair, read your lease.",
    );
    expect(screen.queryByText(/in your hands/i)).not.toBeInTheDocument();
    expect(screen.getByText(/this tenancy/i)).toBeInTheDocument();
    expect(screen.queryByText(/john|jane|kamau|wamakena|landlord@/i)).not.toBeInTheDocument();
  });
});
