// convex/invites.ts
import { v } from "convex/values";
import { mutation, query, action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { sendEmail, inviteAcceptUrl } from "./lib/email";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Owner invites an owner/sitter by email. Sends an accept link.
export const create = action({
  args: {
    petId: v.id("pets"),
    email: v.string(),
    role: v.optional(v.union(v.literal("owner"), v.literal("member"))),
  },
  handler: async (ctx: ActionCtx, { petId, email, role }): Promise<Id<"invites">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user) throw new Error("User not found");
    const isOwner = await ctx.runQuery(internal.petMembers.isOwner, {
      userId: user._id,
      petId,
    });
    if (!isOwner) throw new Error("Only the pet owner can invite someone");

    const token = crypto.randomUUID();
    const now = Date.now();
    const inviteId = await ctx.runMutation(internal.inviteInserts.insert, {
      petId,
      email,
      role: role ?? "member",
      token,
      invitedBy: user._id,
      createdAt: now,
      expiresAt: now + INVITE_TTL_MS,
    });

    const url = inviteAcceptUrl(token);
    await sendEmail({
      to: email,
      subject: "You've been invited to view a pet in PawVoice",
      html: `
        <h2>PawVoice invitation</h2>
        <p>You've been invited to follow a pet's activity log.</p>
        <p><a href="${url}">Open your invite</a></p>
        <p>This link expires in 7 days.</p>
      `,
    });
    return inviteId;
  },
});

export const pendingForPet = query({
  args: { petId: v.id("pets") },
  handler: async (ctx, { petId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user) return [];
    const owner = await ctx.runQuery(internal.petMembers.isOwner, {
      userId: user._id,
      petId,
    });
    if (!owner) return [];
    return await ctx.db
      .query("invites")
      .withIndex("by_pet", (q) => q.eq("petId", petId))
      .filter((q) => q.eq(q.field("acceptedAt"), undefined))
      .collect();
  },
});

export const accept = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (!identity.email) throw new Error("Authenticated identity has no email");
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!invite) throw new Error("Invalid invite");
    if (invite.expiresAt < Date.now()) throw new Error("Invite expired");
    if (invite.acceptedAt) throw new Error("Invite already accepted");

    let user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user) {
      await ctx.runMutation(internal.users.create, {
        authId: identity.subject,
        email: identity.email,
        name: identity.nickname ?? identity.name ?? undefined,
        role: "owner",
      });
      user = await ctx.runQuery(internal.users.getByAuthId, {
        authId: identity.subject,
      });
    }
    if (!user) throw new Error("User not found");

    await ctx.runMutation(internal.petMembers.addMember, {
      petId: invite.petId,
      userId: user._id,
      role: invite.role,
    });
    await ctx.db.patch(invite._id, { acceptedAt: Date.now() });
    return { ok: true, petId: invite.petId };
  },
});

export const revoke = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Invite not found");
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user || user._id !== invite.invitedBy)
      throw new Error("Not authorized");
    await ctx.db.delete(inviteId);
    return { ok: true };
  },
});
