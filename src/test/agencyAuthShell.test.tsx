import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AgencyPortalShell, AGENCY_ACCENT } from "@/features/auth/components/AgencyPortalChrome";

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
  it("renders the two-line Agency / Portal headline", () => {
    renderShell();
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveTextContent(/agency/i);
    expect(headline).toHaveTextContent(/portal/i);
    expect(headline.querySelectorAll("span.block").length).toBe(2);
  });

  it("uses the agency blue accent and property-photo background", () => {
    const { container } = renderShell();
    const bgImage = container.querySelector('img[alt=""]');
    expect(bgImage).not.toBeNull();
    expect(bgImage?.getAttribute("src")).toMatch(/property-office/);
    expect(AGENCY_ACCENT).toBe("#4658C9");
  });

  it("carries the CALQULUS brand mark and portal description", () => {
    renderShell();
    expect(screen.getAllByText(/CALQULUS/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/run your client portfolio/i)).toBeInTheDocument();
  });

  it("renders the child sign-in form passed to it", () => {
    renderShell();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
