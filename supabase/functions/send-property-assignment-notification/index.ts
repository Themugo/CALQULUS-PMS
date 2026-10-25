import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { requireEnv, getEnv } from "../_shared/env.ts";
import { identifyUserServiceOrCron } from "../_shared/assertCaller.ts";
import { createClient } from "supabase/supabase-js@2";
import { checkRoleAccess } from "../_shared/authorization.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { escapeHtml } from "../_shared/html.ts";
import { getFromAddress } from "../_shared/email.ts";
import { callerOwnsSubmanagerEmail, callerIsWebhost, normaliseEmail } from "../_shared/notifyAuthz.ts";

// eslint-disable-next-line no-control-regex -- intentionally strips control characters
const esc = (v: unknown) => escapeHtml(String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 160));
const RESEND_API_KEY = getEnv("RESEND_API_KEY");

interface PropertyAssignmentRequest {
  submanagerEmail: string;
  submanagerName: string;
  managerName: string;
  propertyNames: string[];
  action: 'assigned' | 'updated' | 'removed';
}

Deno.serve(async (req: Request): Promise<Response> => {

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") return preflightResponse(req);

  const gate = await identifyUserServiceOrCron(req);
  if (!gate.ok) return gate.response;

  // No entity id is passed here (just a raw submanagerEmail string), so we
  // can't verify the caller actually manages that specific submanager —
  // but we can at least require the caller be an approved manager, which
  // is who this notification is legitimately sent on behalf of
  // (SubmanagerManagement.tsx). This closes the "any authenticated user of
  // any role" hole; a full fix would pass a submanagerId and re-derive the
  // email/name server-side.
  if (gate.userId) {
    const access = await checkRoleAccess(gate.userId, ["manager"]);
    if (!access.allowed) {
      return new Response(JSON.stringify({ error: access.error ?? "Forbidden" }), {
        status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
  }

  if (gate.userId) {
    const rlSupabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const rateOk = await checkRateLimit(rlSupabase, gate.userId, "send-property-assignment-notification", 60, { failClosed: true });
    if (!rateOk) return rateLimitResponse(req);
  }

  try {
    const { 
      submanagerEmail, 
      submanagerName, 
      managerName, 
      propertyNames,
      action 
    }: PropertyAssignmentRequest = await req.json();

    if (action !== 'assigned' && action !== 'updated' && action !== 'removed') {
      return new Response(JSON.stringify({ error: "action must be 'assigned', 'updated' or 'removed'" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    const recipientEmail = normaliseEmail(submanagerEmail);
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "A valid submanagerEmail is required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    if (action !== 'removed' && !Array.isArray(propertyNames)) {
      return new Response(JSON.stringify({ error: "propertyNames must be an array" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    const names: string[] = (Array.isArray(propertyNames) ? propertyNames : [])
      .filter((n): n is string => typeof n === "string").slice(0, 50);

    // Recipient must be a submanager of the caller's own organisation.
    if (gate.userId) {
      const admin = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
      if (!(await callerIsWebhost(admin, gate.userId)) &&
          !(await callerOwnsSubmanagerEmail(admin, gate.userId, recipientEmail))) {
        return new Response(JSON.stringify({ error: "Forbidden: recipient is not one of your submanagers" }),
          { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      }
    }

    let subject = '';
    let htmlContent = '';

    if (action === 'assigned') {
      subject = `You've been assigned to ${names.length} ${names.length === 1 ? 'property' : 'properties'}`;
      htmlContent = `
        <h1>Hello ${esc(submanagerName) || 'there'}!</h1>
        <p>${esc(managerName) || 'Your manager'} has assigned you to the following ${names.length === 1 ? 'property' : 'properties'}:</p>
        <ul>
          ${names.map(name => `<li><strong>${esc(name)}</strong></li>`).join('')}
        </ul>
        <p>You can now view and manage data for ${names.length === 1 ? 'this property' : 'these properties'} in your dashboard.</p>
        <p>Best regards,<br>CALQULUS RMS Team</p>
      `;
    } else if (action === 'updated') {
      subject = `Your property assignments have been updated`;
      htmlContent = `
        <h1>Hello ${esc(submanagerName) || 'there'}!</h1>
        <p>${esc(managerName) || 'Your manager'} has updated your property assignments.</p>
        ${names.length > 0 ? `
          <p>You now have access to the following ${names.length === 1 ? 'property' : 'properties'}:</p>
          <ul>
            ${names.map(name => `<li><strong>${esc(name)}</strong></li>`).join('')}
          </ul>
        ` : '<p>You currently have no specific property restrictions and can view all properties.</p>'}
        <p>Best regards,<br>CALQULUS RMS Team</p>
      `;
    } else if (action === 'removed') {
      subject = `Property restrictions removed`;
      htmlContent = `
        <h1>Hello ${esc(submanagerName) || 'there'}!</h1>
        <p>${esc(managerName) || 'Your manager'} has removed your property restrictions.</p>
        <p>You now have access to view all properties in the system.</p>
        <p>Best regards,<br>CALQULUS RMS Team</p>
      `;
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: getFromAddress("CALQULUS RMS"),
        to: [recipientEmail],
        subject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Failed to send property assignment email:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-property-assignment-notification:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
