// convex/billing.ts
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { sendEmail, appUrl } from "./lib/email";
import { dodoCheckoutUrl } from "./dodo";

export const CENTS_PER_MIN = 18;
export const BUFFER_CENTS = 500; // $5 overdraft: calls never cut off; next call blocks only at <-500
export const AUTO_REFILL_THRESHOLD_CENTS = 300; // <$3 triggers attempted auto-refill
export const MIN_TOPUP_CENTS = 1000; // $10 minimum top-up

// Called from the Vapi end-of-call-report webhook. Bills the call, records
// usage, and (best-effort) triggers an auto-refill when the balance is low.
export const recordBilling = internalAction({
  args: { callId: v.string(), endedAt: v.optional(v.number()) },
  handler: async (ctx: ActionCtx, { callId, endedAt }): Promise<{ ok: boolean; costCents?: number; durationSec?: number; reason?: string }> => {
    const cs = await ctx.runQuery(internal.callSessions.byCallId, { callId });
    if (!cs) return { ok: false, reason: "no call session" };

    const end = endedAt ?? cs.endedAt ?? Date.now();
    const durationSec = cs.startedAt
      ? Math.max(0, Math.floor((end - cs.startedAt) / 1000))
      : 0;
    const costCents = Math.round((durationSec * CENTS_PER_MIN) / 60);
    const now = Date.now();

    await ctx.runMutation(internal.callSessions.finalize, {
      callId,
      endedAt: end,
      durationSec,
      costCents,
    });

    if (cs.userId) {
      await ctx.runMutation(internal.users.deductCredits, {
        userId: cs.userId,
        amountCents: costCents,
        reason: "voice call",
      });
      const activityCount = await ctx.runQuery(internal.logs.countByCall, {
        callId,
      });
      const user = await ctx.runQuery(internal.users.byId, {
        userId: cs.userId,
      });
      await ctx.runMutation(internal.usageEvents.create, {
        userId: cs.userId,
        callId,
        durationSec,
        costCents,
        activityCount,
        initiatedBy: (user?.role as string) ?? "sitter",
        recordedAt: now,
      });

      // Best-effort auto-refill (v1: emails a top-up checkout link; silent
      // saved-card charging is deferred to v1.1).
      if (
        user &&
        user.email &&
        user.credits < AUTO_REFILL_THRESHOLD_CENTS &&
        process.env.DODO_API_KEY
      ) {
        const pack = MIN_TOPUP_CENTS;
        try {
          const checkoutUrl = await dodoCheckoutUrl({
            packCents: pack,
            email: user.email,
            name: user.name ?? undefined,
            returnUrl: appUrl("/dashboard?billing=credits"),
          });
          if (checkoutUrl) {
            await sendEmail({
              to: user.email,
              subject: "PawVoice: low balance — top up your credits",
              html: `
                <h2>PawVoice balance is low</h2>
                <p>Your call credits are below $3.</p>
                <p><a href="${checkoutUrl}">Top up $10 credits</a></p>
                <p>You can also manage payment methods in your <a href="${appUrl(
                  "/dashboard?billing=portal"
                )}">billing portal</a>.</p>
              `,
            });
          }
        } catch (e) {
          console.error("Auto-refill checkout failed:", e);
        }
      }
    }

    return { ok: true, costCents, durationSec };
  },
});
