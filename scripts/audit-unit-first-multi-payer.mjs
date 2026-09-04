import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20260904000004_unit_first_multi_payer_bulk_payments.sql','utf8');
const required=['payment_parties','payer_unit_links','payment_receipts','process_payer_payment_atomic','get_portal_billing_units','payer_party_id','payment_allocations','receipt_number'];
for(const x of required) if(!sql.includes(x)) throw new Error(`Missing ${x}`);
let depth=0; for(const c of sql){if(c==='(')depth++; if(c===')')depth--; if(depth<0)throw new Error('Unbalanced parentheses');}
if(depth!==0)throw new Error('Unbalanced parentheses');
console.log('UNIT_FIRST_MULTI_PAYER_AUDIT=PASS');
