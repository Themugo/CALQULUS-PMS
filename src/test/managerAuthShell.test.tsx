import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Building2 } from "lucide-react";
import { PortalAuthShell } from "@/features/auth/components/AuthHeroChrome";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

describe("Manager portal auth chrome", () => {
  it("renders an operational desk instead of marketing slogans", () => {
    render(
      <MemoryRouter>
        <PortalAuthShell
          portalName="Manager"
          badgeLabel="Manager desk"
          icon={Building2}
          tagline="This account runs the portfolio."
          heroTitle="Open the manager desk."
          heroDescription="Properties, tenants, rent, and repairs on the same records."
          features={[
            { icon: Building2, text: "Properties & units", detail: "Occupancy on the building record." },
          ]}
          otherPortals={[
            { label: "Landlord", href: PUBLIC_ROUTES.landlordLogin },
            { label: "Agency", href: PUBLIC_ROUTES.agencyLogin },
            { label: "Tenant", href: PUBLIC_ROUTES.tenantLogin },
          ]}
          formTitle="Sign in"
          formSubtitle="Use the email for this management account."
          submitLabel="Sign in"
        >
          <button type="submit">Sign in</button>
        </PortalAuthShell>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Open the manager desk.");
    expect(screen.queryByText(/empower tenants/i)).not.toBeInTheDocument();
    expect(screen.getByText("Properties & units")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /landlord/i })).toHaveAttribute("href", PUBLIC_ROUTES.landlordLogin);
    expect(document.querySelector(".desk-canvas")).toBeTruthy();
    expect(document.querySelector(".public-canvas")).toBeNull();
    expect(document.querySelector(".bg-navy-primary")).toBeNull();
  });
});
