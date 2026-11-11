import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  planPartyReceipts, needsPartyPath, invoiceIdsFromTransaction, type PartyLine, type TenantInfo,
} from "../../supabase/functions/_shared/partyReceipts";

const line = (invoiceId: string, tenantId: string, paid: number, balance: number, unit = "1A"): PartyLine =>
  ({ invoiceId, invoiceNumber: `INV-${invoiceId}`, unit, paid, balance, tenantId });
const tenant = (tenantId: string, over: Partial<TenantInfo> = {}): TenantInfo =>
  ({ tenantId, name: `T-${tenantId}`, email: `${tenantId}@x.com`, phone: "0711000000", managerId: "m", paid: 0, accountBalance: 0, ...over });

describe("who receives a receipt", () => {
  const payer = { name: "Parent", email: "p@x.com", phone: "0722000001" };
  const lines = [line("1", "a", 10000, 0, "1A"), line("2", "b", 5000, 3000, "2B")];
  const tenants = [tenant("a", { phone: "0711000001", accountBalance: 0 }), tenant("b", { phone: "0711000002", accountBalance: 3000 })];

  it("sends the payer one receipt for every unit, and each tenant only their own bills", () => {
    const plan = planPartyReceipts(payer, tenants, lines);
    expect(plan.map((p) => p.kind)).toEqual(["payer", "tenant", "tenant"]);
    expect(plan[0].lines).toHaveLength(2);
    expect(plan[0].paid).toBe(15000);
    expect(plan[0].billsBalance).toBe(3000);
    expect(plan[1].lines.map((l) => l.invoiceId)).toEqual(["1"]);
    expect(plan[2].lines.map((l) => l.invoiceId)).toEqual(["2"]);
  });
  it("never shows a payer another tenant's account total, and tells tenants who paid", () => {
    const plan = planPartyReceipts(payer, tenants, lines);
    expect(plan[0].accountBalance).toBeNull();
    expect(plan[2].accountBalance).toBe(3000);
    expect(plan[2].paidBy).toBe("Parent");
  });
  it("does not message a tenant twice when they are the payer", () => {
    const self = { name: "T-a", email: "A@x.com", phone: "0711000001" };
    const plan = planPartyReceipts(self, [tenant("a", { phone: "0711000001" })], [line("1", "a", 100, 0)]);
    expect(plan).toHaveLength(1);
    expect(plan[0].kind).toBe("payer");
  });
  it("without a payer, tenants simply receive their own receipt", () => {
    const plan = planPartyReceipts(null, tenants, lines);
    expect(plan.map((p) => p.kind)).toEqual(["tenant", "tenant"]);
    expect(plan[0].paidBy).toBeNull();
  });
  it("skips tenants who had nothing allocated", () => {
    expect(planPartyReceipts(null, tenants, [line("1", "a", 1, 0)])).toHaveLength(1);
  });
});

describe("routing to the multi-party path", () => {
  it("is used for any payer-initiated prompt", () => expect(needsPartyPath("p1", ["a"])).toBe(true));
  it("is used when bills belong to several tenants", () => expect(needsPartyPath(null, ["a", "b"])).toBe(true));
  it("is not used for an ordinary single-tenant prompt", () => expect(needsPartyPath(null, ["a", "a"])).toBe(false));
  it("reads the invoice list from the prompt note, else the primary invoice", () => {
    expect(invoiceIdsFromTransaction('{"invoice_ids":["x","y"]}', "x")).toEqual(["x", "y"]);
    expect(invoiceIdsFromTransaction(null, "z")).toEqual(["z"]);
    expect(invoiceIdsFromTransaction("{bad", "z")).toEqual(["z"]);
    expect(invoiceIdsFromTransaction(null, null)).toEqual([]);
  });
});

describe("pending-STK completion RPC and wiring", () => {
  const sql = readFileSync("supabase/migrations/20260909000019_complete_pending_stk_multi_tenant.sql", "utf8");
  const pp = readFileSync("supabase/functions/process-payment/index.ts", "utf8");
  const init = readFileSync("supabase/functions/initiate-mpesa-stk-push/index.ts", "utf8");

  it("is service-role only and reads invoices from the pending row, not the caller", () => {
    expect(sql).toContain("auth.role() IS DISTINCT FROM 'service_role'");
    expect(sql).toContain("TO service_role");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("tx.notes::jsonb");
    expect(sql).not.toMatch(/p_invoice_ids/);
  });
  it("is idempotent on the transaction and on the provider reference", () => {
    expect(sql).toContain("tx.status = 'completed'");
    expect(sql).toContain("bank_reference = p_reference");
  });
  it("allocates oldest first across tenants via the canonical invoice allocator", () => {
    expect(sql).toContain("ORDER BY due_date ASC");
    expect(sql).toContain("process_invoice_payment");
    expect(sql).not.toMatch(/tenant_id = tx\.tenant_id\s*\n\s*AND status/);
  });
  it("process-payment branches to it only for service calls carrying a transaction", () => {
    expect(pp).toContain("if (isServiceCall && transactionId)");
    expect(pp).toContain("complete_pending_stk_payment_atomic");
    expect(pp).toContain("announcePayment(supabase, tx.id)");
    const shared = readFileSync("supabase/functions/_shared/paymentAnnouncement.ts", "utf8");
    expect(shared).toContain("get_payment_receipt_parties");
    expect(shared).toContain("planPartyReceipts");
  });
  it("the STK initiator accepts part-paid bills and bills raised without a lease", () => {
    expect(init).toContain('"partially_paid"');
    expect(init).toContain("PAYABLE_INVOICE_STATUSES");
    expect(init).toContain("(invoice as { manager_id?: string | null }).manager_id");
  });
});
