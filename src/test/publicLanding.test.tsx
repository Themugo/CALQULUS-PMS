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
  it("renders the operational homepage with a single h1", () => {
    renderAt("/");
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(
      "One workspace for properties, tenants, rent, and repairs.",
    );
  });

  it("keeps working portal routes on role cards", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: /^start managing$/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
    expect(screen.getByRole("link", { name: /manager portal/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
    expect(screen.getByRole("link", { name: /landlord portal/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.landlordLogin,
    );
    expect(screen.getByRole("link", { name: /agency portal/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.agencyLogin,
    );
    expect(screen.getByRole("link", { name: /tenant portal/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.tenantLogin,
    );
  });

  it("uses restrained primary navigation without Contact dominating", () => {
    renderAt("/");
    const primary = screen.getByRole("navigation", { name: "Primary" });
    expect(primary).toHaveTextContent("Workspace");
    expect(primary).toHaveTextContent("Portals");
    expect(primary).toHaveTextContent("Workflow");
    expect(primary).toHaveTextContent("Pricing");
    expect(primary).not.toHaveTextContent("Contact");
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", PUBLIC_ROUTES.managerSignIn);
    expect(within(header).getByRole("link", { name: "Get started" })).toHaveAttribute("href", PUBLIC_ROUTES.managerSignUp);
  });

  it("labels the dashboard visual as a preview", () => {
    renderAt("/");
    expect(screen.getByText(/illustrative view of the calqulus manager dashboard/i)).toBeInTheDocument();
  });

  it("points commercial CTA at the existing pricing route", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute("href", PUBLIC_ROUTES.pricing);
  });

  it("renders the pricing page without duplicating the homepage h1", () => {
    renderAt("/pricing");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Per property, per month, in Kenyan shillings.",
    );
    expect(screen.getAllByText(/\/ property \/ month/i).length).toBeGreaterThan(0);
  });

  it("stays on a light public canvas without navy page chrome", () => {
    const { container } = renderAt("/");
    expect(container.querySelector(".public-canvas")).toBeTruthy();
    expect(container.querySelector(".bg-navy-primary")).toBeNull();
    expect(container.querySelector(".bg-slate-950")).toBeNull();
  });
});
