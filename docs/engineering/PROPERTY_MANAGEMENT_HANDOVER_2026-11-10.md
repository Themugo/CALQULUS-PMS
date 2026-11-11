# Property management handover (independent landlord <-> agency)

Rule: a property always belongs to its owner (the landlord). Who OPERATES it can change: the landlord alone with family or a hired team, then an agency or manager, then back again. No record is ever deleted.

Migration `20260909000017_property_management_handover.sql` (UNAPPLIED; verified on throwaway Postgres with stub tables, 24 checks).

## Flow
- Owner -> agency/manager: owner enters the agency's account email, the agency accepts (Management requests card). Until then nothing changes. Declined or cancelled requests are kept as history.
- Back to the owner: either party, immediately, no acceptance (owner "Take it back", or the agency hands back).
- Only the owner can choose a new operator. An operator can only hand back to the owner.
- Blocked for a few minutes while an STK/payment on the property is pending.

## What moves with the property (manager_id follows)
Properties, tenants, and every operational table that has manager_id plus property_id, unit_id or tenant_id (leases, invoices, payments, allocations, receipts, maintenance, documents, tenant credit ledger, payers, notices...), discovered from the live schema at run time. Tenants that also rent elsewhere keep their other records with the old operator.

## What stays with the departing operator (their own books)
Ledger accounts/journals, financial close, bank details and transactions, payout batches and settlement audit, commissions, vendors, messages and notifications, submanager setup. Decided: the departing agency/manager keeps READ-ONLY access to the records of its own period (migration `20260909000018_departed_operator_archive_access.sql`). Window = from when it took the property over to the handover; eight whitelisted record types (invoices, payments, allocations, receipts, leases, maintenance, expenses, physical receipts); no tenant profiles; secret-looking columns stripped; CSV download from the landlords screen; access lapses 7 years after the handover. Records are shown as they are now, so an invoice from its period that was paid later by the new operator shows as paid. The owner's own earlier period needs no archive because the owner keeps everything.

## Safety rules applied
- The departing operator's own collection accounts for the property are switched off (kept, not deleted) so tenants are never shown a departed agency's paybill. The owner's own accounts are never touched.
- Old mandate -> ended; active agency contract rule -> expired (rows kept). Handing back sets the link to landlord_self_managed with no managing party. Handing to an agency defaults to "landlord collects" until they agree another arrangement (existing mandate and contract screens).
- Every transfer is recorded in `property_management_transfers` (who, when, counts moved) and `audit_logs`.
- All-or-nothing: any failure rolls the whole handover back.

## Open items
- Not run against the live schema. If a table has a trigger that rejects manager_id changes, the handover fails safely and nothing moves.
- No email/SMS notification to the other party yet (they see it in-app).
- Tenant-facing notice that their property manager changed is not sent.
