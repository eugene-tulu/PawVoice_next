// convex/billing.ts
"use node";
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  sendEmail,
  appUrl,
  lowBalanceHtml,
  lowBalanceText,
} from "./lib/email";
import { creemCheckoutUrl } from "./dodo";

export const CENTS_PER_MIN = 35;
export const BUFFER_CENTS = 500; // $5 overdraft: calls never cut off; next call blocks at <=-500 cents
export const AUTO_REFILL_THRESHOLD_CENTS = 300; // <$3 triggers attempted auto-refill
export const MIN_TOPUP_CENTS = 1000; // $10 minimum top-up
// Hard ceiling on a single billed call (also enforced by Vapi maxDurationSeconds
// in vapiSetup.ts). Caps financial exposure if a call fails to end.
export const MAX_CALL_SECONDS = 3 * 3600;

// Mirrors the gate in convex/vapi.ts. Inbound phone billing/attribution is off
// for the web-only launch; flip only after phone verification ships.
const PHONE_CALLING_ENABLED = process.env.PHONE_CALLING_ENABLED === "true";

// Called from the Vapi end-of-call-report webhook. Bills the call, records
// usage, and (best-effort) triggers an auto-refill when the balance is low.
export const recordBilling = internalAction({
  args: {
    callId: v.string(),
    endedAt: v.optional(v.number()),
    durationSec: v.optional(v.number()),
    // Actual call start time from Vapi's end-of-call report. Used to derive an
    // accurate duration when `durationSec` is not provided (web calls often omit
    // `durationSeconds`), and to reconstruct the session for web calls.
    startedAt: v.optional(v.number()),
    // Web calls never emit `assistant-request` (which normally creates the
    // session), so pass the caller identity from the end-of-call report so we
    // can still attribute and bill the call.
    callerPhone: v.optional(v.string()),
    authId: v.optional(v.string()),
  },
  handler: async (ctx: ActionCtx, { callId, endedAt, durationSec: reportedSec, startedAt: reportedStartedAt, callerPhone, authId }): Promise<{ ok: boolean; costCents?: number; durationSec?: number; reason?: string }> => {
    let cs = await ctx.runQuery(internal.callSessions.byCallId, { callId });

    // Web calls don't fire `assistant-request`, so no session exists yet.
    // Reconstruct it from the end-of-call report so billing can proceed.
    if (!cs) {
      // Web-only launch: inbound phone calls are disabled, so don't attribute or
      // bill a stray end-of-call-report that resolves only by caller phone.
      // (Web calls carry authId and are still billed through this path.)
      if (callerPhone && !authId && !PHONE_CALLING_ENABLED) {
        return { ok: false, reason: "phone calling disabled" };
      }

      const end = endedAt ?? Date.now();
      // Prefer Vapi's reported start time; fall back to end − reported duration.
      // If neither is available the session start collapses to `end`, which
      // would bill 0 — so we still attempt attribution, just with no charge.
      const start =
        reportedStartedAt ?? (reportedSec ? end - reportedSec * 1000 : end);
      const user = callerPhone
        ? await ctx.runQuery(internal.users.getByPhone, { phone: callerPhone })
        : authId
          ? await ctx.runQuery(internal.users.getByAuthId, { authId })
          : null;
      if (user) {
        await ctx.runMutation(internal.callSessions.create, {
          callId,
          callerPhone: callerPhone ?? undefined,
          authId: authId ?? undefined,
          userId: user._id,
          startedAt: Math.max(0, start),
        });
        cs = await ctx.runQuery(internal.callSessions.byCallId, { callId });
      }
    }

    if (!cs) return { ok: false, reason: "no call session" };

      const end = endedAt ?? cs.endedAt ?? Date.now();
      // Prefer Vapi's reported duration; fall back to start→end delta.
      const durationSec =
        reportedSec ??
        (cs.startedAt ? Math.max(0, Math.floor((end - cs.startedAt) / 1000)) : 0);
      // Cap billed duration at MAX_CALL_SECONDS so a stuck/never-ending call
      // can't rack up unbounded charges (Vapi also enforces this server-side).
      const billedSec = Math.min(durationSec, MAX_CALL_SECONDS);
      const costCents = Math.round((billedSec * CENTS_PER_MIN) / 60);
      const now = Date.now();

      await ctx.runMutation(internal.callSessions.finalize, {
        callId,
        endedAt: end,
        durationSec: billedSec,
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
        durationSec: billedSec,
        costCents,
        activityCount,
        initiatedBy: (user?.role as string) ?? "sitter",
        recordedAt: now,
      });

      // Best-effort auto-refill (v1: emails a top-up checkout link; silent
      // saved-card charging is deferred to v1.1). Delegated to a separate
      // action so this handler's type graph stays clear of the checkout module.
      if (
        user &&
        user.email &&
        user.credits < AUTO_REFILL_THRESHOLD_CENTS
      ) {
        void ctx.runAction(internal.billing.sendLowBalanceTopUp, {
          userId: cs.userId,
          email: user.email,
          name: user.name ?? undefined,
          callId,
        });
      }
    }

    return { ok: true, costCents, durationSec };
  },
});

// Best-effort auto-refill. Runs as its own action (kept separate from
// recordBilling) so the deep ctx.runQuery/runMutation chain there doesn't pull
// the Creem checkout module into its type-graph — that previously tripped a
// TS2589 cascade. Emails a top-up checkout link; silent saved-card charging is
// deferred to v1.1.
export const sendLowBalanceTopUp = internalAction({
  args: { userId: v.id("users"), email: v.string(), name: v.optional(v.string()), callId: v.string() },
  handler: async (_ctx: ActionCtx, { email, name, callId }): Promise<void> => {
    if (!process.env.CREEM_API_KEY) return;
    const pack = MIN_TOPUP_CENTS;
    try {
      const checkoutUrl = await creemCheckoutUrl({
        packCents: pack,
        email,
        name,
        returnUrl: appUrl("/dashboard?billing=credits"),
      });
      if (checkoutUrl) {
        await sendEmail({
          to: email,
          subject: "PawVoice: low balance — top up your credits",
          html: lowBalanceHtml(checkoutUrl, appUrl("/dashboard?billing=portal")),
          text: lowBalanceText(checkoutUrl, appUrl("/dashboard?billing=portal")),
          // One low-balance notice per call that triggered the refill.
          idempotencyKey: `low-balance/${callId}`,
          tags: [{ name: "email_type", value: "low_balance" }],
        });
      }
    } catch (e) {
      console.error("Auto-refill checkout failed:", e);
    }
  },
});
