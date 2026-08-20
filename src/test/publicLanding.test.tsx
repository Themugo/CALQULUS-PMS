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
  it("renders the executive homepage with a single h1", () => {
    renderAt("/");
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Run your properties with clarity and control.");
    expect(
      screen.getByText(/properties, tenants, leases, billing, payments and maintenance/i),
    ).toBeInTheDocument();
  });

  it("keeps working portal routes on the portal cards", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: /^start managing$/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
    expect(screen.getByRole("link", { name: /explore the platform/i })).toHaveAttribute(
      "href",
      "#platform",
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

  it("uses a white header, navy final CTA band, and navy footer chrome", () => {
    const { container } = renderAt("/");
    expect(container.querySelector(".public-canvas")).toBeTruthy();
    const header = screen.getByRole("banner");
    expect(header.className).not.toMatch(/navy-primary/);
    expect(header.className).toMatch(/bg-card/);
    expect(container.querySelector("footer.bg-navy-deep")).toBeTruthy();
    expect(container.querySelector("#platform")).toBeTruthy();
    expect(container.querySelector("#how-it-works")).toBeTruthy();
    expect(container.querySelector("#solutions")).toBeTruthy();
    expect(container.querySelector("#contact")).toBeTruthy();
    expect(container.querySelector(".bg-slate-950")).toBeNull();
    expect(container.querySelector(".public-hero-grid")).toBeTruthy();
  });

  it("shows the property type slider instead of a feature grid", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /designed for every property type/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Residential" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Commercial" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Office" })).toBeInTheDocument();
  });

  it("renders a compact CTA band with get-started and contact actions", () => {
    renderAt("/");
    expect(
      screen.getByRole("heading", { name: /bring your property operations together/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });
});
