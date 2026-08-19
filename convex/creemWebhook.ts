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
    // Creem sends `order.amount` in the currency's minor unit (cents). We credit
    // 1:1 with our integer-cent balance, so a $10 pack => 1000 credits. This is
    // the load-bearing assumption for pricing — logged loudly so a live test
    // transaction can confirm the unit before flipping to live keys.
    const rawAmount = Number(object.order.amount ?? 0);
    console.log(
      "Creem checkout.completed:",
      JSON.stringify({
        orderId: object.order.id,
        amount: rawAmount,
        currency: object.order.currency,
      })
    );
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      await ctx.runAction(internal.alerts.notify, {
        subject: "Creem invalid amount",
        message: `orderId=${object.order.id}\nrawAmount=${object.order.amount}\ncurrency=${object.order.currency}`,
      });
      return new Response("ok", { status: 200 });
    }

    const res = await ctx.runMutation(internal.payments.addCreditsFromPayment, {
      email: object.customer.email.toLowerCase(),
      amount: rawAmount,
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
      await ctx.runAction(internal.alerts.notify, {
        subject: "Creem credit not applied",
        message: `reason=${res.reason}\nemail=${object.customer.email}\norderId=${object.order.id}`,
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
    await ctx.runAction(internal.alerts.notify, {
      subject: "Creem webhook unhandled payload",
      message: `eventType=${eventType}\norderId=${object?.order?.id}\ncustomerEmail=${object?.customer?.email}`,
    });
  }

  return new Response("ok", { status: 200 });
});
