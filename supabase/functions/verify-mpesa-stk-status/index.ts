import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[verify-mpesa-stk-status] ${step}`, details ?? "");
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting payment verification');

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const body = await req.json();
    // Accept both checkoutRequestId (from frontend) and reference (legacy)
    const reference = body.checkoutRequestId ?? body.reference;

    if (!reference) {
      throw new Error('Missing payment reference');
    }

    logStep('Checking transaction status', { reference });

    // Look up transaction by checkout_request_id
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('checkout_request_id', reference)
      .maybeSingle();

    if (txError) {
      logStep('Error fetching transaction', { error: txError.message });
      throw new Error('Failed to check payment status');
    }

    if (!transaction) {
      logStep('Transaction not found', { reference });
      return new Response(JSON.stringify({
        status: 'pending',
        message: 'Payment is being processed',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Transaction found', { 
      transactionId: transaction.id, 
      status: transaction.status 
    });

    if (transaction.status === 'completed') {
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Payment completed successfully',
        mpesaReceiptNumber: transaction.mpesa_receipt_number,
        amount: transaction.amount,
        completedAt: transaction.completed_at,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (transaction.status === 'failed') {
      return new Response(JSON.stringify({
        status: 'failed',
        message: transaction.failure_reason || 'Payment failed',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Still pending — check how long it has been pending
    // If >30 seconds, query Safaricom directly to get the real status.
    // This handles the case where the Daraja callback URL was misconfigured
    // or the callback was lost — the payment may have succeeded in M-Pesa
    // even though our DB still shows pending.
    const initiatedAt = transaction.initiated_at ? new Date(transaction.initiated_at).getTime() : null;
    const elapsedSeconds = initiatedAt ? (Date.now() - initiatedAt) / 1000 : 0;

    if (elapsedSeconds > 30 && transaction.manager_id) {
      logStep('DB still pending after 30s — querying Safaricom directly', { reference, elapsedSeconds });
      try {
        const queryResult = await querySafaricomSTK(supabase, reference, transaction.manager_id);
        if (queryResult) {
          logStep('Safaricom query result', queryResult);

          if (queryResult.ResultCode === '0' || queryResult.ResultCode === 0) {
            // Payment confirmed by Safaricom — update our DB
            await supabase.from('payment_transactions').update({
              status:              'completed',
              mpesa_receipt_number: queryResult.MpesaReceiptNumber ?? null,
              completed_at:        new Date().toISOString(),
            }).eq('id', transaction.id);

            return new Response(JSON.stringify({
              status:             'completed',
              mpesaReceiptNumber: queryResult.MpesaReceiptNumber ?? null,
              amount:             transaction.amount,
              completedAt:        new Date().toISOString(),
              source:             'safaricom_query',
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

          } else if (queryResult.ResultCode !== null) {
            // Definitive failure from Safaricom
            const reason = queryResult.ResultDesc ?? 'Payment was not completed';
            await supabase.from('payment_transactions').update({
              status:         'failed',
              failure_reason: reason,
            }).eq('id', transaction.id);

            return new Response(JSON.stringify({
              status:        'failed',
              failureReason: reason,
              source:        'safaricom_query',
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
      } catch (queryErr) {
        logStep('Safaricom query failed — staying pending', { error: String(queryErr) });
        // Non-fatal — fall through to pending response
      }
    }

    return new Response(JSON.stringify({
      status: 'pending',
      message: 'Payment is being processed',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logStep('Error', { message: errorMessage });
    return new Response(JSON.stringify({
      status: 'error',
      message: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * querySafaricomSTK — Calls the Safaricom STK Push Query API to get the
 * real status of a transaction. Used as fallback when our DB shows 'pending'
 * for >30 seconds, which likely means the callback URL was misconfigured or
 * the callback was lost in transit.
 *
 * Daraja docs: POST /mpesa/stkpushquery/v1/query
 */
async function querySafaricomSTK(
  supabase: any,
  checkoutRequestId: string,
  managerId: string
): Promise<{ ResultCode: number | string | null; ResultDesc: string | null; MpesaReceiptNumber?: string } | null> {
  // Get manager's M-Pesa credentials
  const { data: settings } = await supabase
    .from('manager_mpesa_settings')
    .select('consumer_key, consumer_secret, paybill_shortcode, paybill_passkey, till_shortcode, till_passkey, is_live')
    .eq('manager_user_id', managerId)
    .maybeSingle();

  if (!settings?.consumer_key || !settings?.consumer_secret) {
    throw new Error('M-Pesa credentials not configured for this manager');
  }

  const apiBase = settings.is_live
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

  // Get OAuth token
  const credentials = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
  const tokenRes = await fetch(`${apiBase}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) throw new Error('Failed to get Safaricom OAuth token');

  // Build password (same as STK push)
  const shortcode = settings.paybill_shortcode || settings.till_shortcode;
  const passkey   = settings.paybill_passkey   || settings.till_passkey;
  if (!shortcode || !passkey) throw new Error('M-Pesa shortcode/passkey not configured');

  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password  = btoa(`${shortcode}${passkey}${timestamp}`);

  // Query Safaricom
  const queryRes = await fetch(`${apiBase}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  const data = await queryRes.json();

  return {
    ResultCode:          data.ResultCode ?? null,
    ResultDesc:          data.ResultDesc ?? null,
    MpesaReceiptNumber:  data.CallbackMetadata?.Item?.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value,
  };
}
