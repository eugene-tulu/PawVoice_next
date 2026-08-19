// convex/webCall.ts
//
// Prepares a browser-initiated (web) Vapi call. The frontend calls this
// before creating a Vapi Web SDK instance to verify the user is eligible:
// email verified, at least one pet, and credits sufficient. Phone number
// is optional for web calls (authId is passed via metadata instead).
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID ?? "";
// $5 overdraft buffer. Inlined (NOT imported from ./billing) so this V8-sandbox
// query does not pull the Node.js-only `resend` dependency into its bundle via
// the billing module graph (this was causing an opaque "Server Error").
const BUFFER_CENTS = 500;

export type PrepareResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      assistantId: string;
      credits: number;
      petCount: number;
      // Spoken-friendly description of the user's pets, injected into the
      // assistant prompt so it knows pet names and doesn't have to ask.
      petContext: string;
      warning?: string;
    };

export const prepare = query({
  args: {},
  handler: async (ctx): Promise<PrepareResult> => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return { ok: false, reason: "Not authenticated" };
      }
      if (!identity.emailVerified) {
        return { ok: false, reason: "Email not verified" };
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
        .first();
      if (!user) {
        return { ok: false, reason: "User profile not found — contact support" };
      }

      // Concurrency guard: block a new web call while one is still active.
      const active = await ctx.runQuery(internal.callSessions.activeForUser, {
        userId: user._id,
      });
      if (active) {
        return {
          ok: false,
          reason: "You already have an active call — end it before starting another.",
        };
      }

      const memberships = await ctx.db
        .query("petMembers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      if (memberships.length === 0) {
        return { ok: false, reason: "Add a pet first" };
      }

      const credits = user.credits ?? 0;
      if (credits < -BUFFER_CENTS) {
        return { ok: false, reason: "Balance too low — add credits in Settings" };
      }

      if (!ASSISTANT_ID) {
        return { ok: false, reason: "Calling is not configured yet — contact support" };
      }

      const petContext = await ctx.runQuery(internal.pets.petContext, {
        userId: user._id,
      });

      const result: Extract<PrepareResult, { ok: true }> = {
        ok: true,
        assistantId: ASSISTANT_ID,
        credits,
        petCount: memberships.length,
        petContext,
      };

      if (!user.phone) {
        result.warning =
          "No phone number registered. To receive calls on your Vapi number, add one in Settings.";
      }

      return result;
    } catch (e) {
      console.error(
        "webCall.prepare unexpected error:",
        e instanceof Error ? e.stack ?? e.message : String(e)
      );
      return {
        ok: false,
        reason: "Unable to verify call eligibility. Please try again.",
      };
    }
  },
});

// Called by the client right after the Vapi web call connects (so we have the
// real Vapi call id). Enforces one-active-call-per-user server-side: a second
// concurrent/rapid call is rejected and the client stops it. This is the
// authoritative guard — client-side `startingRef` alone can't catch a second tab.
export const begin = mutation({
  args: { callId: v.string(), assistantId: v.optional(v.string()) },
  handler: async (ctx, { callId, assistantId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const MAX_CALL_SECONDS = 3 * 3600;
    const COOLDOWN_MS = 5000;
    const now = Date.now();
    const rows = await ctx.db
      .query("callSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of rows) {
      if (!s.endedAt) {
        if (now - s.startedAt < MAX_CALL_SECONDS * 1000) {
          throw new Error(
            "You already have an active call. End it before starting another."
          );
        }
        // Stale active session (call never reported end): leave it; the next
        // end-of-call-report will finalize it. Don't block a fresh call.
      } else if (now - s.endedAt < COOLDOWN_MS) {
        throw new Error("Please wait a moment before starting another call.");
      }
    }

    await ctx.runMutation(internal.callSessions.create, {
      callId,
      callerPhone: undefined,
      authId: identity.subject,
      userId: user._id,
      startedAt: now,
      assistantId,
    });
    return { ok: true };
  },
});
