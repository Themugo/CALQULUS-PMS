import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv, getEnv } from "../_shared/env.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateRequired, validateEmail } from "../_shared/validation.ts";
import { errorResponse, successResponse } from "../_shared/errors.ts";
import { checkRoleAccess } from "../_shared/authorization.ts";
import { logTenantEvent } from "../_shared/audit.ts";

const RESEND_API_KEY = getEnv("RESEND_API_KEY");
const logger = createLogger("create-tenant-account");

interface CreateTenantRequest {
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  property: string;
  property_id?: string;
  unit: string;
  move_in_date?: string;
  companyName?: string;
  portalUrl?: string;
  manager_id?: string;
  sendSms?: boolean;
  sendWhatsapp?: boolean;
  monthlyRent?: number;
  depositAmount?: number;
}

// HTML escape function
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Send activation email with secure link (no password)
async function sendActivationEmail(
  email: string,
  name: string,
  activationToken: string,
  companyName: string,
  property: string,
  unit: string,
  portalUrl: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured, skipping activation email");
    return;
  }

  const safeName = escapeHtml(name);
  const safeCompany = escapeHtml(companyName);
  const safeProperty = escapeHtml(property);
  const safeUnit = escapeHtml(unit);
  
  // Build activation URL - ensure proper URL construction
  const baseUrl = portalUrl.replace(/\/+$/, ''); // Remove trailing slashes
  const activationUrl = `${baseUrl}/activate?token=${encodeURIComponent(activationToken)}`;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${safeCompany} <onboarding@resend.dev>`,
      to: [email],
      subject: `Welcome to ${safeCompany} - Activate Your Tenant Portal`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px 20px; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; }
            .info-box { background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .info-box h3 { color: #0369a1; margin: 0 0 15px 0; font-size: 18px; }
            .info-row { background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px; margin-bottom: 8px; }
            .info-label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .info-value { color: #111827; font-weight: 600; font-size: 16px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .security-note { background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .security-title { color: #059669; font-weight: 600; margin-bottom: 5px; }
            .expiry-notice { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .expiry-title { color: #b45309; font-weight: 600; margin-bottom: 5px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${safeCompany}!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Activate Your Tenant Portal</p>
            </div>
            <div class="content">
              <p>Dear ${safeName},</p>
              <p>Welcome to your new home at <strong>${safeProperty} - Unit ${safeUnit}</strong>! Your tenant portal account is ready to be activated.</p>
              
              <div class="info-box">
                <h3>🏠 Your Property Details</h3>
                <div class="info-row">
                  <div class="info-label">Property</div>
                  <div class="info-value">${safeProperty}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Unit</div>
                  <div class="info-value">${safeUnit}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Email</div>
                  <div class="info-value">${escapeHtml(email)}</div>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${activationUrl}" class="cta-button">🔐 Activate Your Account</a>
              </div>

              <div class="security-note">
                <div class="security-title">🔒 Secure Activation</div>
                <p style="margin: 0; color: #047857;">Click the button above to set your own secure password. You'll choose your password during activation - no temporary password is sent via email for your security.</p>
              </div>

              <div class="expiry-notice">
                <div class="expiry-title">⏰ Link Expires in 24 Hours</div>
                <p style="margin: 0; color: #92400e;">For security, this activation link will expire in 24 hours. If you don't activate within this time, please contact your property manager for a new link.</p>
              </div>

              <p>Through the tenant portal, you can:</p>
              <ul>
                <li>View and sign your lease agreement</li>
                <li>Check payment history and upcoming invoices</li>
                <li>Submit maintenance requests</li>
                <li>Access important documents</li>
              </ul>

              <p>If you have any questions, please contact us.</p>
              <p>Best regards,<br><strong>${safeCompany}</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${safeCompany}.</p>
              <p>If you did not expect this email, please ignore it or contact us.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }),
  });

  const responseData = await emailResponse.json();
  if (!emailResponse.ok) {
    logger.error("Failed to send activation email", responseData);
  } else {
    logger.info("Activation email sent", { email });
  }
}

// Send SMS notification with activation details
async function sendActivationSms(
  phone: string,
  name: string,
  activationToken: string,
  companyName: string,
  property: string,
  unit: string,
  portalUrl: string
): Promise<void> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const baseUrl = portalUrl.replace(/\/+$/, '');
  const activationUrl = `${baseUrl}/activate?token=${encodeURIComponent(activationToken)}`;
  
  const message = `Welcome to ${companyName}, ${name}! Your tenant account for ${property} - ${unit} is ready. Activate here: ${activationUrl} (Link expires in 24hrs)`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: phone,
        message,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      logger.error("SMS sending failed", result.error);
    } else {
      logger.info("SMS sent successfully", { phone });
    }
  } catch (error) {
    logger.error("Error sending SMS", { error: error instanceof Error ? error.message : String(error) });
  }
}

// Send WhatsApp notification with activation details
async function sendActivationWhatsapp(
  whatsappNumber: string,
  name: string,
  activationToken: string,
  companyName: string,
  property: string,
  unit: string,
  portalUrl: string
): Promise<void> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const baseUrl = portalUrl.replace(/\/+$/, '');
  const activationUrl = `${baseUrl}/activate?token=${encodeURIComponent(activationToken)}`;
  
  const message = `Welcome to ${companyName}, ${name}! 🏠\n\nYour tenant account for ${property} - ${unit} is ready.\n\n🔐 Activate your account here:\n${activationUrl}\n\n⏰ This link expires in 24 hours.`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: whatsappNumber,
        message,
        type: 'invoice', // Using 'invoice' type for general notification
      }),
    });

    const result = await response.json();
    if (!result.success) {
      logger.error("WhatsApp sending failed", result.message || result.error);
    } else {
      logger.info("WhatsApp sent successfully", { whatsappNumber });
    }
  } catch (error) {
    logger.error("Error sending WhatsApp", { error: error instanceof Error ? error.message : String(error) });
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    logger.info("Tenant account creation started");

    // Verify caller is authenticated manager
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    const supabaseClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) {
      logger.error("Authentication failed", { error: authError?.message });
      return errorResponse("Invalid authentication", 401);
    }

    logger.info("User authenticated", { userId: caller.id });

    // Check caller has manager or webhost role
    const roleCheck = await checkRoleAccess(caller.id, ["manager", "webhost"]);
    if (!roleCheck.allowed) {
      logger.warn("Unauthorized role access attempt", { userId: caller.id });
      return errorResponse("Insufficient permissions", 403);
    }

    const { name, email, phone, whatsapp, property, property_id, unit, move_in_date, companyName, portalUrl, manager_id, sendSms, sendWhatsapp, monthlyRent, depositAmount }: CreateTenantRequest = await req.json();

    // Validate required fields
    const nameValidation = validateRequired(name, "Name");
    if (!nameValidation.valid) {
      return errorResponse(nameValidation.error, 400);
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return errorResponse(emailValidation.error, 400);
    }

    const propertyValidation = validateRequired(property, "Property");
    if (!propertyValidation.valid) {
      return errorResponse(propertyValidation.error, 400);
    }

    const unitValidation = validateRequired(unit, "Unit");
    if (!unitValidation.valid) {
      return errorResponse(unitValidation.error, 400);
    }

    logger.info("Request validated", { email, property, unit });

    // Use the caller's ID as manager_id if not explicitly provided
    const effectiveManagerId = manager_id || caller.id;

    // Use service role client to create auth user
    const supabaseAdmin = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;
    let isNewUser = false;
    let activationToken: string | null = null;

    if (existingUser) {
      userId = existingUser.id;
      logger.info("User already exists", { email, userId });
    } else {
      // Create new auth user with a random password they won't know
      // They will set their own password via the activation flow
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (createError) {
        logger.error("Error creating auth user", { error: createError.message });
        throw new Error(`Failed to create user account: ${createError.message}`);
      }

      userId = newUser.user.id;
      isNewUser = true;
      logger.info("New auth user created", { userId, email });

      // Create activation token for secure password setup
      const { data: activation, error: activationError } = await supabaseAdmin
        .from("account_activations")
        .insert({
          user_id: userId,
          // token is auto-generated via database default
        })
        .select("token")
        .single();

      if (activationError) {
        logger.error("Error creating activation token", { error: activationError.message });
        // Clean up the user we just created
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Failed to create activation token: ${activationError.message}`);
      }

      activationToken = activation.token;
    }

    // Look up or create unit record for proper FK linkage
    let unitId: string | null = null;
    if (property_id && unit) {
      // Check if unit exists
      const { data: existingUnit } = await supabaseAdmin
        .from("units")
        .select("id")
        .eq("property_id", property_id)
        .eq("unit_number", unit)
        .maybeSingle();

      if (existingUnit) {
        unitId = existingUnit.id;
        logger.info("Unit found", { unitId, unit });
        // Update existing unit status to occupied + set rent if provided
        const { error: unitUpdateError } = await supabaseAdmin
          .from("units")
          .update({
            status: "occupied",
            ...(monthlyRent ? { monthly_rent: monthlyRent } : {}),
          })
          .eq("id", unitId);
        if (unitUpdateError) throw new Error(`Failed to mark unit occupied: ${unitUpdateError.message}`);
      } else {
        // Auto-create unit record
        const { data: newUnit, error: unitCreateError } = await supabaseAdmin
          .from("units")
          .insert({
            property_id,
            unit_number: unit,
            label: unit,
            monthly_rent: monthlyRent || null,
            house_deposit: depositAmount || null,
            status: "occupied",
          })
          .select("id")
          .single();
        if (unitCreateError) throw new Error(`Failed to create unit record: ${unitCreateError.message}`);
        if (newUnit) unitId = newUnit.id;
        logger.info("Unit created", { unitId, unit });
      }

      // Recalculate and update property.occupied count from live units table
      const { count: occupiedCount } = await supabaseAdmin
        .from("units")
        .select("id", { count: "exact", head: true })
        .eq("property_id", property_id)
        .eq("status", "occupied");

      if (occupiedCount !== null) {
        await supabaseAdmin
          .from("properties")
          .update({ occupied: occupiedCount })
          .eq("id", property_id);
      }
    }

    // Create tenant record - linked to the manager and unit
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert({
        name,
        email,
        phone: phone || null,
        property,
        property_id: property_id || null,
        unit,
        unit_id: unitId,
        status: "active",
        move_in_date: move_in_date || null,
        manager_id: effectiveManagerId,
        monthly_rent: monthlyRent || null,
        deposit_amount: depositAmount || null,
      })
      .select()
      .single();

    if (tenantError) {
      logger.error("Error creating tenant", { error: tenantError.message });
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      throw new Error(`Failed to create tenant record: ${tenantError.message}`);
    }

    logger.info("Tenant record created", { tenantId: tenant.id });

    // Check if user_role already exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "tenant",
          tenant_id: tenant.id,
        });

      if (roleError) {
        logger.error("Error creating user role", { error: roleError.message });
        throw new Error(`Failed to create user role: ${roleError.message}`);
      }
    } else {
      const { error: updateRoleError } = await supabaseAdmin
        .from("user_roles")
        .update({ tenant_id: tenant.id })
        .eq("user_id", userId);

      if (updateRoleError) {
        logger.error("Error updating user role", { error: updateRoleError.message });
      }
    }

    // ── Sync payment details to tenant portal ─────────────────────────
    // Get manager's M-Pesa settings so tenant can see paybill details
    let paybillNumber: string | null = null;
    let accountReference: string | null = unit || null;
    if (effectiveManagerId) {
      const { data: mpesaSettings } = await supabaseAdmin
        .from("mpesa_settings")
        .select("paybill_shortcode, paybill_enabled, paybill_account_reference")
        .eq("manager_id", effectiveManagerId)
        .maybeSingle();
      if (mpesaSettings?.paybill_enabled) {
        paybillNumber  = (mpesaSettings as any).paybill_shortcode || null;
        accountReference = (mpesaSettings as any).paybill_account_reference || unit || null;
      }
    }

    // Call sync_tenant_payment_details to populate the portal's payment details
    await supabaseAdmin.rpc("sync_tenant_payment_details", {
      p_tenant_id:          tenant.id,
      p_manager_id:         effectiveManagerId || null,
      p_property_id:        property_id || null,
      p_unit_id:            unitId || null,
      p_monthly_rent:       monthlyRent || null,
      p_house_deposit:      depositAmount || null,
      p_water_deposit:      null,
      p_other_charges:      null,
      p_other_charges_desc: null,
      p_payment_day:        1,
      p_paybill:            paybillNumber,
      p_account_ref:        accountReference,
      p_tenancy_type:       "standard",
    }).catch((err: Error) => logger.warn("Payment details sync failed (non-critical)", { error: err.message }));

    // Send activation notifications if new user
    let emailSent = false;
    let smsSent = false;
    let whatsappSent = false;
    
    if (isNewUser && activationToken) {
      // Always send email
      await sendActivationEmail(
        email,
        name,
        activationToken,
        companyName || "CALQULUS RMS Properties",
        property,
        unit,
        portalUrl || getEnv("SITE_URL", "https://www.calqulus.site")
      );
      emailSent = true;

      // Also send SMS if requested and phone is provided
      if (sendSms && phone) {
        await sendActivationSms(
          phone,
          name,
          activationToken,
          companyName || "CALQULUS RMS Properties",
          property,
          unit,
          portalUrl || getEnv("SITE_URL", "https://www.calqulus.site")
        );
        smsSent = true;
      }

      // Send WhatsApp notification if requested and whatsapp number is provided
      if (sendWhatsapp && whatsapp) {
        await sendActivationWhatsapp(
          whatsapp,
          name,
          activationToken,
          companyName || "CALQULUS RMS Properties",
          property,
          unit,
          portalUrl || getEnv("SITE_URL", "https://www.calqulus.site")
        );
        whatsappSent = true;
      }
    }

    // Log tenant event
    await logTenantEvent(caller.id, "tenant_created", { 
      tenantId: tenant.id, 
      name, 
      email, 
      property, 
      unit,
      isNewUser 
    });

    const methods = [];
    if (emailSent) methods.push('email');
    if (smsSent) methods.push('SMS');
    if (whatsappSent) methods.push('WhatsApp');

    logger.info("Tenant account creation completed", { tenantId: tenant.id, isNewUser, methods });

    return successResponse({
      tenant,
      isNewUser,
      emailSent,
      smsSent,
      whatsappSent,
      message: isNewUser 
        ? `Tenant account created. Activation sent via ${methods.join(', ')}.`
        : "Tenant linked to existing user account",
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Error in create-tenant-account", { error: errorMessage });
    return errorResponse(errorMessage, 500);
  }
});
