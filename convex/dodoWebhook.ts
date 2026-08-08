// convex/dodoWebhook.ts
//
// Dodo Payments webhook handler (direct REST integration). The signature is
// verified manually via dodoVerifyWebhook (whsec_ HMAC). Register this URL in
// the Dodo dashboard as: https://<DEPLOYMENT>.convex.site/dodopayments-webhook

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { dodoVerifyWebhook } from "./dodo";

interface DodoPaymentSucceeded {
  type?: string;
  data?: {
    payment_id?: string;
    total_amount?: number;
    currency?: string;
    customer?: { customer_id?: string; email?: string };
  };
}

export const dodoWebhook = httpAction(async (ctx, req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await req.text();
  let payload: unknown;
  try {
    payload = await dodoVerifyWebhook(body, (name) => req.headers.get(name));
  } catch (e) {
    console.error("Dodo webhook verification failed:", e);
    return new Response("Unauthorized", { status: 401 });
  }

  const { type, data } = payload as DodoPaymentSucceeded;
  if (
    type === "payment.succeeded" &&
    data &&
    data.payment_id &&
    data.customer &&
    data.customer.email
  ) {
    void ctx.runMutation(internal.payments.addCreditsFromPayment, {
      email: data.customer.email,
      amount: Number(data.total_amount ?? 0),
      currency: data.currency ?? "USD",
      dodoPaymentId: String(data.payment_id),
      dodoCustomerId: data.customer.customer_id,
    });
  }

  return new Response("ok", { status: 200 });
});
