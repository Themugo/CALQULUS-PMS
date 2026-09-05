import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AgencyPortalShell } from "@/features/auth/components/AgencyPortalChrome";

describe("Agency portal login shell", () => {
  it("uses the shared reference design without replacing auth children", () => {
    render(<MemoryRouter><AgencyPortalShell><form><button>Login</button></form></AgencyPortalShell></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Agency");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Welcome Back!");
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });
});
