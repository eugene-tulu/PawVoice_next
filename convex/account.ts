// convex/account.ts
// Self-service account deletion. Removes all personal data we control for the
// calling user: their app profile, pets they own (and the logs/links/invites
// tied to those pets), their memberships in other pets, call sessions, usage
// events, phone verifications, sent invites, and payment rows.
//
// The Better Auth identity itself is deleted separately from the client
// (authClient.deleteUser) since the @convex-dev/better-auth component does not
// expose a server-side delete in this version. Call this mutation FIRST (while
// the user is still authenticated), then delete the auth identity on the client.
import { mutation } from "./_generated/server";

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
    const userId = user._id;

    // Pets this user belongs to (as owner or member).
    const memberships = await ctx.db
      .query("petMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const petIds = memberships.map((m) => m.petId);

    // All access links (used to scope deletes to owned pets below).
    const allLinks = await ctx.db.query("accessLinks").collect();

    for (const petId of petIds) {
      const pet = await ctx.db.get(petId);
      if (!pet || pet.ownerId !== userId) continue;

      // Activity logs for this pet.
      const petLogs = await ctx.db
        .query("logs")
        .withIndex("by_pet_time", (q) => q.eq("petId", petId))
        .collect();
      for (const l of petLogs) await ctx.db.delete(l._id);

      // View-only access links for this pet.
      for (const link of allLinks) {
        if (link.petId === petId) await ctx.db.delete(link._id);
      }

      // Pending invites for this pet.
      const petInvites = await ctx.db
        .query("invites")
        .withIndex("by_pet", (q) => q.eq("petId", petId))
        .collect();
      for (const inv of petInvites) await ctx.db.delete(inv._id);

      // The pet itself.
      await ctx.db.delete(petId);
    }

    // Remove every membership row for this user.
    for (const m of memberships) await ctx.db.delete(m._id);

    // Safety nets for any rows keyed by userId that aren't covered above.
    const userLogs = await ctx.db
      .query("logs")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const l of userLogs) await ctx.db.delete(l._id);

    const sessions = await ctx.db
      .query("callSessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);

    const usage = await ctx.db
      .query("usageEvents")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const u of usage) await ctx.db.delete(u._id);

    const phones = await ctx.db
      .query("phoneVerifications")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const p of phones) await ctx.db.delete(p._id);

    const sentInvites = await ctx.db
      .query("invites")
      .filter((q) => q.eq(q.field("invitedBy"), userId))
      .collect();
    for (const inv of sentInvites) await ctx.db.delete(inv._id);

    const payments = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const p of payments) await ctx.db.delete(p._id);

    // Finally, delete the user profile row.
    await ctx.db.delete(userId);

    return { ok: true };
  },
});
