// convex/inviteInserts.ts
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Persist a pending invite row.
// Kept in its own module so invites.create (an action, because it also sends
// an email) can call it via ctx.runMutation without a same-module internal
// type cycle.
export const insert = internalMutation({
  args: {
    petId: v.id("pets"),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    token: v.string(),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: (ctx, args) => ctx.db.insert("invites", args),
});
