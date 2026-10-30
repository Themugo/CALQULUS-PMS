import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { getEnv } from "../_shared/env.ts";
import { identifyUserServiceOrCron } from "../_shared/assertCaller.ts";
import { checkRoleAccess } from "../_shared/authorization.ts";
import { callerIsWebhost } from "../_shared/notifyAuthz.ts";
import { escapeHtml } from "../_shared/html.ts";
import { sendEmail as sendResendEmail } from "../_shared/email.ts";
import { buildDedupKey, outcomeFromError, type SendOutcome } from "../_shared/notificationDedup.ts";
import { sendChannelOnce } from "../_shared/channelSend.ts";
import { emailOutcome } from "../_shared/emailConfig.ts";
import { buildUnsubscribeLink } from "../_shared/unsubscribe.ts";
import { tryFormatPhoneNumber } from "../_shared/sms.ts";

const maskEmail = (e: string) => String(e ?? "").replace(/^(.).*(@.*)$/, "$1***$2");
const maskPhone = (p: string) => String(p ?? "").replace(/.(?=.{3})/g, "*");
const esc = (v: unknown) => escapeHtml(String(v ?? ""));
const RESEND_API_KEY = getEnv("RESEND_API_KEY");

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[send-payment-reminders] ${step}${detailsStr}`);
};

interface TenantInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null; // NEW: for WhatsApp
}

interface InvoiceWithTenant {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  description: string | null;
  status: string;
  tenants: TenantInfo | null;
}

const sendEmail = async (to: string, subject: string, html: string, headers?: Record<string, string>) => {
  const result = await sendResendEmail({ to: [to], subject, html, displayName: "CALQULUS RMS", headers });
  if (!result.ok) {
    // Coarse, secret-free message; outcome drives dedup release vs. in-flight.
    const message = result.kind === "config"
      ? `email sender not configured (${result.code})`
      : result.kind === "rejected" ? `provider rejected (${result.status})` : "provider unavailable";
    throw Object.assign(new Error(message), { sendOutcome: emailOutcome(result) });
  }
  return result;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const gate = await identifyUserServiceOrCron(req);
  if (!gate.ok) return gate.response;


  try {
    logStep("Function started");

    const supabaseClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Previously ANY authenticated user could trigger this platform-wide job,
    // which queried ALL pending/overdue invoices with no manager scoping —
    // meaning a single manager clicking "Send Reminders Now" would email/SMS/
    // WhatsApp every tenant across every OTHER manager's portfolio too.
    // Require an approved manager/submanager/webhost role, and — unless the
    // caller is a webhost (platform-wide is expected there) or cron — scope
    // the run to just the calling manager's own tenants.
    let scopeManagerId: string | null = null;
    if (gate.userId) {
      const access = await checkRoleAccess(gate.userId, ["manager", "submanager", "webhost"]);
      if (!access.allowed) {
        return new Response(JSON.stringify({ error: access.error ?? "Forbidden" }), {
          status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const isWebhost = await callerIsWebhost(supabaseClient, gate.userId);
      if (!isWebhost) {
        const { data: subRel } = await supabaseClient
          .from("manager_submanagers")
          .select("manager_id")
          .eq("submanager_user_id", gate.userId)
          .maybeSingle();
        scopeManagerId = subRel?.manager_id ?? gate.userId;
      }
    }

    let scopedTenantIds: string[] | null = null;
    if (scopeManagerId) {
      const { data: scopedTenants } = await supabaseClient
        .from("tenants")
        .select("id")
        .eq("manager_id", scopeManagerId);
      scopedTenantIds = (scopedTenants ?? []).map((t) => t.id);
      if (scopedTenantIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No reminders to send", sent: 0 }),
          { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
    }

    const today = new Date();
    
    // Reminder schedule: 5 days before due date
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(today.getDate() + 1);
    
    // For overdue: 1+ day past due date
    const oneDayAgo = new Date(today);
    oneDayAgo.setDate(today.getDate() - 1);

    // Format dates for comparison
    const todayStr = today.toISOString().split('T')[0];
    const fiveDaysStr = fiveDaysFromNow.toISOString().split('T')[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];
    const oneDayStr = oneDayFromNow.toISOString().split('T')[0];
    const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0];

    logStep("Date ranges", { todayStr, oneDayStr, threeDaysStr, fiveDaysStr, oneDayAgoStr });

    // Fetch pending/overdue invoices with tenant info
    let invoicesQuery = supabaseClient
      .from('invoices')
      .select(`
        id,
        invoice_number,
        amount,
        due_date,
        description,
        status,
        tenant_id,
        tenants (
          id,
          name,
          email,
          phone,
          whatsapp
        )
      `)
      .in('status', ['pending', 'overdue'])
      .lte('due_date', fiveDaysStr); // Start reminders 5 days before due
    if (scopedTenantIds) {
      invoicesQuery = invoicesQuery.in('tenant_id', scopedTenantIds);
    }
    const { data: invoices, error: invoicesError } = await invoicesQuery
      .order('due_date', { ascending: true });

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    logStep("Invoices found", { count: invoices?.length || 0 });

    if (!invoices || invoices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No reminders to send", sent: 0 }),
        { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const atApiKey = getEnv("AFRICASTALKING_API_KEY");
    const atUsername = getEnv("AFRICASTALKING_USERNAME");
    const WHATSAPP_ACCESS_TOKEN = getEnv("WHATSAPP_ACCESS_TOKEN");
    const PHONE_NUMBER_ID = getEnv("PHONE_NUMBER_ID");

    let emailsSent = 0;
    let smsSent = 0;
    let whatsappSent = 0;
    const errors: string[] = [];

    for (const invoice of invoices) {
      // tenants comes as an array from the join, take the first one
      const tenantData = invoice.tenants as unknown;
      const tenant = Array.isArray(tenantData) ? tenantData[0] as TenantInfo : tenantData as TenantInfo | null;
      if (!tenant) continue;

      const dueDate = new Date(invoice.due_date);
      
      // Calculate days until due (negative = past due)
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Overdue: 1+ day AFTER due date (daysUntilDue < -1)
      const isOverdue = daysUntilDue < -1;
      const isDueToday = invoice.due_date === todayStr;
      const isDueTomorrow = invoice.due_date === oneDayStr;
      const isDueIn3Days = daysUntilDue <= 3 && daysUntilDue > 1;
      const isDueIn5Days = daysUntilDue <= 5 && daysUntilDue > 3;

      // Determine reminder type
      let reminderType = '';
      let urgency = '';
      
      if (isOverdue) {
        reminderType = 'overdue';
        urgency = '🚨 OVERDUE';
      } else if (isDueToday) {
        reminderType = 'due_today';
        urgency = '⚠️ DUE TODAY';
      } else if (isDueTomorrow) {
        reminderType = 'due_tomorrow';
        urgency = '⏰ DUE TOMORROW';
      } else if (isDueIn3Days) {
        reminderType = 'upcoming_3_days';
        urgency = '📅 DUE IN 3 DAYS';
      } else if (isDueIn5Days) {
        reminderType = 'upcoming_5_days';
        urgency = '📅 DUE IN 5 DAYS';
      } else {
        continue; // Skip invoices not matching our reminder criteria
      }

      logStep(`Processing invoice ${invoice.invoice_number}`, { 
        tenant: "[redacted]", 
        reminderType,
        dueDate: invoice.due_date 
      });

      // Send email (opt-out re-checked, then claimed once per invoice per day)
      const emailResult = await sendChannelOnce({
        client: supabaseClient, channel: "email", category: "reminder", address: tenant.email,
        key: buildDedupKey({ type: "reminder-email", subject: invoice.id }),
        send: async (): Promise<SendOutcome> => {
      try {
        const unsub = await buildUnsubscribeLink(tenant.email, "reminders");
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: ${isOverdue ? '#ef4444' : isDueToday ? '#f59e0b' : '#3b82f6'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .invoice-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${isOverdue ? '#ef4444' : '#3b82f6'}; }
              .amount { font-size: 28px; font-weight: bold; color: ${isOverdue ? '#ef4444' : '#1e293b'}; }
              .due-date { color: ${isOverdue ? '#ef4444' : '#6b7280'}; font-weight: 600; }
              .cta-button { display: inline-block; background: #2F6FED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 15px; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${urgency}</h1>
                <p>Payment Reminder</p>
              </div>
              <div class="content">
                <p>Dear ${esc(tenant.name)},</p>
                <p>${isOverdue 
                  ? 'Your rent payment is now overdue. Please make payment immediately to avoid any penalties.' 
                  : isDueToday 
                    ? 'This is a reminder that your rent payment is due today.'
                    : isDueTomorrow
                      ? 'This is a friendly reminder that your rent payment is due tomorrow.'
                      : 'This is a friendly reminder about your upcoming rent payment.'}</p>
                
                <div class="invoice-box">
                  <p><strong>Invoice:</strong> ${esc(invoice.invoice_number)}</p>
                  <p class="amount">KES ${invoice.amount.toLocaleString()}</p>
                  <p class="due-date">Due: ${new Date(invoice.due_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                  ${invoice.description ? `<p>${esc(invoice.description)}</p>` : ''}
                </div>
                
                <p>Please log in to your tenant portal to view payment options and make your payment.</p>
                
                <p style="margin-top: 20px;">Thank you for your prompt attention to this matter.</p>
              </div>
              <div class="footer">
                <p>This is an automated reminder from CALQULUS RMS.</p>
                ${unsub ? unsub.footerHtml : ""}
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail(
          tenant.email,
          `${urgency} - Rent Payment KES ${invoice.amount.toLocaleString()} - ${invoice.invoice_number}`,
          emailHtml,
          unsub?.headers
        );

        emailsSent++;
        logStep(`Email sent to ${maskEmail(tenant.email)}`);
        return "sent";
      } catch (emailError: any) {
        errors.push(`Email to ${maskEmail(tenant.email)}: ${emailError.message}`);
        logStep(`Email error for ${maskEmail(tenant.email)}`, { error: emailError.message });
        return outcomeFromError(emailError);
      }
        },
      });
      if (emailResult.status === "skipped") logStep("Email skipped", { invoice: invoice.invoice_number, reason: emailResult.reason });

      // Send SMS
      const smsPhone = tenant.phone ? tryFormatPhoneNumber(tenant.phone) : null;
      if (smsPhone && atApiKey && atUsername) {
        const smsGuard = await sendChannelOnce({
          client: supabaseClient, channel: "sms", category: "reminder", address: smsPhone,
          key: buildDedupKey({ type: "reminder-sms", subject: invoice.id }),
          send: async (): Promise<SendOutcome> => {
        try {
          const smsMessage = isOverdue
            ? `🚨 OVERDUE: Your rent payment of KES ${invoice.amount.toLocaleString()} (${invoice.invoice_number}) is overdue. Please pay immediately.`
            : isDueToday
              ? `⚠️ DUE TODAY: Your rent of KES ${invoice.amount.toLocaleString()} is due today. Please make payment.`
              : isDueTomorrow
                ? `⏰ REMINDER: Your rent of KES ${invoice.amount.toLocaleString()} is due tomorrow.`
                : isDueIn3Days
                  ? `📅 REMINDER: Your rent of KES ${invoice.amount.toLocaleString()} is due in 3 days.`
                  : `📅 REMINDER: Your rent of KES ${invoice.amount.toLocaleString()} is due in 5 days on ${invoice.due_date}.`;

          const isSandbox = atUsername.toLowerCase() === "sandbox";
          const smsResponse = await fetch(
            isSandbox
              ? "https://api.sandbox.africastalking.com/version1/messaging"
              : "https://api.africastalking.com/version1/messaging",
            {
            method: "POST",
            headers: {
              "apiKey": atApiKey,
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json",
            },
            body: new URLSearchParams({
              username: atUsername,
              to: smsPhone,
              message: `${smsMessage} Reply STOP to opt out.`,
            }),
            }
          );

          const responseText = await smsResponse.text();
          let smsResult: Record<string, any> = {};
          try {
            smsResult = responseText ? JSON.parse(responseText) : {};
          } catch {
            smsResult = { rawResponse: responseText };
          }

          const recipientStatus = smsResult.SMSMessageData?.Recipients?.[0]?.status;
          if (!smsResponse.ok || recipientStatus !== "Success") {
            throw new Error(
              typeof recipientStatus === "string"
                ? recipientStatus
                : smsResponse.statusText || "Africa's Talking SMS failed"
            );
          }

          smsSent++;
          logStep(`SMS sent to ${maskPhone(smsPhone)}`);
          return "sent";
        } catch (smsError: any) {
          errors.push(`SMS to ${maskPhone(smsPhone)}: ${smsError.message}`);
          logStep(`SMS error for ${maskPhone(smsPhone)}`, { error: smsError.message });
          return outcomeFromError(smsError);
        }
          },
        });
        if (smsGuard.status === "skipped") logStep("SMS skipped", { invoice: invoice.invoice_number, reason: smsGuard.reason });
      }

      // Send WhatsApp
      const waPhone = tenant.whatsapp ? tryFormatPhoneNumber(tenant.whatsapp) : null;
      if (waPhone && WHATSAPP_ACCESS_TOKEN && PHONE_NUMBER_ID) {
        const waGuard = await sendChannelOnce({
          client: supabaseClient, channel: "whatsapp", category: "reminder", address: waPhone,
          key: buildDedupKey({ type: "reminder-whatsapp", subject: invoice.id }),
          send: async (): Promise<SendOutcome> => {
        try {
          const whatsappMessage = isOverdue
            ? `🚨 *PAYMENT OVERDUE*\n\nYour rent payment of KES ${invoice.amount.toLocaleString()} (${invoice.invoice_number}) is overdue.\n\nPlease pay immediately to avoid penalties.`
            : isDueToday
              ? `⚠️ *PAYMENT DUE TODAY*\n\nYour rent of KES ${invoice.amount.toLocaleString()} is due today.\n\nPlease make payment now.`
              : isDueTomorrow
                ? `⏰ *PAYMENT DUE TOMORROW*\n\nYour rent of KES ${invoice.amount.toLocaleString()} is due tomorrow.\n\nPlease ensure payment is made on time.`
                : isDueIn3Days
                  ? `📅 *PAYMENT REMINDER*\n\nYour rent of KES ${invoice.amount.toLocaleString()} is due in 3 days.\n\nDue date: ${invoice.due_date}`
                  : `📅 *PAYMENT REMINDER*\n\nYour rent of KES ${invoice.amount.toLocaleString()} is due in 5 days.\n\nDue date: ${invoice.due_date}`;

          const formattedPhone = waPhone.replace('+', '');

          const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: formattedPhone,
              type: "text",
              text: {
                body: whatsappMessage
              }
            }),
          });

          const whatsappResult = await whatsappResponse.json();

          if (!whatsappResponse.ok) {
            throw new Error(whatsappResult.message || "WhatsApp failed");
          }

          whatsappSent++;
          logStep(`WhatsApp sent to ${maskPhone(waPhone)}`);
          return "sent";
        } catch (whatsappError: any) {
          errors.push(`WhatsApp to ${maskPhone(waPhone)}: ${whatsappError.message}`);
          logStep(`WhatsApp error for ${maskPhone(waPhone)}`, { error: whatsappError.message });
          return outcomeFromError(whatsappError);
        }
          },
        });
        if (waGuard.status === "skipped") logStep("WhatsApp skipped", { invoice: invoice.invoice_number, reason: waGuard.reason });
      }
    }

    logStep("Completed", { emailsSent, smsSent, whatsappSent, errors: errors.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payment reminders sent",
        emailsSent,
        smsSent,
        whatsappSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: "Failed to send payment reminders" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
