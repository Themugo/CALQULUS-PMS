import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgencyPortalShell, AGENCY_ACCENT } from "@/features/auth/components/AgencyPortalChrome";

function renderShell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AgencyPortalShell>
          <form onSubmit={(e) => e.preventDefault()}>
            <button type="submit">Sign in</button>
          </form>
        </AgencyPortalShell>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Agency portal entry chrome", () => {
  it("renders the single-page Agency identity and workspace headline", () => {
    renderShell();
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveTextContent(/agency/i);
    expect(screen.getByText(/AGENCY PORTAL/i)).toBeInTheDocument();
  });

  it("uses the sharp-navy agency accent and commercial property-photo background", () => {
    const { container } = renderShell();
    const bgImage = container.querySelector('img[alt=""]');
    expect(bgImage).not.toBeNull();
    expect(bgImage?.getAttribute("src")).toMatch(/property-office/);
    expect(AGENCY_ACCENT).toBe("#0074E6");
  });

  it("carries the CALQULUS brand mark and portal description", () => {
    renderShell();
    expect(screen.getAllByText(/CALQULUS/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/manage clients, portfolios, collections and agency operations/i),
    ).toBeInTheDocument();
  });

  it("renders the child sign-in form passed to it", () => {
    renderShell();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
