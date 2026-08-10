// convex/creemWebhook.ts
//
// Creem webhook handler (direct REST integration). The signature is verified
// manually via creemVerifyWebhook (plain HMAC-SHA256 hex over the raw body,
// compared against the `creem-signature` header). Register this URL in the
// Creem dashboard as: https://<DEPLOYMENT>.convex.site/creem-webhook

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { creemVerifyWebhook } from "./creem";

interface CreemCheckoutCompleted {
  eventType?: string;
  object?: {
    order?: { id?: string; amount?: number; currency?: string; status?: string };
    customer?: { id?: string; email?: string };
    metadata?: Record<string, string>;
  };
}

export const creemWebhook = httpAction(async (ctx, req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await req.text();
  let payload: unknown;
  try {
    payload = await creemVerifyWebhook(body, (name) => req.headers.get(name));
  } catch (e) {
    console.error("Creem webhook verification failed:", e);
    return new Response("Unauthorized", { status: 401 });
  }

  const { eventType, object } = payload as CreemCheckoutCompleted;
  if (
    eventType === "checkout.completed" &&
    object &&
    object.order &&
    object.order.id &&
    object.customer &&
    object.customer.email
  ) {
    void ctx.runMutation(internal.payments.addCreditsFromPayment, {
      email: object.customer.email,
      amount: Number(object.order.amount ?? 0),
      currency: object.order.currency ?? "USD",
      dodoPaymentId: String(object.order.id),
      dodoCustomerId: object.customer.id,
    });
  }

  return new Response("ok", { status: 200 });
});
