/**
 * unsubscribe/index.ts
 *
 * Email unsubscribe for optional (reminder/marketing) mail.
 *   GET  ?token=...  -> confirmation page (a GET never changes anything, so
 *                       mail scanners that prefetch links cannot unsubscribe anyone)
 *   POST ?token=...  -> verifies the signed token and persists the opt-out.
 *                       Also serves RFC 8058 one-click (List-Unsubscribe-Post).
 * Tokens are HMAC-signed (UNSUBSCRIBE_SIGNING_SECRET), bind one address, and
 * cannot change any other recipient's preferences. Essential messages
 * (receipts, invoices, security) are unaffected. Configure verify_jwt = false.
 */
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { verifyUnsubscribeToken } from "../_shared/unsubscribeToken.ts";

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:480px;margin:10vh auto;padding:0 16px;line-height:1.5"><h1 style="font-size:1.25rem">${title}</h1>${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
  );

serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const secret = getEnv("UNSUBSCRIBE_SIGNING_SECRET", "");
  const verified = await verifyUnsubscribeToken(secret, token);

  if (!verified.valid) {
    return page("This link is not valid", "<p>The unsubscribe link is invalid or has expired. Reply STOP to any SMS, or contact the sender, to change your preferences.</p>", 400);
  }

  if (req.method === "GET") {
    // Do not echo the address; token is only reflected inside an attribute after strict base64url validation.
    const safe = /^[A-Za-z0-9_.-]+$/.test(token) ? token : "";
    return page(
      "Unsubscribe from reminders",
      `<p>Confirm that you no longer want payment reminder emails. Receipts, invoices and security messages will still be sent.</p><form method="POST" action="?token=${safe}"><button type="submit" style="padding:10px 18px">Unsubscribe</button></form>`,
    );
  }

  if (req.method !== "POST") return page("Method not allowed", "", 405);

  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const { error } = await admin.rpc("record_comms_opt_out", {
    p_channel: verified.payload.channel, p_address: verified.payload.address, p_source: "email_unsubscribe",
  });
  if (error) {
    console.error("[unsubscribe] persist failed", error.code ?? "");
    return page("Something went wrong", "<p>We could not save your preference. Please try again later.</p>", 500);
  }
  return page("You are unsubscribed", "<p>You will no longer receive reminder emails at this address.</p>");
});
