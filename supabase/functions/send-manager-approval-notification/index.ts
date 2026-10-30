import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
import { identifyUserServiceOrCron } from "../_shared/assertCaller.ts";
import { callerIsWebhost } from "../_shared/notifyAuthz.ts";
import { sendEmail } from "../_shared/email.ts";
import { escapeHtml } from "../_shared/html.ts";

interface ApprovalRequest {
  // Legacy fields
  userId?: string;
  status?: 'approved' | 'rejected';
  // New fields from ManagerManagement
  managerId?: string;
  managerEmail?: string;
  managerName?: string;
  note?: string;       // approval note
  reason?: string;     // rejection reason
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const gate = await identifyUserServiceOrCron(req);
  if (!gate.ok) return gate.response;


  try {
    const body: ApprovalRequest = await req.json();

    // Support both old (userId) and new (managerId) field names
    const userId     = body.managerId || body.userId;
    const status     = body.status || 'approved';
    const noteOrReason = body.reason || body.note || null;

    if (!userId) {
      return new Response(JSON.stringify({ error: "managerId is required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    // Only a webhost (account approval/rejection/suspension is a platform
    // admin action) may trigger this — previously any authenticated user
    // could call it. Enforce before doing anything else.
    if (gate.userId && !(await callerIsWebhost(supabaseClient, gate.userId))) {
      console.warn(`[MANAGER-NOTIFICATION] Forbidden: caller ${gate.userId} is not a webhost`);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Always resolve email/name from the database — a client-supplied
    // managerEmail/managerName previously overrode the DB lookup entirely,
    // letting a caller redirect this notification to an arbitrary address
    // while it still reads as an official "account approved/rejected/
    // suspended" message about a real userId.
    let email: string | undefined;
    let name = body.managerName || "Property Manager";
    {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single();
      if (!profile?.email) {
        console.warn(`[MANAGER-NOTIFICATION] No email for user ${userId} — skipping`);
        return new Response(JSON.stringify({ sent: false, reason: "no email found" }), {
          status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      email = profile.email;
      if (profile.full_name) name = profile.full_name;
    }

    // Untrusted text (profile name is user-controlled; note/reason is admin free text).
    const rawName = name;
    name = escapeHtml(String(name).slice(0, 200));
    const safeNote = noteOrReason ? escapeHtml(String(noteOrReason).slice(0, 1000)) : null;
    void rawName;

    const loginUrl = `${(getEnv("SITE_URL", "https://www.calqulus.site")).replace(/\/+$/, "")}/auth`;

    const subjects: Record<string, string> = {
      approved:   "Your CALQULUS RMS manager account has been approved 🎉",
      rejected:   "Update on your CALQULUS RMS account application",
      suspended:  "Your CALQULUS RMS account has been suspended",
    };

    const subject = subjects[status] ?? "Update on your CALQULUS RMS account";

    const bodyHtml = status === "approved" ? `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;">Account Approved! 🎉</h1>
        </div>
        <div style="background:#f8fafc;padding:30px;border-radius:0 0 8px 8px;">
          <p style="font-size:16px;color:#334155;">Hi ${name},</p>
          <p style="font-size:15px;color:#475569;">
            Great news — your CALQULUS RMS property manager account has been approved.
            You now have full access to the platform.
          </p>
          ${safeNote ? `<p style="font-size:14px;color:#64748b;background:#f1f5f9;padding:12px;border-radius:6px;border-left:3px solid #10b981;">Note from admin: ${safeNote}</p>` : ""}
          <div style="text-align:center;margin:28px 0;">
            <a href="${loginUrl}" style="background:#10b981;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">
              Log in to CALQULUS RMS
            </a>
          </div>
          <p style="font-size:13px;color:#94a3b8;">Get started by adding your first property, then invite your tenants.</p>
        </div>
      </div>
    ` : status === "rejected" ? `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#ef4444;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;">Account Application</h1>
        </div>
        <div style="background:#f8fafc;padding:30px;border-radius:0 0 8px 8px;">
          <p style="font-size:16px;color:#334155;">Hi ${name},</p>
          <p style="font-size:15px;color:#475569;">
            After reviewing your application, we're unable to approve your CALQULUS RMS manager account at this time.
          </p>
          ${safeNote ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:14px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#991b1b;font-weight:bold;">Reason:</p><p style="margin:6px 0 0;font-size:14px;color:#7f1d1d;">${safeNote}</p></div>` : ""}
          <p style="font-size:14px;color:#64748b;">
            If you believe this was a mistake or would like to appeal, please contact our support team.
          </p>
        </div>
      </div>
    ` : `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#f59e0b;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;">Account Suspended</h1>
        </div>
        <div style="background:#f8fafc;padding:30px;border-radius:0 0 8px 8px;">
          <p style="font-size:16px;color:#334155;">Hi ${name},</p>
          <p style="font-size:15px;color:#475569;">
            Your CALQULUS RMS account has been temporarily suspended. You will not be able to log in until this is resolved.
          </p>
          ${safeNote ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#92400e;font-weight:bold;">Reason:</p><p style="margin:6px 0 0;font-size:14px;color:#78350f;">${safeNote}</p></div>` : ""}
          <p style="font-size:14px;color:#64748b;">
            Please contact the platform administrator to resolve this matter and have your account reinstated.
          </p>
        </div>
      </div>
    `;

    // Shared fail-closed sender: no hard-coded address, classified result.
    const result = await sendEmail({ to: [email!], subject, html: bodyHtml, displayName: "CALQULUS" });
    if (!result.ok) {
      console.error("[MANAGER-NOTIFICATION] email not sent:", result.kind);
      return new Response(JSON.stringify({ sent: false, reason: result.kind === "config" ? "email_not_configured" : "email_failed" }), {
        status: result.kind === "config" ? 503 : 502, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const data = { id: result.id };

    return new Response(JSON.stringify({ sent: true, emailId: data?.id }), {
      status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[MANAGER-NOTIFICATION] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Unable to send notification" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
};

serve(handler);
