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
  });

  it("keeps working portal routes on role cards", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: /^start managing$/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.managerSignUp,
    );
    expect(screen.getByRole("link", { name: /explore the platform/i })).toHaveAttribute(
      "href",
      "#platform",
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
    expect(primary).toHaveTextContent("Platform");
    expect(primary).toHaveTextContent("How it works");
    expect(primary).toHaveTextContent("Solutions");
    expect(primary).toHaveTextContent("Pricing");
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
    expect(screen.getByText(/illustrative view of the calqulus manager dashboard/i)).toBeInTheDocument();
  });

  it("points commercial CTA at the existing pricing route without embedding fake prices", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute("href", PUBLIC_ROUTES.pricing);
    expect(screen.queryByText(/\/ property \/ month/i)).not.toBeInTheDocument();
  });

  it("renders the pricing page without duplicating the homepage h1", () => {
    renderAt("/pricing");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Per property, per month, in Kenyan shillings.",
    );
    expect(screen.getAllByText(/\/ property \/ month/i).length).toBeGreaterThan(0);
  });

  it("uses a mid-navy canvas with cyan chrome and a compact close", () => {
    const { container } = renderAt("/");
    expect(container.querySelector(".public-canvas")).toBeTruthy();
    const header = screen.getByRole("banner");
    expect(header.className).toMatch(/navy-primary/);
    expect(container.querySelector("footer.bg-navy-deep, footer.bg-navy-primary")).toBeTruthy();
    expect(container.querySelector("#about")).toBeTruthy();
    expect(container.querySelector("#platform")).toBeTruthy();
    expect(container.querySelector("#how-it-works")).toBeTruthy();
    expect(container.querySelector("#solutions")).toBeTruthy();
    expect(container.querySelector("#contact")).toBeTruthy();
    expect(container.querySelector(".bg-slate-950")).toBeNull();
  });

  it("exposes the operational flow from property to reporting", () => {
    const { container } = renderAt("/");
    const flow = container.querySelector("#how-it-works");
    expect(flow).toBeTruthy();
    const scoped = within(flow as HTMLElement);
    expect(scoped.getByText("Lease")).toBeInTheDocument();
    expect(scoped.getByText("Billing")).toBeInTheDocument();
    expect(scoped.getByText("Payment")).toBeInTheDocument();
    expect(scoped.getByText("Reporting")).toBeInTheDocument();
  });
});
