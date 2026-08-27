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
  it("renders the premium hero hierarchy with a single h1", () => {
    renderAt("/");
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Manage properties.");
    expect(headings[0]).toHaveTextContent("Delight landlords. Empower tenants.");
    expect(screen.getByText(/property operations, connected/i)).toBeInTheDocument();
    expect(
      screen.getByText(/unifies property, lease, billing, payments, maintenance and reporting/i),
    ).toBeInTheDocument();
  });

  it("keeps working portal routes on the hero and role grid", () => {
    renderAt("/");
    const demoLinks = screen.getAllByRole("link", { name: /^book a demo$/i });
    expect(demoLinks.some((l) => l.getAttribute("href") === PUBLIC_ROUTES.managerSignUp)).toBe(true);
    expect(screen.getByRole("link", { name: /explore the platform/i }).getAttribute("href")).toMatch(
      /#capabilities$/,
    );
    // Role cards — six roles with live portal destinations.
    for (const label of [
      "Start managing",
      "Open landlord portal",
      "Open agency portal",
      "Open tenant portal",
      "Admin access",
      "Webhost access",
    ]) {
      expect(screen.getByRole("link", { name: new RegExp(`^${label}$`, "i") })).toBeTruthy();
    }
  });

  it("uses the approved primary navigation in Product / Solutions / Resources order with Pricing", () => {
    renderAt("/");
    const primary = screen.getByRole("navigation", { name: "Primary" });
    const labels = within(primary)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual(["Product", "Solutions", "Pricing", "Resources", "About"]);
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

  it("labels the dashboard visual as an illustrative preview", () => {
    renderAt("/");
    expect(screen.getAllByText(/illustrative manager dashboard/i).length).toBeGreaterThan(0);
  });

  it("renders the pricing route and keeps it free of fabricated prices on the homepage", () => {
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

  it("uses a white shimmering header, brilliant-navy chrome and light hero surface", () => {
    const { container } = renderAt("/");
    const header = screen.getByRole("banner");
    expect(header.className).toMatch(/bg-landing-surface/);
    expect(header.className).toMatch(/backdrop-blur/);
    expect(container.querySelector(".landing-hero-surface")).toBeTruthy();
    expect(container.querySelector(".landing-grid")).toBeTruthy();
    expect(container.querySelector("footer.bg-landing-primary")).toBeTruthy();
    expect(container.querySelector("#capabilities")).toBeTruthy();
    expect(container.querySelector("#roles")).toBeTruthy();
    expect(container.querySelector("#property-types")).toBeTruthy();
    expect(container.querySelector("#resources")).toBeTruthy();
    expect(container.querySelector("#company")).toBeTruthy();
    expect(container.querySelector(".bg-slate-950")).toBeNull();
  });

  it("follows the approved compact structure without extra sections", () => {
    renderAt("/");
    expect(
      screen.getByRole("heading", { name: /everything you need\. one platform\./i }),
    ).toBeInTheDocument();
    for (const cap of ["Property & Units", "Leases & Tenants", "Billing & Payments", "Maintenance", "Reports & Insights", "Secure & Controlled"]) {
      expect(screen.getByRole("heading", { name: cap })).toBeInTheDocument();
    }
    expect(
      screen.getByRole("heading", { name: /one platform\. every connection\./i }),
    ).toBeInTheDocument();
    for (const role of ["Property Managers", "Landlords", "Agencies", "Tenants", "System Administrators", "Webhosts"]) {
      expect(screen.getByRole("heading", { name: role })).toBeInTheDocument();
    }
    // Property types remain compact three panels.
    expect(screen.getByRole("heading", { name: "Residential" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Commercial" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Office" })).toBeInTheDocument();
    // Removed surplus sections stay gone.
    expect(screen.queryByRole("heading", { name: /all under control\./i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /one system\. every role\./i })).toBeNull();
    expect(screen.queryByText(/sample properties/i)).toBeNull();
  });

  it("renders capability tiles and trust strip", () => {
    renderAt("/");
    const trust = screen.getByText(/built for property professionals/i);
    expect(trust).toBeInTheDocument();
    for (const sector of ["Residential", "Commercial", "Office", "Mixed-use"]) {
      expect(screen.getAllByText(sector).length).toBeGreaterThan(0);
    }
  });

  it("uses the dashboard preview once — the hero preview is the single product visual", () => {
    renderAt("/");
    const captions = screen.getAllByText(/Illustrative manager dashboard\. Sample figures only/i);
    expect(captions.length).toBe(1);
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("Portfolio performance")).toBeInTheDocument();
    expect(screen.getByText("Collections, last 7 weeks")).toBeInTheDocument();
  });

  it("labels illustrative metrics rather than fabricating customer statistics", () => {
    renderAt("/");
    expect(
      screen.getByText(/Values marked · sample are illustrative capability indicators/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/SOC ?2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ISO ?\d{4,5}/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /linkedin|facebook|instagram/i })).not.toBeInTheDocument();
  });

  it("renders the brilliant-navy final CTA with book-a-demo and sign-in actions", () => {
    renderAt("/");
    const heading = screen.getByRole("heading", {
      name: /ready to run your portfolio with more control\?/i,
    });
    const ctaSection = heading.closest("section");
    expect(ctaSection).not.toBeNull();
    expect(ctaSection!.querySelector(".bg-landing-primary")).toBeTruthy();
    expect(within(ctaSection as HTMLElement).getByRole("link", { name: /^book a demo$/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
    expect(within(ctaSection as HTMLElement).getByRole("link", { name: /^sign in$/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignIn,
    );
  });
});
