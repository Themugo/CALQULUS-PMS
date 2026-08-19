import { describe, it, expect } from "vitest";
import { toUserFacingError } from "@/shared/lib/errorLogger";

describe("toUserFacingError", () => {
  it("returns a safe fallback for PostgREST/SQL constraint errors", () => {
    expect(
      toUserFacingError(
        new Error('insert or update on table "invoices" violates foreign key constraint'),
        "Could not save invoice",
      ),
    ).toBe("Could not save invoice");
  });

  it("returns a safe fallback for RLS denials", () => {
    expect(
      toUserFacingError(new Error("new row violates row-level security policy"), "Not allowed"),
    ).toBe("Not allowed");
  });

  it("passes through a short operational message", () => {
    expect(toUserFacingError(new Error("Enter a valid amount"), "Failed")).toBe("Enter a valid amount");
  });
});
