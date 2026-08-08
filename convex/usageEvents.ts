// convex/usageEvents.ts
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

export type UsageEvent = Doc<"usageEvents">;

// Persist a metered usage event from a billed call.
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    callId: v.string(),
    durationSec: v.number(),
    costCents: v.number(),
    activityCount: v.number(),
    initiatedBy: v.string(),
    recordedAt: v.number(),
  },
  handler: (ctx, args) => ctx.db.insert("usageEvents", args),
});

// Public: list recent usage events for the authenticated user.
export const listUsage = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 30 }): Promise<UsageEvent[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (!user) return [];
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    return await ctx.db
      .query("usageEvents")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .filter((q) => q.gte(q.field("recordedAt"), since))
      .order("desc")
      .collect();
  },
});
