import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";

import { requireEnv, getEnv } from "../_shared/env.ts";
import { identifyUserServiceOrCron } from "../_shared/assertCaller.ts";
import { createClient } from "supabase/supabase-js@2";
import { checkRoleAccess } from "../_shared/authorization.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { escapeHtml } from "../_shared/html.ts";
import { getFromAddress } from "../_shared/email.ts";
import { tryFormatPhoneNumber } from "../_shared/sms.ts";
import { callerOwnsTenantContact, callerIsWebhost, normaliseEmail } from "../_shared/notifyAuthz.ts";

const esc = (v: unknown) => escapeHtml(String(v ?? ""));
// eslint-disable-next-line no-control-regex -- intentionally strips control characters
const oneLine = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
const RESEND_API_KEY = getEnv("RESEND_API_KEY");

interface ReceiptStatusNotificationRequest {
  tenantEmail: string;
  tenantName: string;
  tenantPhone?: string;
  status: 'verified' | 'rejected';
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  rejectionReason?: string;
}

const sendEmail = async (to: string, subject: string, html: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromAddress("CALQULUS RMS"),
      to: [to],
      subject,
      html,
    }),
  });
  return response.json();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const gate = await identifyUserServiceOrCron(req);
  if (!gate.ok) return gate.response;

  // No tenant/receipt id is passed here (raw tenantEmail/tenantPhone), so we
  // can't verify the specific tenant relationship — but require the caller
  // be an approved manager/submanager/webhost (the real caller,
  // ReceiptVerification.tsx), closing the "any authenticated user" hole.
  if (gate.userId) {
    const access = await checkRoleAccess(gate.userId, ["manager", "submanager", "webhost"]);
    if (!access.allowed) {
      return new Response(JSON.stringify({ error: access.error ?? "Forbidden" }), {
        status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
  }

  if (gate.userId) {
    const rlSupabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const rateOk = await checkRateLimit(rlSupabase, gate.userId, "send-receipt-status-notification", 60, { failClosed: true });
    if (!rateOk) return rateLimitResponse(req);
  }

  try {
    const {
      tenantEmail,
      tenantName,
      tenantPhone,
      status,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      rejectionReason,
    }: ReceiptStatusNotificationRequest = await req.json();

    if (status !== 'verified' && status !== 'rejected') {
      return new Response(JSON.stringify({ error: "status must be 'verified' or 'rejected'" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    const recipientEmail = normaliseEmail(tenantEmail);
    const amountNum = Number(amount);
    if (!recipientEmail || !Number.isFinite(amountNum)) {
      return new Response(JSON.stringify({ error: "A valid tenantEmail and numeric amount are required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    const smsPhone = tenantPhone ? tryFormatPhoneNumber(tenantPhone) : null;

    // Recipient (email and phone) must belong to one of the caller's tenants.
    if (gate.userId) {
      const admin = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
      if (!(await callerIsWebhost(admin, gate.userId))) {
        const emailOk = await callerOwnsTenantContact(admin, gate.userId, { email: recipientEmail });
        const phoneOk = !smsPhone || await callerOwnsTenantContact(admin, gate.userId, { phone: smsPhone });
        if (!emailOk || !phoneOk) {
          return new Response(JSON.stringify({ error: "Forbidden: recipient is not one of your tenants" }),
            { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
        }
      }
    }

    const safeReason = oneLine(rejectionReason, 300);
    const isVerified = status === 'verified';
    const statusColor = isVerified ? '#23856B' : '#C84B4B';
    const statusText = isVerified ? 'Verified' : 'Rejected';
    const emoji = isVerified ? '✅' : '❌';

    // Send email notification
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #6b7280; }
          .value { font-weight: 600; }
          .rejection-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emoji} Payment Receipt ${statusText}</h1>
          </div>
          <div class="content">
            <p>Dear ${esc(tenantName)},</p>
            <p>${isVerified 
              ? 'Great news! Your payment receipt has been verified by your landlord.' 
              : 'Unfortunately, your payment receipt has been rejected.'}</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value">KES ${esc(amountNum.toLocaleString())}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payment Date:</span>
                <span class="value">${esc(paymentDate)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payment Method:</span>
                <span class="value">${esc(paymentMethod)}</span>
              </div>
              ${referenceNumber ? `
              <div class="detail-row">
                <span class="label">Reference:</span>
                <span class="value">${esc(referenceNumber)}</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value" style="color: ${statusColor}">${statusText}</span>
              </div>
            </div>
            
            ${!isVerified && safeReason ? `
            <div class="rejection-box">
              <strong>Reason for Rejection:</strong>
              <p>${esc(safeReason)}</p>
              <p style="margin-top: 10px; font-size: 14px;">Please upload a new receipt with the correct information or contact your landlord for clarification.</p>
            </div>
            ` : ''}
            
            ${isVerified ? '<p>Thank you for your payment!</p>' : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from CALQULUS RMS.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await sendEmail(
      recipientEmail,
      `${emoji} Payment Receipt ${statusText} - KES ${amountNum.toLocaleString()}`,
      emailHtml
    );

    // Send SMS notification if phone number provided
    if (smsPhone) {
      const smsMessage = isVerified
        ? `✅ CALQULUS RMS: Your payment receipt for KES ${amountNum.toLocaleString()} has been VERIFIED. Thank you!`
        : `❌ CALQULUS RMS: Your payment receipt for KES ${amountNum.toLocaleString()} was REJECTED. ${safeReason ? `Reason: ${safeReason}` : 'Please check your email for details.'}`;

      // Use Africa's Talking for SMS
      const atApiKey = getEnv("AT_API_KEY");
      const atUsername = getEnv("AT_USERNAME");

      if (atApiKey && atUsername) {
        try {
          const smsResponse = await fetch("https://api.africastalking.com/version1/messaging", {
            method: "POST",
            headers: {
              "apiKey": atApiKey,
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json",
            },
            body: new URLSearchParams({
              username: atUsername,
              to: smsPhone,
              message: smsMessage,
            }),
          });

          const smsResult = await smsResponse.json();
        } catch (smsError) {
          console.error("[RECEIPT-STATUS] SMS error:", smsError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[RECEIPT-STATUS] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
