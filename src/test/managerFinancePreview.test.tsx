import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ManagerFinancePreviewPage from "@/features/design-preview/pages/ManagerFinancePreviewPage";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

function renderPreview() {
  return render(
    <MemoryRouter>
      <ManagerFinancePreviewPage />
    </MemoryRouter>,
  );
}

describe("Manager finance layout preview", () => {
  it("renders billing and payments chrome without invented collections", () => {
    renderPreview();
    expect(screen.getByRole("link", { name: /skip to main content/i })).toHaveAttribute(
      "href",
      "#manager-finance-preview",
    );
    expect(screen.getByRole("heading", { level: 1, name: "Billing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create invoice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View payments" })).toBeInTheDocument();
    expect(screen.getByText("Billed")).toBeInTheDocument();
    expect(screen.getByText("Collected")).toBeInTheDocument();
    expect(screen.getByText("Outstanding")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getAllByText("Live value")).toHaveLength(4);
    expect(screen.getByText("Due date")).toBeInTheDocument();
    expect(screen.getByText("Rows populate from invoices, tenants, and leases. Amounts use the existing billed and owed columns.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Payments" }));
    expect(screen.getByRole("heading", { level: 1, name: "Payments" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeInTheDocument();
    expect(screen.getByText("Invoice / reference")).toBeInTheDocument();
    expect(screen.getByText("Method")).toBeInTheDocument();
    expect(screen.getByText("Successful")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Rows populate from payment_transactions. Method and reference stay M-Pesa, Stripe, bank, or receipt values already stored.")).toBeInTheDocument();

    expect(screen.queryByText(/KES 1.24M/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/92%/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /design bible/i })).toHaveAttribute(
      "href",
      PUBLIC_ROUTES.designPreview,
    );
  });
});
