/**
 * Paystack mobile-money charge (Kenya M-Pesa via Paystack, not Daraja).
 * Daraja STK lives in initiate-mpesa-stk-push.
 */
import { getEnv } from "./env.ts";

export function formatKenyaMsisdn(phoneNumber: string): string {
  let formatted = phoneNumber.replace(/\s+/g, "").replace(/^0/, "254").replace(/^\+/, "");
  if (!formatted.startsWith("254")) formatted = "254" + formatted;
  return formatted;
}

export async function chargePaystackMpesa(params: {
  email: string;
  amountKes: number;
  phoneNumber: string;
  metadata: Record<string, unknown>;
}): Promise<{ ok: boolean; payload: Record<string, unknown>; httpStatus: number }> {
  const paystackKey = getEnv("PAYSTACK_SECRET_KEY");
  if (!paystackKey) {
    return { ok: false, httpStatus: 500, payload: { message: "PAYSTACK_SECRET_KEY is not set" } };
  }

  const formattedPhone = formatKenyaMsisdn(params.phoneNumber);
  const amountInCents = Math.round(params.amountKes * 100);

  const paystackResponse = await fetch("https://api.paystack.co/charge", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: amountInCents,
      currency: "KES",
      mobile_money: {
        phone: formattedPhone,
        provider: "mpesa",
      },
      metadata: params.metadata,
    }),
  });

  const payload = await paystackResponse.json();
  return {
    ok: paystackResponse.ok && Boolean(payload?.status),
    payload,
    httpStatus: paystackResponse.status,
  };
}
