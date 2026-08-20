import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandlordMetricCard } from "@/features/landlord/components/LandlordMetricCard";
import { formatCurrency } from "@/shared/lib/formatCurrency";

describe("LandlordMetricCard", () => {
  it("renders a KES amount with landlord labels", () => {
    render(
      <LandlordMetricCard
        label="Collections"
        value={formatCurrency(124000)}
        hint="Rent received this month"
      />,
    );
    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText(/124,000/)).toBeInTheDocument();
    expect(screen.queryByText(/john|jane|kamau/i)).not.toBeInTheDocument();
  });
});
