# Tenant payment flow audit (2026-11-01)

Scope: tenant "Pay now" (M-Pesa STK) from the portal through initiation, Safaricom callback, status check,
ledger crediting, and the third-party payer path. Static review of code and migrations plus a throwaway-Postgres
check of the new migration. Nothing was run against live Supabase, Safaricom or Paystack.

## Fixed in this change

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | Critical | A signed-in tenant could call `rpc('process_payment_atomic')` directly with their own tenant id, any amount and a made-up reference. The wrapper (20260906000008) and the core both authorised "caller is the tenant", so invoices were marked paid with no money moved. | Migration `20260909000008`: tenant branch removed; only service role and mandate-gated manager/submanager callers remain. |
| 2 | Critical | `process_payment_atomic_core` (the renamed original) kept its `authenticated` grant, so the wrapper could be bypassed completely. | Same migration: revoked from PUBLIC/anon/authenticated, service_role only. |
| 3 | High | `process_payer_payment_atomic` let a linked third-party payer credit invoices directly. No client code calls it. | Same migration: service_role only. |
| 4 | High | No guard against a second STK prompt while one was open (double tap, second device, "Try again" after a slow PIN). | `initiate-mpesa-stk-push` refuses (409) while a pending prompt for the same bills is < 3 minutes old. |
| 5 | High | UI declared "Request expired" after 90 s and offered "Try again" although a late PIN could still succeed, inviting a double payment. | Dialog now asks the server once more, then shows "We have not heard back from M-Pesa yet. Do not pay again" with "Check again". |
| 6 | Medium | Callback ignored every ResultCode except 0 and 1, so cancelled (1032), wrong PIN (2001), timed out (1037) stayed "pending". | Any non-zero code now marks the transaction failed. |
| 7 | Medium | Phone numbers were prefixed with 254 without validation and sent to Safaricom. | Shared `normalizeKenyanMsisdn`; invalid numbers are rejected with a clear message. |
| 8 | Medium | STK network/parse failure left a pending row that would now block retries. | Row is closed as failed ("Could not reach M-Pesa"). |
| 9 | Medium | Status check reported `completed` even when `process-payment` had failed, so the tenant saw success with no credit or receipt. | Returns `pending` with "received, being applied, do not pay again"; the dead-letter record is kept. |
| 10 | Medium | A third-party payer got 403 when polling their own payment. | Linked payer may view their own transaction status. |
| 11 | Low | Tenants only ever saw "Edge Function returned a non-2xx status code". | `functionErrorMessage` reads the real reason (tenant dialog and payer portal). |

## Verification
- `src/test/tenantPaymentFlowAudit.test.ts` (26 tests).
- Migration run twice on a throwaway Postgres 16 with stubbed dependencies: tenant call rejected (42501), manager and
  service role allowed, anon denied; core and payer RPC executable by service_role only; migration is idempotent.
- Not exercised: real Deno runtime, Safaricom sandbox, Paystack, browser flow.

## Not changed, needs a decision or live testing
- Callback URL carries the shared secret in the query string (Safaricom cannot send custom headers). It is stored in
  `payment_transactions.callback_secret`; consider IP allow-listing Safaricom's callback ranges at the edge.
- No Safaricom source-IP check on `mpesa-callback`.
- Manager-side `MpesaPaymentDialog` has its own copy of the initiate/poll logic; it was not changed here.
- Overpayment policy (CONFIRMED): overpayments are accepted and held as advance credit for future invoices, and can be recalled. Recall is `recall_tenant_credit_atomic` (migration 20260909000009, unapplied) via the `recall-credit` function: manager/submanager within mandate only, writes a `refund` ledger row, audit-logged, cannot exceed the balance. Money is returned out-of-band; no M-Pesa B2C is wired.
- Credit application is the owner's choice (migration 20260909000010, unapplied): `manager_credit_settings.apply_mode` = `manual` (default) or `auto`, set in Settings > Payments > Tenant credit for manager/landlord/agency. In `auto`, a deferred trigger on `invoices` calls `apply_tenant_credit_atomic` at commit; failures only warn and never block invoice creation.
- Manager UI: `TenantCreditCard` on the tenant Payments tab (balance, last 5 movements, Apply, Recall). Open: tenant "request recall" flow.
- FINDING (fixed in 20260909000011, unapplied): manager RLS on `tenant_credit_ledger` was FOR ALL, allowing direct forged/deleted credit rows. Now SELECT-only for managers and submanagers; writes only through RPCs.
- Duplicate-prompt guard matches on the primary invoice id of a combined payment only.
- `process_payment_atomic` is still granted to `authenticated` for manager/submanager manual recording; consider
  routing that through `process-payment` only and revoking the grant.
- Paystack initiate/webhook and shared payment links were not audited in this pass.

## Release order
Apply `20260909000008` together with the other unapplied migrations, after Phase 2D reconciliation. Deploy
`initiate-mpesa-stk-push`, `mpesa-callback`, `verify-mpesa-stk-status` afterwards.


## Addendum (2026-11-02)
- FINDING (fixed in 20260909000012, unapplied): a payment confirmed AFTER the transaction was marked failed (cancelled, 10-min expiry, mis-poll) was skipped as "already processed" by `mpesa-callback` and `paystack-webhook`, and the core RPC refuses non-pending rows, so money moved but no invoice was credited. New service-only `revive_failed_payment_transaction_atomic` reopens a failed, unallocated transaction; both webhooks call it on a confirmed payment.
- Manager `MpesaPaymentDialog` hardened: real error text, polling stops on close, timeout shows "not confirmed, do not pay again" instead of a retryable failure, charges/labels the outstanding balance.
- Paystack reviewed: signature (HMAC-SHA512, constant time), event claim idempotency and dead-letter/500 retry are sound. Not yet checked: `initiate-shared-payment`, `reconcile-paystack`, currency check on charge.success.
- Migrations now unapplied: 20260908000001/2 and 20260909000001-12.

## End-to-end trace audit (2026-11-02)
Traced tenant -> unit -> payer -> method -> destination account -> invoice allocation -> receipt -> balance.
- FINDING: `payment_allocations.unit_id/property_id` were NULL for ordinary payments (only the bulk RPC set them), so receipts showed no unit/property and landlord receipt recipients (joined on allocation property) were never created. Fixed by a BEFORE INSERT trigger stamping from the invoice (lease fallback) plus a history repair (migration 20260909000013).
- FINDING: the destination ACCOUNT was never stored (only manager vs landlord). STK initiation now snapshots `collection_account_id` and `destination_label` (e.g. "M-Pesa Paybill 123456 · Acc 3B"; public numbers only). Manager-recorded and bank payments have no label; the receipt falls back to the receiver name.
- FINDING: the receipt payload lacked tenant, per-invoice total/balance and the advance-credit portion, so the total could exceed its lines unexplained. `get_payment_receipt` now returns them (additive keys); the PDF shows Invoice total / Paid now / Balance, an "advance credit" line, method label, payer, "For" tenant and "Paid to". Receipt email shows "Paid to".
- Verified on a throwaway Postgres 16 with a stub schema: trigger stamps unit/property, receipt payload correct, non-recipient gets nothing. Not verified against the real schema.
- Known remaining gaps: receipt email/SMS still name only the primary invoice for multi-invoice payments; the "balance" in email/SMS is the tenant's total balance, not per invoice; STK amounts are whole shillings (M-Pesa limit) so a balance with cents rounds to the nearest shilling and any excess becomes advance credit; manual and bank payments carry no destination account.

## Follow-up on the remaining gaps (2026-11-02)
- FIXED multi-invoice wording: `_shared/receiptSummary.ts` builds one line per settled invoice (number, unit, paid, balance left). The email lists every bill with "paid / left" and relabels the old figure "Total account balance"; the SMS names up to three bills (+N more) and quotes "Bal on these" separately from the account balance.
- FIXED destination for manual / bank / C2B payments: `snapshot_payment_destination_atomic` (migration 20260909000014, service-only) labels a payment from the effective collection account for its first invoice, only when the rail matches (mpesa<->paybill/till, bank<->bank, cash<->cash). Bank accounts are masked to the last 4. `receipt_upload` and mismatched rails stay unlabelled rather than guessed. Verified on a throwaway Postgres 16 stub.
- FIXED whole-shilling rounding (real bug, not just wording): STK used `Math.round`, so 1,250.40 was charged as 1,250 and 0.40 stayed on the invoice forever. The server now charges `ceil(server-computed balance)` (`_shared/mpesaAmount.ts`), ignoring the client figure for the charge; the extra under one shilling is held as advance credit. Both payment dialogs show the rounded amount and the tenant dialog explains the extra.
- Still open: the destination label for a manager-recorded payment reflects the account the portal would show, not an account the manager explicitly picked; the picker is not built.
- Migrations now unapplied: 20260908000001/2 and 20260909000001-14.
