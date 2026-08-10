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
    // In a checkout.completed payload, `order` and `customer` are siblings
    // under `object` (per Creem docs). `order.customer` is only the customer
    // ID string; the customer's email lives on `object.customer`.
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
    const res = await ctx.runMutation(internal.payments.addCreditsFromPayment, {
      email: object.customer.email.toLowerCase(),
      amount: Number(object.order.amount ?? 0),
      currency: object.order.currency ?? "USD",
      dodoPaymentId: String(object.order.id),
      dodoCustomerId: object.customer.id,
    });
    if (!res.ok) {
      // Surface dedup / "user not found" outcomes instead of swallowing them.
      console.error("Creem credit not applied:", {
        reason: res.reason,
        email: object.customer.email,
        orderId: object.order.id,
      });
    }
  } else {
    console.error("Creem webhook: unhandled payload shape", {
      eventType,
      hasOrder: !!object?.order,
      orderId: object?.order?.id,
      hasCustomer: !!object?.customer,
      customerEmail: object?.customer?.email,
    });
  }

  return new Response("ok", { status: 200 });
});
