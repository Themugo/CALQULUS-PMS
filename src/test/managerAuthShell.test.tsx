import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ManagerPortalShell } from "@/features/auth/components/ManagerPortalChrome";

describe("Manager portal login shell", () => {
  it("uses the shared reference design without replacing auth children", () => {
    render(<MemoryRouter><ManagerPortalShell formTitle="Welcome back"><form><button>Login</button></form></ManagerPortalShell></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Property Manager");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Welcome Back!");
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });
});
