import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ManagerPortalShell } from "@/features/auth/components/ManagerPortalChrome";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

function renderShell() {
  return render(
    <MemoryRouter>
      <ManagerPortalShell formTitle="Welcome back">
        <form onSubmit={(e) => e.preventDefault()}>
          <input type="email" aria-label="Email address" />
          <button type="submit">Sign in</button>
        </form>
      </ManagerPortalShell>
    </MemoryRouter>,
  );
}

describe("Manager portal entry chrome", () => {
  it("renders the manager identity hierarchy: eyebrow, two-line headline, capability line", () => {
    renderShell();
    expect(screen.getAllByText(/^manager portal$/i).length).toBeGreaterThan(0);
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveTextContent("Run your properties from one desk.");
    // Deliberate two-line composition: "Run your properties" / "from one desk."
    expect(headline.querySelectorAll("span.block").length).toBe(2);
    for (const capability of ["Properties", "Tenants", "Billing", "Payments", "Maintenance"]) {
      expect(screen.getAllByText(capability).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText(/occupancy lives on the building record/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/open the manager desk/i)).not.toBeInTheDocument();
  });

  it("uses the property-photo background behind a navy veil", () => {
    const { container } = renderShell();
    expect(container.querySelector(".bg-navy-deep")).toBeTruthy();
    const bgImage = container.querySelector('img[alt=""]');
    expect(bgImage).not.toBeNull();
    expect(bgImage?.getAttribute("src")).toMatch(/property-residential/);
  });

  it("renders the operational preview with illustrative-data labelling", () => {
    renderShell();
    expect(screen.getByText(/^illustrative data$/i)).toBeInTheDocument();
    for (const value of ["48", "92%", "KES 1.24M", "4"]) {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/collection trend/i)).toBeInTheDocument();
    expect(screen.getByText(/maintenance activity/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /kilimani court/i })).toBeInTheDocument();
  });

  it("keeps the other-portals switcher below the preview with working links", () => {
    renderShell();
    expect(screen.getByText(/other calqulus portals/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /landlord/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.landlordLogin,
    );
    expect(screen.getByRole("link", { name: /agency/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.agencyLogin,
    );
    expect(screen.getByRole("link", { name: /tenant/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.tenantLogin,
    );
  });

  it("marks Manager as the current portal in the switcher (not a link)", () => {
    renderShell();
    const switcher = screen.getByRole("navigation", { name: /other calqulus portals/i });
    const current = switcher.querySelector('[aria-current="true"]');
    expect(current).not.toBeNull();
    expect(current).toHaveTextContent(/^manager$/i);
    expect(switcher.querySelectorAll("a").length).toBe(3);
  });

  it("keeps the legal footer compact", () => {
    renderShell();
    expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.legalPrivacy,
    );
    expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.legalTerms,
    );
    expect(screen.getByText(/© 2026 CALQULUS Limited/i)).toBeInTheDocument();
  });
});
