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
  it("renders the approved hero hierarchy with a single h1", () => {
    renderAt("/");
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Run your properties. Without the chaos.");
    expect(screen.getByText(/property operations, connected/i)).toBeInTheDocument();
    expect(
      screen.getByText(/brings properties, tenants, leases, billing, payments and maintenance/i),
    ).toBeInTheDocument();
  });

  it("keeps working portal routes on the hero, role strip and final CTA", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: /^start managing$/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
    expect(screen.getByRole("link", { name: /see how it works/i })).toHaveAttribute(
      "href",
      "#how-it-works",
    );
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

  it("uses the approved primary navigation in Platform / Solutions / Pricing order", () => {
    renderAt("/");
    const primary = screen.getByRole("navigation", { name: "Primary" });
    const labels = within(primary)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual(["Platform", "Solutions", "Pricing"]);
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

  it("follows the approved compact structure without extra sections", () => {
    renderAt("/");
    // Approved order: capabilities → property types → roles → lifecycle → trust → final CTA.
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
    expect(screen.getByRole("heading", { name: /one system\. every role\./i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /one property\. every operation\./i })).toBeInTheDocument();
    // Removed surplus sections stay gone.
    expect(screen.queryByRole("heading", { name: /see what's happening across your properties/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /know what came in\./i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /maintenance, under control\./i })).toBeNull();
    expect(screen.queryByText(/sample properties/i)).toBeNull();
  });

  it("renders the lifecycle flow and compact trust row", () => {
    renderAt("/");
    for (const step of ["Property", "Units", "Tenants", "Leases", "Billing", "Payments", "Maintenance", "Reporting"]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }
    for (const pillar of ["Role-based", "Secure", "Auditable", "Connected"]) {
      expect(screen.getByRole("heading", { name: pillar })).toBeInTheDocument();
    }
  });

  it("uses the full dashboard only once — the hero preview is the single product visual", () => {
    renderAt("/");
    const captions = screen.getAllByText(
      /Illustrative manager dashboard\. Sample figures only/i,
    );
    expect(captions.length).toBe(1);
    expect(screen.getByText("Maintenance activity")).toBeInTheDocument();
    expect(screen.getByText("Property summary")).toBeInTheDocument();
    expect(screen.getByText("Collections, last 7 weeks")).toBeInTheDocument();
  });

  it("does not fabricate certifications or fake social links", () => {
    renderAt("/");
    expect(screen.queryByText(/SOC ?2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ISO ?\d{4,5}/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/PCI/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /linkedin|facebook|instagram/i })).not.toBeInTheDocument();
  });

  it("renders a deep-navy final CTA with get-started and sign-in actions", () => {
    renderAt("/");
    const heading = screen.getByRole("heading", {
      name: /ready to run your portfolio with more control\?/i,
    });
    const ctaSection = heading.closest("section");
    expect(ctaSection).not.toBeNull();
    expect(ctaSection!.querySelector(".bg-navy-deep")).toBeTruthy();
    expect(within(ctaSection as HTMLElement).getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
    expect(within(ctaSection as HTMLElement).getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignIn,
    );
  });
});
