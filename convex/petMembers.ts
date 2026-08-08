// convex/petMembers.ts
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Returns full user profiles for all members of a pet (caller must be a member).
export const forPet = internalQuery({
  args: { petId: v.id("pets") },
  handler: async (ctx, { petId }) => {
    const members = await ctx.db
      .query("petMembers")
      .withIndex("by_pet", (q) => q.eq("petId", petId))
      .collect();
    const users = await Promise.all(
      members.map((m) => ctx.db.get(m.userId)).filter(Boolean)
    );
    return members.map((m, i) => ({
      userId: m.userId,
      role: m.role,
      addedAt: m.addedAt,
      email: users[i]?.email,
      name: users[i]?.name,
    }));
  },
});

export const isOwner = internalQuery({
  args: { userId: v.id("users"), petId: v.id("pets") },
  handler: async (ctx, { userId, petId }) => {
    const member = await ctx.db
      .query("petMembers")
      .withIndex("by_pet", (q) => q.eq("petId", petId))
      .filter((q) => q.and(q.eq(q.field("userId"), userId), q.eq(q.field("role"), "owner")))
      .first();
    return !!member;
  },
});

export const isMember = internalQuery({
  args: { userId: v.id("users"), petId: v.id("pets") },
  handler: async (ctx, { userId, petId }) => {
    const member = await ctx.db
      .query("petMembers")
      .withIndex("by_pet", (q) => q.eq("petId", petId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    return !!member;
  },
});

// Add a user to a pet (via invite acceptance).
export const addMember = internalMutation({
  args: {
    petId: v.id("pets"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
  },
  handler: async (ctx, { petId, userId, role }) => {
    const now = Date.now();
    await ctx.db.insert("petMembers", {
      petId,
      userId,
      role,
      addedAt: now,
    });
    return { ok: true };
  },
});
