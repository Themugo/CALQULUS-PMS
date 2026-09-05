import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LandlordPortalShell, LandlordPerformancePreview } from "@/features/auth/components/LandlordPortalChrome";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

function renderShell() {
  return render(
    <MemoryRouter>
      <LandlordPortalShell>
        <form onSubmit={(e) => e.preventDefault()}>
          <button type="submit">Sign in</button>
        </form>
      </LandlordPortalShell>
    </MemoryRouter>,
  );
}

describe("Landlord portal entry chrome", () => {
  it("renders the landlord identity hierarchy: eyebrow, owner headline, value line", () => {
    renderShell();
    expect(screen.getAllByText(/^landlord portal$/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "See how your properties are performing.",
    );
    for (const value of ["Properties", "Occupancy", "Your share", "Statements", "Privacy protected"]) {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
    }
    // removed operator-feature copy stays gone
    expect(screen.queryByText(/how are my properties performing\?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guarded view/i)).not.toBeInTheDocument();
  });

  it("ranks Net to you above Collected/Occupancy/Properties", () => {
    render(
      <MemoryRouter>
        <LandlordPerformancePreview />
      </MemoryRouter>,
    );
    const netRows = screen.getAllByText(/^net to you$/i);
    const netRow = netRows.find((el) => el.closest("div")?.textContent?.includes("KES 784K"));
    expect(netRow?.closest("div")?.textContent).toContain("KES 784K");
    for (const metric of ["Collected", "Occupancy", "Properties"]) {
      expect(screen.getAllByText(new RegExp(`^${metric}$`, "i")).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText(/illustrative landlord view/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/privacy protected/i)).toBeInTheDocument();
  });

  it("keeps the portfolio rows compact and real-photo where available", () => {
    render(
      <MemoryRouter>
        <LandlordPerformancePreview />
      </MemoryRouter>,
    );
    expect(screen.getByRole("img", { name: /kilimani court/i })).toBeInTheDocument();
    expect(screen.getByText(/westlands house/i)).toBeInTheDocument();
    expect(screen.getByText(/92% occupied · 80% share/i)).toBeInTheDocument();
    expect(screen.getByText(/75% occupied · 80% share/i)).toBeInTheDocument();
  });

  it("renders the net-vs-collected trend as simple dual bars", () => {
    render(
      <MemoryRouter>
        <LandlordPerformancePreview />
      </MemoryRouter>,
    );
    expect(screen.getByRole("img", { name: /collected vs net trend/i })).toBeInTheDocument();
    expect(screen.getByText(/navy collected · emerald net/i)).toBeInTheDocument();
  });

  it("keeps other portals below the preview with working links", () => {
    renderShell();
    expect(screen.getByRole("link", { name: /manager/i })).toHaveAttribute("href", PUBLIC_ROUTES.managerSignIn);
    expect(screen.getByRole("link", { name: /agency/i })).toHaveAttribute("href", PUBLIC_ROUTES.agencyLogin);
    expect(screen.getByRole("link", { name: /tenant/i })).toHaveAttribute("href", PUBLIC_ROUTES.tenantLogin);
  });

  it("keeps the footer compact", () => {
    renderShell();
    expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", PUBLIC_ROUTES.legalPrivacy);
    expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute("href", PUBLIC_ROUTES.legalTerms);
    expect(screen.getByText(/© 2026 calqulus limited/i)).toBeInTheDocument();
  });
});
