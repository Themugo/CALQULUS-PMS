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

## Addendum 2026-11-06: Paystack and shared-link paths
- `paystack-webhook` and `reconcile-paystack`: a confirmed charge in any currency other than KES is dead-lettered, never allocated (`isKesCharge`).
- `reconcile-paystack`: a pending payment is only expired when Paystack answered (ok or 404); an unreachable Paystack no longer marks a possibly-paid transaction failed. process-payment `success:false` is now an error there too, matching the webhook.
- `initiate-shared-payment`: charges the server balance rounded up to a whole shilling (was nearest, with a client-trusted tolerance), stamps `collection_account_id` and `destination_label` so shared-link receipts show the account, and no longer errors the payer after the STK prompt is already sent if the link cannot be consumed.
- Not changed: callback secret in URL, no Safaricom IP allow-list, `initiate-manager-paystack-payment` not audited.
- `initiate-paystack-payment` (2026-11-07): validated and charged the invoice's full `amount`, so a part-paid invoice was over-requested or rejected. It now bills `balance_due` rounded up to a whole shilling and records that same figure on the transaction.
- `initiate-manager-paystack-payment` (2026-11-07): audited. The platform ledger needs the paid amount to equal the invoice amount exactly, so a fractional invoice cannot be settled by whole-shilling M-Pesa: it is now refused up front with a "pay by card" message instead of charging cents and dead-lettering the webhook. A second prompt within 5 minutes for the same invoice is refused (double-tap guard). Cancelled, void and waived invoices are not payable. Ownership, rate limit and pre-created transaction were already correct.
- `mpesa-callback` (2026-11-07): added an OPTIONAL source-IP allow-list (`MPESA_CALLBACK_ALLOWED_IPS`, comma-separated). It is off unless set, so it cannot block real callbacks by default. Set it only after confirming Safaricom's current callback IPs for your shortcode; the per-transaction secret remains the primary control (unguessable, timing-safe compared). The secret stays in the callback URL because Daraja offers no header-based option.

## Addendum 2026-11-10: routing follows who collects
Migration `20260909000016_collection_destination_routing.sql` (UNAPPLIED). `get_effective_payment_collection_account` ranked accounts by scope only, so when an agency managed a property but the landlord collected (service model `managed_direct_landlord_collection`, or a contract rule with `collection_destination = 'landlord'`), an agency-level account still outranked the landlord's own and tenants were shown the agency's paybill. The effective destination is now resolved from the active contract rule, else `property_landlords.payment_destination`; when it is 'landlord' the landlord's accounts outrank agency/manager accounts. Tenant/lease/unit/property accounts still win. Agency/manager accounts remain a fallback, and the account used is recorded on the payment. Tested on throwaway Postgres (6 scenarios).
Decision for you: make 'landlord' routing strict (never fall back to an agency account when the landlord has none). Safer for the owner's money, but a property with no landlord account becomes un-payable until they add one.
"Agency enforces only, landlord collects" needs no new model: use a contract rule with collection_destination 'landlord', management modules off, enforcement on.

## Addendum 2026-11-10 (c): payer / multi-tenant STK end to end

**Defects found**
1. A prompt started by a payer for bills of more than one tenant was finalised with the first invoice's tenant only. process-payment rejected the other tenants' invoices ("not payable"), the callback dead-lettered it, and the payer had been charged with nothing allocated.
2. A payer paying for one tenant's unit was allocated correctly but received no receipt of their own (email/SMS went to the tenant only).
3. Tenants never learned who paid for them; per-tenant balances were not reported for third-party payments.
4. `initiate-mpesa-stk-push` refused `partially_paid` bills (the remainder could not be paid by STK) and refused invoices raised without a lease (no manager resolved).

**Fixes (migration 20260909000019 and edge functions, not applied)**
- `complete_pending_stk_payment_atomic` (service-only): finalises the pending row, reads the invoice list from the row's own notes, allocates oldest-first across all tenants via `process_invoice_payment`, credits any sub-shilling surplus to the first invoice's tenant, idempotent on the transaction and on the provider reference.
- `get_payment_receipt_parties`: payer contact plus each tenant's paid amount and account balance.
- process-payment: service calls carrying a `transactionId` that are payer-started or span tenants take this path. The payer gets one receipt listing every bill with per-bill balances; each tenant gets only their own bills, their account balance and "Paid by"; a tenant who is the payer is not messaged twice; managers (and the landlord when collecting) are notified per tenant. In-app receipts were already fanned out by `issue_payment_receipt_atomic`.
- Initiator: `partially_paid` allowed; manager/property/unit fall back to the invoice and property rows when there is no lease.

**Verified**: throwaway Postgres on stub schemas (service-only gate, two-tenant allocation 10,000 + 5,000, payer stamped on allocations, replay idempotent, surplus to credit, duplicate provider reference). tsc clean, vitest 1934 passed. Not tested against the real schema, Safaricom, or email/SMS providers.

**Resolved in (d) below**: grouping by destination in the tenant and payer screens.

## Addendum 2026-11-10 (d): bills grouped by payment destination

The STK initiator returns 409 when selected bills resolve to different collection accounts. The screens now prevent that combination up front.

- `src/features/payments/lib/destinationGroups.ts`: `destinationKey` mirrors the server comparison (account id | method | paybill | till); `groupByDestination`, `destinationLabel`, `lockedReason`. A test asserts the key format matches the server's source line.
- Tenant bills hub: when bills split across accounts, one "Select all for <account>" and one "Pay <account> — total" button per account; once a bill is ticked, bills of other accounts are disabled with a reason. A single account keeps the original buttons.
- Payer portal: obligations are grouped under their account heading; selection locks to one account; Pay is disabled until routes have loaded.
- Migration 20260909000020: `get_invoice_payment_instructions` now also authorises a payer with an active `payer_unit_links` row for the invoice's unit (previously refused, so payers could not see destinations). Nothing else about its authorisation changed.

Verified: tsc clean, eslint clean on touched paths, vitest 1941 passed. Not exercised in a browser; the migration is not applied.

## Addendum 2026-11-10 (e): confirmed money, sweeper, status lookup scope

**Defects found**
1. If Safaricom confirmed a payment but allocation then failed, the row stayed `pending`; the 15-minute sweeper marked it `failed` after 60 minutes. The ledger then showed no payment and no further callback would ever arrive. (Late callbacks were already revived; a failed *allocation* was not.)
2. `payment_transactions.mpesa_receipt_number` was never written by any code path, so the STK poller returned a null receipt and the sweeper could not tell confirmed from abandoned.
3. `verify-mpesa-payment` let any manager or submanager read any other manager's transaction (including the payer's phone number) by provider reference.

**Fixes** (migration 20260909000021, edge functions; not applied)
- `confirm_stk_receipt_atomic` stamps the receipt and actual paid amount before allocation (callback and poller). The sweeper skips rows carrying a receipt.
- `confirmed_unapplied_payments` + new `retry-confirmed-payments` job (service key only, replays through process-payment, idempotent). **Schedule it from Supabase cron every 5-10 minutes** (not scheduled by this change).
- `verify-mpesa-payment`: manager must own the transaction, submanager must belong to its manager; a shared reference returns the newest row instead of erroring.

Verified on throwaway Postgres: stamp once only, confirmed row survives the sweeper while an unconfirmed one expires, retry list returns only the confirmed one.

## Addendum 2026-11-11 (f): bank reconciliation, manual recording, receipt upload

**Defects found**
1. Bank webhook auto-match used substring matching: unit "A1" matched "A12", "1" matched any reference containing a 1, invoice "INV-1" matched "INV-12", and with several fitting tenants the first was credited (confidence 85-95).
2. The bulk matcher in `reconcile-bank` had the same flaw plus `includes("")` always true for an invoice with no number or unit, ignored part-paid bills, compared the full invoice amount rather than the balance, and re-queried 50 invoices per bank row.
3. Manual recording (`record-payment`), bank webhook auto-match and the Bank Reconciliation screen recorded the payment but issued no receipt and told nobody; the screen's toast claimed "receipt sent". Only process-payment announced payments.
4. `reconcile-bank` single receipts showed the full invoice amount, not what was paid, and a balance that ignored part-paid bills.
5. Approving an uploaded receipt that named no invoice marked it "verified" and recorded NO payment. The screen also found the manager by tenant e-mail address (breaks on duplicate e-mails) and sent a made-up invoice number.

**Fixes** (migration 20260909000022, `_shared/paymentAnnouncement.ts`, `_shared/bankMatching.ts`, new `announce-payment`)
- Whole-token matching with exactly one candidate tenant, in SQL and TypeScript; ambiguous items stay for manual review.
- `announcePayment` issues the receipt and sends payer/tenant/manager/landlord notices once per payment (`claim_payment_announcement_atomic`); used by process-payment's party path, record-payment, bank-webhook, reconcile-bank and, via `announce-payment` (owning manager or service key only), the two screens.
- Receipt approval always records the payment (oldest-first when no invoice) and returns the transaction id.

**Verified**: throwaway Postgres for the token function and claim (whole-token, punctuation, empty, once-only); migration compiles. tsc clean, vitest passes. Not run against the real schema or providers.

**Resolved in (g) below**: manual-payment payer attribution and the receipt balance source.

## Addendum 2026-11-11 (g): manual payer attribution and one balance source

**Defects found**
1. The manual Record payment dialog sent the registered payer, but `record-payment` discarded it: the transaction carried no payer, so the receipt, history and reports could not say who paid, and the payer was never sent a receipt.
2. Receipts from the shared announcer reported the sum of open invoice balances while the single-tenant receipt and the tenant portal use `get_tenant_balance` (original amounts, penalties, credit), so one payment could show two different balances.
3. The instalment-plan "total owed" ignored part-paid invoices.

**Fixes** (migration 20260909000023, `record-payment`)
- `record_payment_with_installment_atomic(..., p_payer_id)` replaces the old signature (dropped, not overloaded). The payer must be the tenant's own, active, in-date record under the same manager; it is stamped on the transaction (`paid_by_payer_id`, `payer_type`, `payer_name`) in the same call as the payment, never for a `self` payer. The edge function passes only the id; name/type/contacts come from the server record, so a client cannot attribute a payment to an arbitrary identity.
- `get_payment_receipt_parties` takes the balance from `get_tenant_balance` and, for payer-attributed payments, falls back to the registered payer's name, e-mail and phone (organisation name preferred) so the payer is sent their own receipt.
- Instalment owed includes `partially_paid`.

**Verified** on throwaway Postgres: attributed payment stamped; inactive payer and another tenant's payer refused; `self` and no-payer record unattributed; receipt parties return the payer and a balance (9,300) equal to `get_tenant_balance` (the old sum would have said 7,000). tsc/eslint/vitest below.

**Resolved in (h) below**: payer share enforcement.

## Addendum 2026-11-11 (h): payer share enforcement (split arrangements)

**Defect**: `payment_payers.pays_amount` / `pays_percentage` (a parent covers 60%, an employer a fixed amount) were stored and displayed but never applied; any payer could record any amount against any invoice, so a split arrangement could be paid in full by one party.

**Rule (migration 20260909000024)**: per invoice, a payer's cumulative contribution may not exceed their share of the invoice's original amount (rent, not penalties): `pays_amount` if set (capped at the invoice amount), else `pays_percentage`. No limit set = unlimited; `self` is never capped. Checked after allocation (exact however the payment spread) inside `record_payment_with_installment_atomic`; a breach raises and rolls back the whole payment with a message naming the share, what the payer already paid and what the payment adds. `get_payer_share_status(tenant, payer)` (manager/submanager of that tenant only) feeds the Record payment dialog, which shows the remaining share and disables submit when the amount exceeds it.

**Verified** on throwaway Postgres: 60% of 12,000 = 7,200 (5,000 + 2,000 ok, +300 refused, exactly the last 200 allowed); fixed 2,000 payer (2,000 ok, +1 refused); unlimited payer and `self` unconstrained; refused payments left no transaction or allocation behind; share status correct.

**Decisions to confirm**: no manager override (changing the payer's share is the way to allow more); when both a fixed amount and a percentage are set the fixed amount wins; penalties are outside the share; enforcement covers manual recording only (the payer portal uses separate payer-party links without shares).
