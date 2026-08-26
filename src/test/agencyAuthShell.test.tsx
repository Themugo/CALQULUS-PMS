import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AgencyPortalShell, AgencyPortfolioPreview } from "@/features/auth/components/AgencyPortalChrome";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

function renderShell() {
  return render(
    <MemoryRouter>
      <AgencyPortalShell>
        <form onSubmit={(e) => e.preventDefault()}>
          <button type="submit">Sign in</button>
        </form>
      </AgencyPortalShell>
    </MemoryRouter>,
  );
}

describe("Agency portal entry chrome", () => {
  it("renders the agency identity hierarchy: eyebrow, portfolio headline, capability line", () => {
    renderShell();
    expect(screen.getAllByText(/^agency portal$/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Run your client portfolio with control.",
    );
    for (const value of ["Client properties", "Landlords", "Collections", "Revenue share"]) {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
    }
    // removed marketing copy stays gone
    expect(screen.queryByText(/run the book on behalf of landlords/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tenants & leases/i)).not.toBeInTheDocument();
  });

  it("ranks Collected and Your split above Properties and Landlords", () => {
    render(
      <MemoryRouter>
        <AgencyPortfolioPreview />
      </MemoryRouter>,
    );
    const heroRow = screen
      .getAllByText(/^collected$/i)
      .find((el) => el.closest("div")?.textContent?.includes("KES 2.1M"));
    expect(heroRow?.closest("div")?.textContent).toContain("KES 2.1M");
    for (const metric of ["Your split", "Properties", "Landlords"]) {
      expect(screen.getAllByText(new RegExp(`^${metric}$`, "i")).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText(/kes 2\.1m/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/8%/)).toBeInTheDocument();
    expect(screen.getAllByText(/illustrative agency view/i).length).toBeGreaterThan(0);
  });

  it("keeps the client portfolio rows compact with real-photo thumbnails", () => {
    render(
      <MemoryRouter>
        <AgencyPortfolioPreview />
      </MemoryRouter>,
    );
    expect(screen.getByRole("img", { name: /kilimani court/i })).toBeInTheDocument();
    expect(screen.getByText(/westlands house/i)).toBeInTheDocument();
    expect(screen.getByText(/parklands plaza/i)).toBeInTheDocument();
    expect(screen.getByText(/managed for 2 landlords/i)).toBeInTheDocument();
  });

  it("renders the collections trend as simple bars", () => {
    render(
      <MemoryRouter>
        <AgencyPortfolioPreview />
      </MemoryRouter>,
    );
    expect(screen.getByRole("img", { name: /collections trend/i })).toBeInTheDocument();
    expect(screen.getByText(/collection trend/i)).toBeInTheDocument();
  });

  it("keeps other portals below the preview with working links", () => {
    renderShell();
    expect(screen.getByRole("link", { name: /manager/i })).toHaveAttribute("href", PUBLIC_ROUTES.managerSignIn);
    expect(screen.getByRole("link", { name: /landlord/i })).toHaveAttribute("href", PUBLIC_ROUTES.landlordLogin);
    expect(screen.getByRole("link", { name: /tenant/i })).toHaveAttribute("href", PUBLIC_ROUTES.tenantLogin);
  });

  it("keeps the footer compact", () => {
    renderShell();
    expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", PUBLIC_ROUTES.legalPrivacy);
    expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute("href", PUBLIC_ROUTES.legalTerms);
    expect(screen.getByText(/© 2026 calqulus limited/i)).toBeInTheDocument();
  });
});
