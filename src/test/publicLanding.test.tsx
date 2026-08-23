import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PublicLandingPage } from "@/features/marketing/PublicLandingPage";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <PublicLandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PublicLandingPage", () => {
  it("renders the product-first homepage with a single h1", () => {
    renderAt("/");
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Run every property from one place.");
    expect(
      screen.getByText(/properties, tenants, billing and maintenance/i),
    ).toBeInTheDocument();
  });

  it("keeps working portal routes on the portal cards", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: /^start managing$/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
    const exploreLinks = screen.getAllByRole("link", { name: /explore platform/i });
    expect(exploreLinks.length).toBeGreaterThan(0);
    for (const link of exploreLinks) {
      expect(link).toHaveAttribute("href", "#platform");
    }
    expect(screen.getByRole("link", { name: /view manager portal/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
    expect(screen.getByRole("link", { name: /view landlord portal/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.landlordLogin,
    );
    expect(screen.getByRole("link", { name: /view agency portal/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.agencyLogin,
    );
    expect(screen.getByRole("link", { name: /view tenant portal/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.tenantLogin,
    );
  });

  it("uses restrained primary navigation in Platform / Solutions / How it works / Pricing order", () => {
    renderAt("/");
    const primary = screen.getByRole("navigation", { name: "Primary" });
    const labels = within(primary)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual(["Platform", "Solutions", "How it works", "Pricing"]);
    expect(within(primary).getByRole("button", { name: /resources/i })).toBeInTheDocument();
    expect(primary).not.toHaveTextContent("Contact");
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignIn,
    );
    expect(within(header).getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
  });

  it("labels the dashboard visual as a preview", () => {
    renderAt("/");
    expect(screen.getAllByText(/illustrative manager dashboard/i).length).toBeGreaterThan(0);
  });

  it("keeps the pricing route reachable and free of fabricated prices on the homepage", () => {
    renderAt("/");
    const pricingLinks = screen.getAllByRole("link", { name: /pricing/i });
    expect(pricingLinks.some((link) => link.getAttribute("href") === PUBLIC_ROUTES.pricing)).toBe(true);
    expect(screen.queryByText(/\/ property \/ month/i)).not.toBeInTheDocument();
  });

  it("renders the pricing page without duplicating the homepage h1", () => {
    renderAt("/pricing");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Per property, per month, in Kenyan shillings.",
    );
    expect(screen.getAllByText(/\/ property \/ month/i).length).toBeGreaterThan(0);
  });

  it("uses a frosted header, a light hero surface, and navy footer chrome", () => {
    const { container } = renderAt("/");
    expect(container.querySelector(".public-canvas")).toBeTruthy();
    const header = screen.getByRole("banner");
    // The public header is a consistent frosted light surface across the site.
    expect(header.className).toMatch(/bg-card\/90/);
    expect(header.className).toMatch(/backdrop-blur/);
    expect(container.querySelector(".public-hero-surface-light")).toBeTruthy();
    expect(container.querySelector(".public-hero-grid-light")).toBeTruthy();
    expect(container.querySelector("footer.bg-navy-deep")).toBeTruthy();
    expect(container.querySelector("#platform")).toBeTruthy();
    expect(container.querySelector("#how-it-works")).toBeTruthy();
    expect(container.querySelector("#solutions")).toBeTruthy();
    expect(container.querySelector("#contact")).toBeTruthy();
    expect(container.querySelector(".bg-slate-950")).toBeNull();
  });

  it("shows the property portfolio carousel with sample cards", () => {
    renderAt("/");
    expect(
      screen.getByRole("heading", { name: /see what's happening across your properties/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kilimani Court" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "West View" })).toBeInTheDocument();
    expect(screen.getAllByText(/sample properties/i).length).toBeGreaterThan(0);
  });

  it("shows the compact capability grid and property type slider", () => {
    renderAt("/");
    expect(
      screen.getByRole("heading", { name: /everything you need\. one workspace\./i }),
    ).toBeInTheDocument();
    for (const tile of ["Properties", "Units", "Tenants", "Leases", "Billing", "Payments", "Maintenance", "Reporting"]) {
      expect(screen.getAllByText(tile).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("heading", { name: /built for every property\./i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Residential" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Commercial" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Office" })).toBeInTheDocument();
  });

  it("renders the visual workflow, finance and maintenance showcases, and trust grid", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /one property\. every operation\./i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /know what came in\./i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /maintenance, under control\./i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /built to keep operations moving\./i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Role-based" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Secure" })).toBeInTheDocument();
  });

  it("uses the full dashboard only once — capability rows use dedicated lightweight visuals", () => {
    renderAt("/");
    const captions = screen.getAllByText(
      /Illustrative manager dashboard\. Sample figures only/i,
    );
    expect(captions.length).toBe(1);
    expect(screen.getByText("Billing runs")).toBeInTheDocument();
    expect(screen.getAllByText("Maintenance activity").length).toBeGreaterThan(0);
  });

  it("does not fabricate certifications or fake social links", () => {
    renderAt("/");
    expect(screen.queryByText(/SOC ?2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ISO ?\d{4,5}/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/PCI/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /linkedin|facebook|instagram/i })).not.toBeInTheDocument();
  });

  it("renders a tinted final CTA card with get-started and explore actions", () => {
    renderAt("/");
    expect(
      screen.getByRole("heading", { name: /ready to run your portfolio\?/i }),
    ).toBeInTheDocument();
    const ctaSection = screen.getByRole("heading", {
      name: /ready to run your portfolio\?/i,
    }).closest("section");
    expect(ctaSection).not.toBeNull();
    expect(within(ctaSection as HTMLElement).getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
  });
});
