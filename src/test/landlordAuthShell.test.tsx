import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LandlordPortalShell } from "@/features/auth/components/LandlordPortalChrome";

describe("Landlord portal login shell", () => {
  it("uses the shared reference design without replacing auth children", () => {
    render(<MemoryRouter><LandlordPortalShell><form><button>Login</button></form></LandlordPortalShell></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Landlord");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Welcome Back!");
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });
});
