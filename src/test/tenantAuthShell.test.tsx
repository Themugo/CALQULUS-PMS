import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TenantHomePreview, TenantPortalShell } from "@/features/auth/components/TenantPortalChrome";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

function renderShell() {
  return render(
    <MemoryRouter>
      <TenantPortalShell>
        <form onSubmit={(e) => e.preventDefault()}>
          <button type="submit">Sign in</button>
        </form>
      </TenantPortalShell>
    </MemoryRouter>,
  );
}

function renderPreview() {
  return render(
    <MemoryRouter>
      <TenantHomePreview />
    </MemoryRouter>,
  );
}

describe("Tenant portal entry chrome", () => {
  it("renders the residential identity hierarchy: eyebrow, home headline, capability strip", () => {
    renderShell();
    expect(screen.getAllByText(/^tenant portal$/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your home, connected.");
    expect(
      screen.getByText(/rent, payments, maintenance and lease information/i),
    ).toBeInTheDocument();
    for (const label of ["Rent", "Payments", "Maintenance", "Lease", "Property services"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    // removed corporate desk copy stays gone
    expect(screen.queryByText(/pay rent, report a repair, read your lease/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/your unit/i)).not.toBeInTheDocument();
  });

  it("presents the auth card as a welcome-home card, not a corporate desk login", () => {
    renderShell();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Welcome home.");
    expect(screen.getByText(/sign in to manage your home and property services/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to calqulus/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.home,
    );
  });

  it("ranks the tenant preview: my home, next rent, maintenance, lease — labelled illustrative", () => {
    renderPreview();
    expect(screen.getAllByText(/illustrative tenant view/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: /kilimani court/i })).toBeInTheDocument();
    expect(screen.getByText(/apartment 3b/i)).toBeInTheDocument();
    expect(screen.getByText(/tenant since 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/kes 35,000/i)).toBeInTheDocument();
    expect(screen.getByText(/due 01 sep/i)).toBeInTheDocument();
    expect(screen.getByText(/^upcoming$/i)).toBeInTheDocument();
    expect(screen.getByText(/1 open request/i)).toBeInTheDocument();
    expect(screen.getByText(/leaking tap/i)).toBeInTheDocument();
    expect(screen.getByText(/expires 31 dec 2026/i)).toBeInTheDocument();
  });

  it("keeps portfolio metrics and other tenants' data out of the preview", () => {
    renderPreview();
    expect(screen.queryByText(/occupancy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/revenue share|your split|net to you/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/collected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kamau|wamakena|john|jane/i)).not.toBeInTheDocument();
  });

  it("carries the service message and the compact security reassurance", () => {
    renderPreview();
    expect(screen.getByText(/need something fixed/i)).toBeInTheDocument();
    expect(screen.getByText(/secure tenant access/i)).toBeInTheDocument();
    expect(
      screen.getByText(/only shows information associated with your tenancy/i),
    ).toBeInTheDocument();
  });

  it("shows tenant visibly selected in the portal switcher with the other portals linked", () => {
    renderShell();
    const current = screen.getByText(/^tenant$/i, { selector: "[aria-current='page']" });
    expect(current).toBeInTheDocument();
    expect(current.closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: /manager/i })).toHaveAttribute("href", PUBLIC_ROUTES.managerSignIn);
    expect(screen.getByRole("link", { name: /landlord/i })).toHaveAttribute("href", PUBLIC_ROUTES.landlordLogin);
    expect(screen.getByRole("link", { name: /agency/i })).toHaveAttribute("href", PUBLIC_ROUTES.agencyLogin);
  });

  it("keeps the footer compact with legal links", () => {
    renderShell();
    expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", PUBLIC_ROUTES.legalPrivacy);
    expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute("href", PUBLIC_ROUTES.legalTerms);
    expect(screen.getByText(/© 2026 calqulus limited/i)).toBeInTheDocument();
  });
});
