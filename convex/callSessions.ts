// convex/callSessions.ts
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Created at assistant-request time so we know who's calling and can bill later.
export const create = internalMutation({
  args: {
    callId: v.string(),
    callerPhone: v.optional(v.string()),
    authId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    startedAt: v.number(),
    assistantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("callSessions")
      .withIndex("by_call_id", (q) => q.eq("callId", args.callId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        callerPhone: args.callerPhone,
        authId: args.authId ?? existing.authId,
        userId: args.userId ?? existing.userId,
        startedAt: args.startedAt,
        assistantId: args.assistantId ?? existing.assistantId,
      });
      return existing._id;
    }
    return ctx.db.insert("callSessions", {
      callId: args.callId,
      callerPhone: args.callerPhone,
      authId: args.authId,
      userId: args.userId,
      startedAt: args.startedAt,
      endedAt: undefined,
      durationSec: undefined,
      costCents: undefined,
      assistantId: args.assistantId,
    });
  },
});

export const byCallId = internalQuery({
  args: { callId: v.string() },
  handler: async (ctx, { callId }) => {
    return await ctx.db
      .query("callSessions")
      .withIndex("by_call_id", (q) => q.eq("callId", callId))
      .first();
  },
});

// Returns the user's currently-active (not finalized, not stale) call session,
// or null. Used to enforce one-active-call-per-user before a new call starts.
export const activeForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("callSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const now = Date.now();
    const STALE_MS = 3 * 3600 * 1000; // matches MAX_CALL_SECONDS in billing.ts
    return (
      rows
        .filter((r) => !r.endedAt && now - r.startedAt < STALE_MS)
        .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null
    );
  },
});

export const finalize = internalMutation({
  args: {
    callId: v.string(),
    endedAt: v.number(),
    durationSec: v.number(),
    costCents: v.number(),
  },
  handler: async (ctx, args) => {
    const cs = await ctx.db
      .query("callSessions")
      .withIndex("by_call_id", (q) => q.eq("callId", args.callId))
      .first();
    if (!cs) return null;
    await ctx.db.patch(cs._id, {
      endedAt: args.endedAt,
      durationSec: args.durationSec,
      costCents: args.costCents,
    });
    return cs._id;
  },
});
