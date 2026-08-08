// convex/payments.ts
import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { CREDIT_PACKS, creditPackName, dodoCheckoutUrl, dodoCustomerPortalUrl } from "./dodo";
import { appUrl } from "./lib/email";

// Public: start a Pay-As-You-Go credit checkout on Dodo Payments.
export const createCreditPack = action({
  args: { packCents: v.number() },
  handler: async (ctx, { packCents }) => {
    if (!CREDIT_PACKS[packCents]) {
      throw new Error(`Unknown credit pack: ${creditPackName(packCents)}`);
    }
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    const checkout_url = await dodoCheckoutUrl({
      packCents,
      email: user.email,
      name: user.name ?? undefined,
      returnUrl: appUrl("/dashboard?billing=credits"),
    });
    return { checkout_url };
  },
});

// Public: link to the Dodo customer self-service portal (saved cards, history).
export const billingPortal = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user) throw new Error("User not found");
    if (!user.dodoCustomerId) {
      throw new Error("No billing customer on record yet; purchase credits first.");
    }
    const portal_url = await dodoCustomerPortalUrl({
      customerId: user.dodoCustomerId,
      returnUrl: appUrl("/dashboard?billing=portal"),
      sendEmail: true,
    });
    return { portal_url };
  },
});

// Fired by the Dodo webhook route on payment.succeeded to top up a user's credits.
export const addCreditsFromPayment = internalMutation({
  args: {
    email: v.string(),
    amount: v.number(),
    currency: v.string(),
    dodoPaymentId: v.string(),
    dodoCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, { email, amount, currency, dodoPaymentId, dodoCustomerId }): Promise<{ ok: boolean; credits?: number; reason?: string }> => {
    const user = await ctx.runQuery(internal.users.getByEmail, { email });
    if (!user) return { ok: false, reason: "user not found" };

    const existing = await ctx.db
      .query("payments")
      .withIndex("by_dodo_payment_id", (q) => q.eq("dodoPaymentId", dodoPaymentId))
      .first();
    if (existing) return { ok: false, reason: "already credited" };

    const credits = Math.round(amount);
    await ctx.db.patch(user._id, {
      credits: user.credits + credits,
      ...(dodoCustomerId ? { dodoCustomerId } : {}),
    });
    await ctx.db.insert("payments", {
      dodoPaymentId,
      userId: user._id,
      email,
      amount: credits,
      currency,
      status: "succeeded",
      recordedAt: Date.now(),
    });
    return { ok: true, credits: user.credits + credits };
  },
});
