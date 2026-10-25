/**
 * send-tenant-invitation/index.ts
 *
 * Sends tenant invitations via email, SMS, and WhatsApp.
 * Uses unified middleware for authentication, rate limiting, and logging.
 */

import { serve } from "std/http/server.ts";
import { getFromAddress } from "../_shared/email.ts";
import { getEnv } from "../_shared/env.ts";
import { formatPhoneNumber, sendSms } from "../_shared/sms.ts";
import { withMiddleware, validateUUID, validateRequired, errorResponse, successResponse } from "../_shared/middleware.ts";
import { resolveEffectiveManagerIds } from "../_shared/notifyAuthz.ts";
import { escapeHtml } from "../_shared/html.ts";

/** Strip control characters / newlines and cap length for text sent over email/SMS/WhatsApp. */
const cleanText = (v: unknown, max: number): string =>
  // eslint-disable-next-line no-control-regex -- intentionally strips control characters
  String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

// Optional vendor keys
const RESEND_API_KEY = getEnv("RESEND_API_KEY");
const WHATSAPP_ACCESS_TOKEN = getEnv("WHATSAPP_ACCESS_TOKEN");
const PHONE_NUMBER_ID = getEnv("PHONE_NUMBER_ID");

interface InvitationRequest {
  email?: string;
  phone?: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unit?: string;
  monthlyRent?: number;
  houseDeposit?: number;
  waterDeposit?: number;
}

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendSms(phone, message);
    return { success: result.success, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "SMS failed" };
  }
}

async function sendWhatsApp(
  phone: string,
  tenantName: string,
  propertyName: string,
  unit: string | undefined,
  invitationUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!WHATSAPP_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return { success: false, error: "WhatsApp provider not configured" };
  }

  try {
    const formattedPhone = formatPhoneNumber(phone).replace("+", "");

    const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
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
          body: `Hi ${tenantName}! 👋\n\nYou've been invited to join ${propertyName}${unit ? ` (Unit ${unit})` : ""} on CALQULUS RMS.\n\nClick the link below to create your tenant account:\n${invitationUrl}\n\nWith CALQULUS RMS, you can:\n✅ View your lease details\n✅ Pay rent online via M-Pesa\n✅ Submit maintenance requests\n✅ Download statements and receipts`,
        },
      }),
    });

    return { success: response.ok };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "WhatsApp failed" };
  }
}

serve(
  withMiddleware(
    {
      functionName: "send-tenant-invitation",
      allowedRoles: ["manager", "agency", "submanager"],
      rateLimit: { maxPerHour: 10, failClosed: false },
    },
    async (req, ctx) => {
      const body: InvitationRequest = await req.json();
      const { phone, propertyId, monthlyRent, houseDeposit, waterDeposit } = body;
      const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
      const tenantName = cleanText(body.tenantName, 120);
      const unit = body.unit ? cleanText(body.unit, 40) : undefined;
      // Display name is re-read from the database below; the request value is
      // only used to satisfy the required-field check.
      const requestedPropertyName = body.propertyName;
      let propertyName = cleanText(requestedPropertyName, 160);
      if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
        throw errorResponse("Invalid email address", 400);
      }

      // Validate required fields
      if (!tenantName || !propertyId || !propertyName) {
        throw errorResponse("Missing required fields: tenantName, propertyId, propertyName", 400);
      }

      if (!email && !phone) {
        throw errorResponse("At least one contact method (email or phone) is required", 400);
      }

      // Validate propertyId is a valid UUID
      const uuidValidation = validateUUID(propertyId);
      if (!uuidValidation.valid) {
        throw errorResponse(uuidValidation.error || "Invalid propertyId", 400);
      }

      // Verify the caller actually owns/manages this property before an
      // invitation binds a tenant (and eventually a unit/lease) to it.
      // Without this, one manager could invite a tenant into a completely
      // different manager's property, corrupting that manager's unit/rent
      // records once the invitation is accepted.
      const { data: propertyRow } = await ctx.supabase
        .from("properties")
        .select("manager_id, name")
        .eq("id", propertyId)
        .maybeSingle();

      if (!propertyRow) {
        throw errorResponse("Property not found", 404);
      }

      const { data: callerRoleRow } = await ctx.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", ctx.user!.id)
        .in("role", ["manager", "agency", "submanager"])
        .limit(1)
        .maybeSingle();
      const effectiveManagerIds = await resolveEffectiveManagerIds(
        ctx.supabase, ctx.user!.id, callerRoleRow?.role ?? "manager"
      );
      if (!propertyRow.manager_id || !effectiveManagerIds.has(propertyRow.manager_id)) {
        throw errorResponse("Forbidden: this property is not in your managed portfolio", 403);
      }

      if (typeof (propertyRow as { name?: unknown }).name === "string" && (propertyRow as { name: string }).name.trim()) {
        propertyName = cleanText((propertyRow as { name: string }).name, 160);
      }
      const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Check if invitation already exists (by email OR phone)
      let existingInvitation = null;

      if (email) {
        const { data } = await ctx.supabase
          .from("tenant_invitations")
          .select("id, status, token")
          .eq("email", email)
          .eq("property_id", propertyId)
          .eq("status", "pending")
          .maybeSingle();
        existingInvitation = data;
      }

      let invitation;

      if (existingInvitation) {
        // Update existing invitation with new token and resend
        const newToken = crypto.randomUUID();
        const { data: updatedInvitation, error: updateError } = await ctx.supabase
          .from("tenant_invitations")
          .update({
            token: newToken,
            tenant_name: tenantName,
            unit: unit || null,
            created_at: new Date().toISOString(),
            expires_at: invitationExpiry,
          })
          .eq("id", existingInvitation.id)
          .select()
          .single();

        if (updateError) {
          throw errorResponse("Failed to resend invitation", 500);
        }

        invitation = updatedInvitation;
      } else {
        // Create new invitation
        const { data: newInvitation, error: insertError } = await ctx.supabase
          .from("tenant_invitations")
          .insert({
            email: email || `phone-${phone}@placeholder.calqulusrms`,
            tenant_name: tenantName,
            phone: phone || null,
            property_id: propertyId,
            property_name: propertyName,
            unit: unit || null,
            invited_by: ctx.user!.id,
            monthly_rent: monthlyRent || null,
            house_deposit: houseDeposit || null,
            water_deposit: waterDeposit || null,
            expires_at: invitationExpiry,
          })
          .select()
          .single();

        if (insertError) {
          throw errorResponse("Failed to create invitation", 500);
        }

        invitation = newInvitation;
      }

      // Get manager info
      const { data: profile } = await ctx.supabase
        .from("profiles")
        .select("full_name")
        .eq("id", ctx.user!.id)
        .maybeSingle();

      const managerName = cleanText(profile?.full_name || ctx.user!.email, 120);

      // Build invitation URL
      const appUrl = getEnv("SITE_URL", "https://www.calqulus.site");
      const invitationUrl = `${appUrl}/tenant/invitation?token=${invitation.token}`;

      // Track notification results
      const notificationResults = {
        email: { sent: false, error: null as string | null },
        sms: { sent: false, error: null as string | null },
        whatsapp: { sent: false, error: null as string | null },
      };

      // Send SMS/WhatsApp if phone is provided
      if (phone) {
        const smsMessage = `Hi ${tenantName}! You've been invited to join ${propertyName}${unit ? ` (Unit ${unit})` : ""} on CALQULUS RMS. Create your account: ${invitationUrl}`;
        const smsResult = await sendSMS(phone, smsMessage);
        notificationResults.sms.sent = smsResult.success;
        notificationResults.sms.error = smsResult.error || null;

        const whatsappResult = await sendWhatsApp(phone, tenantName, propertyName, unit, invitationUrl);
        notificationResults.whatsapp.sent = whatsappResult.success;
        notificationResults.whatsapp.error = whatsappResult.error || null;
      }

      // If no email provided, return with phone notification results
      if (!email || email.includes("@placeholder.calqulusrms")) {
        return {
          invitation: { id: invitation.id },
          invitationUrl,
          notifications: notificationResults,
          message: notificationResults.sms.sent || notificationResults.whatsapp.sent
            ? "Invitation sent via SMS/WhatsApp"
            : "Invitation created. Share the link manually.",
        };
      }

      // Check if email is configured
      if (!RESEND_API_KEY) {
        return {
          invitation: { id: invitation.id },
          invitationUrl,
          notifications: notificationResults,
          warning: "Email not sent - RESEND_API_KEY not configured",
        };
      }

      // Build email HTML
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to CALQULUS RMS</h1>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${escapeHtml(tenantName)}!</h2>

            <p style="color: #555; font-size: 16px;">
              <strong>${escapeHtml(managerName)}</strong> has invited you to join <strong>${escapeHtml(propertyName)}</strong>${unit ? ` (Unit ${escapeHtml(unit)})` : ""} as a tenant on CALQULUS RMS.
            </p>

            <p style="color: #555; font-size: 16px;">
              CALQULUS RMS makes it easy to:
            </p>

            <ul style="color: #555; font-size: 16px;">
              <li>View your lease details and contracts</li>
              <li>Pay rent online via M-Pesa</li>
              <li>Submit and track maintenance requests</li>
              <li>Download statements and receipts</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${escapeHtml(invitationUrl)}" style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Accept Invitation
              </a>
            </div>

            <p style="color: #888; font-size: 14px;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

            <p style="color: #888; font-size: 12px; text-align: center;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${escapeHtml(invitationUrl)}" style="color: #10b981;">${escapeHtml(invitationUrl)}</a>
            </p>
          </div>
        </body>
        </html>
      `;

      // Send email
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: getFromAddress("CALQULUS"),
          to: [email],
          subject: `You've been invited to join ${propertyName.replace(/[\r\n]+/g, " ")} on CALQULUS RMS`,
          html: emailHtml,
        }),
      });

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        notificationResults.email.error = emailResult.message || "Failed to send email";
      } else {
        notificationResults.email.sent = true;
      }

      return {
        invitation: { id: invitation.id },
        invitationUrl,
        notifications: notificationResults,
      };
    }
  )
);
