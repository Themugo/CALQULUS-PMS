# Phase 2F Test Matrix

Run in an isolated copy with Node; Deno is unavailable, so edge functions are covered by pure-module unit tests and static assertions, **Deno tests: NOT RUN**.

| Control | Test file | Kind | Result |
|---|---|---|---|
| Dedup: 20 concurrent senders → 1 send; duplicate_sent; reject releases; unknown keeps claim until lease; throw=unknown; 42P01/42883/42501/other fail closed; network error fails closed | `src/test/phase2fCommsCore.test.ts` | unit (in-memory RPC model) | pass |
| Dedup SQL under real concurrency (12 parallel claims → 1) | local Postgres 16 session (not a repo test) | manual, executed | pass |
| Email sender: missing/blank/placeholder/sandbox/invalid rejected; valid `Name <addr>` accepted; display-name sanitised; provider never called on bad config; 200/4xx/429/5xx/timeout classified; secrets redacted | `phase2fCommsCore.test.ts` | unit | pass |
| Comms policy: security always; transactional email vs SMS opt-out; lookup failure fails closed; marketing consent; quiet hours config validation, wrap past midnight, retryAfter, scope | `phase2fCommsCore.test.ts` | unit | pass |
| STOP/START keyword parsing; address normalisation | `phase2fCommsCore.test.ts` | unit | pass |
| Unsubscribe token: round-trip, tamper, wrong secret, expired, malformed, weak secret | `phase2fCommsCore.test.ts` | unit | pass |
| Inbound SMS: Twilio HMAC-SHA1 signature, shared secret, parser | `phase2fCommsCore.test.ts` | unit | pass |
| Token: 64-hex generation, shape validation, SHA-256 vector; phone normaliser | `phase2fCommsCore.test.ts` | unit | pass |
| Tenant claim consent: unapproved manager, cross-property, unknown email (no row), wrong tenant, no auth, garbage token, 8 concurrent accepts → 1, replay, expiry, direct request RPC denied | local Postgres 16 session | manual, executed | pass |
| Token hash storage: legacy tokens still validate, new tokens hash-only, 6 concurrent consumes → 1, replay denied, resend revokes older, anon/authenticated denied | local Postgres 16 session | manual, executed | pass |
| Auth email lookup RPC: idempotent, case/space insensitive, authenticated denied | local Postgres 16 session | manual, executed | pass |
| Migrations: additive, unique versions, search_path pinned, service_role-only grants, no earlier migration edited | `phase2fStatic.test.ts` | static | pass |
| No sandbox/invented sender in any function; getFromAddress has no fallback | `phase2fStatic.test.ts` | static | pass |
| Activation links not returned; agency creation ignores body portalUrl, no existence leak, explicit role grant; hash-only admin invite; activate-account consume + token shape | `phase2fStatic.test.ts` | static | pass |
| Public endpoints authenticated by signature/secret (`unsubscribe`, `sms-inbound-webhook`) | `phase2fStatic.test.ts` | static | pass |
| SMS/WhatsApp pass the policy gate; bootstrap-webhost disabled outside local dev | `phase2fStatic.test.ts` | static | pass |
| Financial callback: M-Pesa `resultDesc` read correctly; Daraja ack shape | `phase2fStatic.test.ts` + existing financial suites | static + suites | pass |
| HTML escaping in receipt/invoice/report senders; rent report shared sender and schedule advance | `phase2fStatic.test.ts` | static | pass |
| Claim page fragment token + URL scrub; consent persisted via RPC; agency UI shows no link | `phase2fStatic.test.ts` | static | pass |
| Existing hardening assertions (updated to new behaviour) | `registrationCommsHardening.test.ts`, `agencyLandlordAccountWorkspace.test.ts` | static | pass |

Not covered by automated tests: Deno runtime execution of any edge function, live provider delivery, live Supabase Auth behaviour, browser UI flows for the claim page.
