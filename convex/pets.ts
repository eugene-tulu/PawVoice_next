// convex/pets.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

function currentUser(ctx: { db: import("./_generated/server").DatabaseReader }, authId: string) {
  return ctx.db
    .query("users")
    .withIndex("by_auth_id", (q) => q.eq("authId", authId))
    .first();
}

export const create = mutation({
  args: {
    name: v.string(),
    species: v.optional(v.string()),
    breed: v.optional(v.string()),
    age: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await currentUser(ctx, identity.subject);
    if (!user) throw new Error("User not found");
    if (!user.phone) throw new Error("Add a phone number before creating a pet");

    const now = Date.now();
    const petId = await ctx.db.insert("pets", {
      name: args.name.trim(),
      species: args.species?.trim() || "dog",
      breed: args.breed,
      age: args.age,
      notes: args.notes,
      ownerId: user._id,
      createdAt: now,
    });
    await ctx.db.insert("petMembers", {
      petId,
      userId: user._id,
      role: "owner",
      addedAt: now,
    });
    return petId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await currentUser(ctx, identity.subject);
    if (!user) return [];
    const memberships = await ctx.db
      .query("petMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const pets = await Promise.all(
      memberships.map((m) => ctx.db.get(m.petId))
    );
    return pets.filter((p): p is Doc<"pets"> => p !== null);
  },
});

export const get = query({
  args: { petId: v.id("pets") },
  handler: async (ctx, { petId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await currentUser(ctx, identity.subject);
    if (!user) return null;
    const member = await ctx.db
      .query("petMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("petId"), petId))
      .first();
    if (!member) return null;
    const pet = await ctx.db.get(petId);
    if (!pet) return null;

    const members = await ctx.db
      .query("petMembers")
      .withIndex("by_pet", (q) => q.eq("petId", petId))
      .collect();
    const memberDetails: Array<{
      userId: Doc<"users">["_id"];
      role: "owner" | "member";
      addedAt: number;
      email?: string;
      name?: string;
    }> = [];
    for (const m of members) {
      const u = await ctx.db.get(m.userId);
      memberDetails.push({
        userId: m.userId,
        role: m.role,
        addedAt: m.addedAt,
        email: u?.email,
        name: u?.name,
      });
    }
    return { ...pet, members: memberDetails };
  },
});

export const update = mutation({
  args: {
    petId: v.id("pets"),
    name: v.optional(v.string()),
    species: v.optional(v.string()),
    breed: v.optional(v.string()),
    age: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { petId, ...patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await currentUser(ctx, identity.subject);
    if (!user) throw new Error("User not found");

    const isOwner = await ctx.db
      .query("petMembers")
      .withIndex("by_pet", (q) => q.eq("petId", petId))
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("role"), "owner")
        )
      )
      .first();
    if (!isOwner) throw new Error("Not authorized to edit this pet");

    const update: Record<string, unknown> = {};
    if (patch.name) update.name = patch.name.trim();
    if (patch.species) update.species = patch.species.trim();
    if (patch.breed !== undefined) update.breed = patch.breed;
    if (patch.age !== undefined) update.age = patch.age;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (Object.keys(update).length > 0) await ctx.db.patch(petId, update);
    return { ok: true };
  },
});
