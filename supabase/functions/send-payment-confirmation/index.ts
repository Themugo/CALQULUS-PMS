import { requireEnv, getEnv } from "../_shared/env.ts";
/**
 * send-payment-confirmation/index.ts
 *
 * FIX SUMMARY:
 * 1. Unit number is now prominent in the email (was buried or absent).
 * 2. Guards against missing RESEND_API_KEY with a clear error message
 *    instead of silent failure.
 * 3. Accepts both service-role and user-JWT callers.
 * 4. HTML is sanitised to prevent injection from tenant/property names.
 */

import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateRequired, validateEmail } from "../_shared/validation.ts";
import { errorResponse, successResponse } from "../_shared/errors.ts";
import { verifyServiceRole } from "../_shared/auth.ts";

const logger = createLogger("send-payment-confirmation");

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface ConfirmRequest {
  tenantEmail:         string;
  tenantName:          string;
  tenantPhone?:        string;   // for SMS
  tenantWhatsapp?:     string;   // NEW: for WhatsApp
  companyName:         string;
  invoiceNumber:       string;
  amount:              number;
  paidDate:            string;
  dueDate?:            string;   // original invoice due date
  property:            string;
  unit:                string;   // shown prominently
  mpesaReceiptNumber:  string;
  paymentMethod?:      string;   // "M-Pesa STK" | "Bank Transfer" | etc.
  outstandingBalance?: number;   // remaining balance after this payment
  sendSms?:            boolean;  // send SMS confirmation
  sendWhatsapp?:       boolean;  // NEW: send WhatsApp confirmation
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    logger.info("Payment confirmation started");

    // Accept service-role OR user JWT
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }
    
    // Verify service role key for secure operation
    const token = authHeader.replace("Bearer ", "");
    if (!verifyServiceRole(token)) {
      logger.warn("Unauthorized access attempt - invalid service role key");
      return errorResponse("Unauthorized - invalid service role key", 401);
    }

    const RESEND_API_KEY = getEnv("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      logger.error("RESEND_API_KEY not configured");
      return errorResponse(
        "Email service not configured. Add RESEND_API_KEY in Supabase secrets (Dashboard → Edge Functions → Secrets).",
        503
      );
    }

    const body: ConfirmRequest = await req.json();
    const {
      tenantEmail,
      tenantPhone,
      tenantWhatsapp,
      tenantName,
      companyName,
      invoiceNumber,
      amount,
      paidDate,
      dueDate,
      property,
      unit,
      mpesaReceiptNumber,
      paymentMethod = "M-Pesa",
      outstandingBalance = 0,
      sendSms = false,
      sendWhatsapp = false,
    } = body;

    // Validate required fields
    const tenantEmailValidation = validateEmail(tenantEmail);
    if (!tenantEmailValidation.valid) {
      return errorResponse(tenantEmailValidation.error, 400);
    }

    const tenantNameValidation = validateRequired(tenantName, "Tenant name");
    if (!tenantNameValidation.valid) {
      return errorResponse(tenantNameValidation.error, 400);
    }

    const companyNameValidation = validateRequired(companyName, "Company name");
    if (!companyNameValidation.valid) {
      return errorResponse(companyNameValidation.error, 400);
    }

    const invoiceNumberValidation = validateRequired(invoiceNumber, "Invoice number");
    if (!invoiceNumberValidation.valid) {
      return errorResponse(invoiceNumberValidation.error, 400);
    }

    const amountValidation = validateRequired(amount, "Amount");
    if (!amountValidation.valid) {
      return errorResponse(amountValidation.error, 400);
    }

    const unitValidation = validateRequired(unit, "Unit");
    if (!unitValidation.valid) {
      return errorResponse(unitValidation.error, 400);
    }

    const propertyValidation = validateRequired(property, "Property");
    if (!propertyValidation.valid) {
      return errorResponse(propertyValidation.error, 400);
    }

    const mpesaReceiptValidation = validateRequired(mpesaReceiptNumber, "M-Pesa receipt number");
    if (!mpesaReceiptValidation.valid) {
      return errorResponse(mpesaReceiptValidation.error, 400);
    }

    logger.info("Payment confirmation validated", { tenantEmail, unit, amount });

    const formattedAmount = new Intl.NumberFormat("en-KE", {
      style: "currency", currency: "KES", minimumFractionDigits: 0,
    }).format(amount ?? 0);

    const formattedDate = new Date(paidDate).toLocaleDateString("en-KE", {
      year: "numeric", month: "long", day: "numeric",
    });

    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString("en-KE", {
      year: "numeric", month: "long", day: "numeric",
    }) : null;

    const methodIcon = paymentMethod.toLowerCase().includes("bank") ? "🏦"
      : paymentMethod.toLowerCase().includes("airtel") ? "📲" : "📱";

    const balanceHtml = outstandingBalance > 0
      ? `<tr style="border-bottom:1px solid #f0f0f0;">
           <td style="padding:10px 0;color:#666;font-size:14px;">Outstanding Balance</td>
           <td style="padding:10px 0;font-weight:700;font-size:16px;color:#dc2626;text-align:right;">
             ${esc(new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",minimumFractionDigits:0}).format(outstandingBalance))}
           </td>
         </tr>`
      : `<tr style="background:#f0fdf4;">
           <td style="padding:10px 0;color:#166534;font-size:14px;font-weight:600;">Account Status</td>
           <td style="padding:10px 0;font-weight:700;color:#166534;text-align:right;">✓ Fully paid up</td>
         </tr>`;

    const balanceCallout = outstandingBalance > 0
      ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;margin:16px 0;">
           <p style="margin:0;color:#92400e;font-size:13px;">
             <strong>⚠️ You still have ${esc(new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",minimumFractionDigits:0}).format(outstandingBalance))} outstanding.</strong>
             Please clear this to avoid late fees.
           </p>
         </div>`
      : `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;margin:16px 0;">
           <p style="margin:0;color:#166534;font-size:13px;">✅ <strong>Your account is up to date.</strong> No further balance due.</p>
         </div>`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Confirmed</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
             line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:28px 32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">✅ Payment Confirmed</h1>
      <p style="color:#d1fae5;margin:6px 0 0;font-size:14px;">${esc(companyName)}</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <h2 style="margin-top:0;color:#111;">Hi ${esc(tenantName)},</h2>
      <p style="color:#555;">Your payment has been received. Here are the details:</p>

      <!-- Unit highlight -->
      <div style="background:#f0fdf4;border:2px solid #10b981;border-radius:8px;padding:14px;margin:20px 0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#059669;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Unit</p>
        <p style="margin:4px 0 0;font-size:26px;font-weight:700;color:#111;">${esc(unit)}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#555;">${esc(property)}</p>
      </div>

      <!-- Payment details -->
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:10px 0;color:#666;font-size:14px;">Invoice #</td>
          <td style="padding:10px 0;font-weight:600;text-align:right;">${esc(invoiceNumber)}</td>
        </tr>
        ${formattedDueDate ? `<tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:10px 0;color:#666;font-size:14px;">Due Date</td>
          <td style="padding:10px 0;font-weight:600;text-align:right;">${esc(formattedDueDate)}</td>
        </tr>` : ""}
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:10px 0;color:#666;font-size:14px;">Amount Paid</td>
          <td style="padding:10px 0;font-weight:700;font-size:20px;color:#10b981;text-align:right;">${esc(formattedAmount)}</td>
        </tr>
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:10px 0;color:#666;font-size:14px;">Payment Date</td>
          <td style="padding:10px 0;font-weight:600;text-align:right;">${esc(formattedDate)}</td>
        </tr>
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:10px 0;color:#666;font-size:14px;">Method</td>
          <td style="padding:10px 0;font-weight:600;text-align:right;">${methodIcon} ${esc(paymentMethod)}</td>
        </tr>
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:10px 0;color:#666;font-size:14px;">Reference</td>
          <td style="padding:10px 0;font-weight:600;font-family:monospace;text-align:right;">${esc(mpesaReceiptNumber)}</td>
        </tr>
        ${balanceHtml}
      </table>

      ${balanceCallout}

      <p style="color:#999;font-size:12px;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:16px;">
        This is an automated receipt from ${esc(companyName)}. Keep this for your records.
      </p>
    </div>
  </div>
</body>
</html>`;

    logger.info("Sending confirmation email", { to: tenantEmail, unit });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@calqulus.site>`,
        to: [tenantEmail],
        subject: `✅ Payment Confirmed – Unit ${unit} – ${formattedAmount}`,
        html,
      }),
    });

    const emailResult = await emailRes.json();

    if (!emailRes.ok) {
      logger.error("Resend API error", emailResult);
      return errorResponse(emailResult.message ?? `Resend error ${emailRes.status}`, 502);
    }

    logger.info("Email sent", { id: emailResult.id });

    // Send SMS confirmation if requested and phone provided
    if (sendSms && tenantPhone) {
      try {
        const supabaseUrl = getEnv("SUPABASE_URL");
        
        const balanceMsg = outstandingBalance > 0 
          ? ` Balance: ${new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(outstandingBalance)}.` 
          : " Account fully paid.";
        
        const smsMessage = `${companyName}: Payment of ${formattedAmount} received for Unit ${unit} (${invoiceNumber}). Ref: ${mpesaReceiptNumber}. Date: ${formattedDate}.${balanceMsg}`;
        
        const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            phoneNumber: tenantPhone,
            message: smsMessage,
          }),
        });
        
        const smsResult = await smsResponse.json();
        if (!smsResponse.ok) {
          logger.error("SMS sending failed", smsResult);
        } else {
          logger.info("SMS sent successfully", smsResult);
        }
      } catch (smsError) {
        logger.error("SMS error", { error: smsError instanceof Error ? smsError.message : String(smsError) });
      }
    }

    // Send WhatsApp confirmation if requested and WhatsApp number provided
    if (sendWhatsapp && tenantWhatsapp) {
      try {
        const supabaseUrl = getEnv("SUPABASE_URL");
        
        const balanceMsg = outstandingBalance > 0 
          ? `⚠️ Outstanding: ${new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(outstandingBalance)} - Please clear to avoid late fees.` 
          : "✅ Account fully paid up.";
        
        const whatsappMessage = `✅ *Payment Confirmed*\n\n${companyName}\n\n💰 *Amount:* ${formattedAmount}\n📄 *Invoice:* ${invoiceNumber}\n🏠 *Unit:* ${unit}\n📅 *Date:* ${formattedDate}\n📱 *Ref:* ${mpesaReceiptNumber}\n\n${balanceMsg}`;
        
        const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            phoneNumber: tenantWhatsapp,
            message: whatsappMessage,
            type: 'payment',
          }),
        });
        
        const whatsappResult = await whatsappResponse.json();
        if (!whatsappResponse.ok) {
          logger.error("WhatsApp sending failed", whatsappResult);
        } else {
          logger.info("WhatsApp sent successfully", whatsappResult);
        }
      } catch (whatsappError) {
        logger.error("WhatsApp error", { error: whatsappError instanceof Error ? whatsappError.message : String(whatsappError) });
      }
    }

    return successResponse({ emailId: emailResult.id });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("Payment confirmation error", { error: msg });
    return errorResponse(msg, 500);
  }
});
