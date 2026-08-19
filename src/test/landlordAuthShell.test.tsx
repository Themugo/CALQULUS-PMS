import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Home } from "lucide-react";
import { PortalAuthShell } from "@/features/auth/components/AuthHeroChrome";
import { LandlordDeskPreview } from "@/features/auth/components/LandlordDeskPreview";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

describe("Landlord portal auth chrome", () => {
  it("renders a revenue-only desk without marketing slogans or tenant PII", () => {
    render(
      <MemoryRouter>
        <PortalAuthShell
          portalName="Landlord"
          badgeLabel="Landlord desk"
          icon={Home}
          tagline="Occupancy and share only."
          heroTitle="How are my properties performing?"
          heroDescription="Collected rent, occupancy, and net to you after the revenue split."
          features={[
            { icon: Home, text: "Properties", detail: "Occupancy per building. No tenant names." },
          ]}
          otherPortals={[
            { label: "Manager", href: PUBLIC_ROUTES.managerSignIn },
            { label: "Agency", href: PUBLIC_ROUTES.agencyLogin },
            { label: "Tenant", href: PUBLIC_ROUTES.tenantLogin },
          ]}
          formTitle="Sign in"
          formSubtitle="Use the email your property manager invited."
          submitLabel="Sign in"
          aside={<LandlordDeskPreview />}
        >
          <button type="submit">Sign in</button>
        </PortalAuthShell>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "How are my properties performing?",
    );
    expect(screen.queryByText(/your returns/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/full visibility/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no tenant names/i)).toBeInTheDocument();
    expect(screen.getAllByText(/your share/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/john|jane|kamau|wamakena/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^manager$/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignIn,
    );
    expect(document.querySelector(".public-canvas")).toBeTruthy();
  });
});
