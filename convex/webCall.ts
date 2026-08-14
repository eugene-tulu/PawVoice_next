// convex/webCall.ts
//
// Prepares a browser-initiated (web) Vapi call. The frontend calls this
// before creating a Vapi Web SDK instance to verify the user is eligible:
// email verified, at least one pet, and credits sufficient. Phone number
// is optional for web calls (authId is passed via metadata instead).
import { query } from "./_generated/server";
import { BUFFER_CENTS } from "./billing";

const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID ?? "";

export type PrepareResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      assistantId: string;
      credits: number;
      petCount: number;
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

      const result: Extract<PrepareResult, { ok: true }> = {
        ok: true,
        assistantId: ASSISTANT_ID,
        credits,
        petCount: memberships.length,
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
