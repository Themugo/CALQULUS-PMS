import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TenantPortalShell } from "@/features/auth/components/TenantPortalChrome";

describe("Tenant portal login shell", () => {
  it("uses the shared reference design without replacing auth children", () => {
    render(<MemoryRouter><TenantPortalShell><form><button>Login</button></form></TenantPortalShell></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tenant");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Welcome Back!");
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });
});
