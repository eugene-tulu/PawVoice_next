// convex/users.ts
import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { normalizePhone } from "./lib/phone";

// Public mutations exposed to the authenticated client.
export const registerPhone = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const e164 = normalizePhone(phone);
    if (!e164) throw new Error("Invalid phone number");

    // Ensure no other account owns this phone.
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", e164))
      .first();
    if (existing && existing._id !== user._id)
      throw new Error("This phone number is already registered to another account");

    // Trust-on-register for v1: the caller must call FROM this exact number for
    // Vapi caller-ID mapping, so a malicious user would need to also receive calls
    // on it. Proper OTP verification (via an A/B flow) is a v1.1 follow-up.
    await ctx.db.patch(user._id, { phone: e164, phoneVerified: true });
    return { ok: true, phone: e164 };
  },
});

export const addCredits = mutation({
  args: { amountCents: v.number(), reason: v.string() },
  handler: async (ctx, { amountCents, reason }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
    if (amountCents <= 0) throw new Error("Amount must be positive");
    const credits = user.credits + Math.round(amountCents);
    await ctx.db.patch(user._id, { credits });
    return { credits, reason };
  },
});

export const setDodoCustomer = mutation({
  args: { dodoCustomerId: v.string() },
  handler: async (ctx, { dodoCustomerId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { dodoCustomerId });
    return { ok: true };
  },
});

// Public read API for the client (balance, profile).
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
  },
});

// Pre-call gate for the web-call flow, which has no `assistant-request` event to
// block on (that only fires for inbound phone calls). Mirrors the BUFFER_CENTS
// check in convex/vapi.ts — must stay in sync with that value (currently 500).
export const canStartCall = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { ok: false as const, credits: 0 };
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (!user) return { ok: false as const, credits: 0 };
    return { ok: user.credits > -500, credits: user.credits };
  },
});

// Internal helpers used by the Vapi webhook and other functions.
export const getByAuthId = internalQuery({
  args: { authId: v.string() },
  handler: async (ctx, { authId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", authId))
      .first();
  },
});

export const getByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
  },
});

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first();
  },
});

export const byId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => ctx.db.get(userId),
});

export const deductCredits = internalMutation({
  args: { userId: v.id("users"), amountCents: v.number(), reason: v.string() },
  handler: async (ctx, { userId, amountCents, reason }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(userId, {
      credits: Math.round(user.credits - amountCents),
    });
    return { credits: Math.round(user.credits - amountCents), reason };
  },
});

export const create = internalMutation({
  args: {
    authId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal("sitter"), v.literal("owner"))),
  },
  handler: async (ctx, { authId, email, name, role }) => {
    const now = Date.now();
    const _id = await ctx.db.insert("users", {
      authId,
      email,
      name,
      role: role ?? "sitter",
      credits: 0,
      createdAt: now,
    });
    return _id;
  },
});

// Bootstrap the app "shadow" user row for a Better Auth identity. Called after
// email verification, before the caller needs phone registration / billing.
export const ensureRow = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, { name }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (!identity.email) throw new Error("Authenticated identity has no email");
    let user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (!user) {
      await ctx.db.insert("users", {
        authId: identity.subject,
        email: identity.email,
        name: name ?? identity.nickname ?? identity.name ?? undefined,
        role: "sitter",
        credits: 0,
        createdAt: Date.now(),
      });
      user = await ctx.db
        .query("users")
        .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
        .first();
    } else if (name) {
      await ctx.db.patch(user._id, { name });
    }
    return user;
  },
});

export const setRole = mutation({
  args: { role: v.union(v.literal("sitter"), v.literal("owner")) },
  handler: async (ctx, { role }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { role });
    return { ok: true, role };
  },
});

export const listPendingInvitesForEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("acceptedAt"), undefined))
      .collect();
  },
});
