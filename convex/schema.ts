// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const ACTIVITY_TYPES = [
  "walk",
  "run",
  "play",
  "feeding",
  "medication",
  "grooming",
  "bathroom",
  "poop",
  "pee",
  "vet",
  "training",
  "cuddle",
  "other",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const PET_MEMBER_ROLES = ["owner", "member"] as const;
export type PetMemberRole = (typeof PET_MEMBER_ROLES)[number];

export default defineSchema({
  // App user, mirrored from the Better Auth identity (authId == subject).
  users: defineTable({
    authId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()), // E.164, unique when present
    phoneVerified: v.optional(v.boolean()),
    role: v.union(v.literal("sitter"), v.literal("owner")),
    credits: v.number(), // integer cents (pay-as-you-go)
    dodoCustomerId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_auth_id", ["authId"])
    .index("by_email", ["email"])
    .index("by_phone", ["phone"]),

  pets: defineTable({
    name: v.string(),
    species: v.string(), // "dog" | "cat" (free-form, defaults to "dog")
    breed: v.optional(v.string()),
    age: v.optional(v.number()),
    notes: v.optional(v.string()),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }),

  // Membership / permissions on a pet. Creator is 'owner'; invited users are 'member'.
  petMembers: defineTable({
    petId: v.id("pets"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
    addedAt: v.number(),
  })
    .index("by_pet", ["petId"])
    .index("by_user", ["userId"]),

  // Email invites to a pet (links invitee to the INVITER's pet record; no dedup/merge).
  invites: defineTable({
    petId: v.id("pets"),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    token: v.string(),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_pet", ["petId"])
    .index("by_email", ["email"]),

  // Structured activity log, written by the Vapi webhook (function calling).
  logs: defineTable({
    petId: v.id("pets"),
    userId: v.id("users"), // who spoke (caller)
    callerId: v.string(), // E.164 of caller
    activityType: v.string(), // canonical ActivityType
    durationMinutes: v.optional(v.number()),
    durationRaw: v.optional(v.string()),
    notes: v.optional(v.string()),
    sessionId: v.string(), // Vapi call.id — groups multi-pet logs per call
    callId: v.optional(v.string()),
    timestamp: v.number(), // when logged
    editedAt: v.optional(v.number()),
  })
    .index("by_pet_time", ["petId", "timestamp"])
    .index("by_call", ["callId"])
    .index("by_caller_time", ["callerId", "timestamp"])
    .index("by_session", ["sessionId"]),

  // Tracks a single Vapi call for billing / low-balance pre-check.
  callSessions: defineTable({
    callId: v.string(), // Vapi call.id
    callerPhone: v.string(), // E.164
    userId: v.optional(v.id("users")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    durationSec: v.optional(v.number()),
    costCents: v.optional(v.number()),
    assistantId: v.optional(v.string()),
  }).index("by_call_id", ["callId"]),

  // View-only access link for non-account holders.
  accessLinks: defineTable({
    petId: v.id("pets"),
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  }).index("by_token", ["token"]),

  // Usage instrumentation for future tier design.
  usageEvents: defineTable({
    userId: v.id("users"),
    callId: v.string(),
    durationSec: v.number(),
    costCents: v.number(),
    activityCount: v.number(),
    initiatedBy: v.string(), // "sitter" | "owner"
    recordedAt: v.number(),
  }),

  // One-time access codes for phone number verification (owner claims their number).
  phoneVerifications: defineTable({
    userId: v.optional(v.id("users")),
    phone: v.string(),
    code: v.string(),
    expiresAt: v.number(),
  }).index("by_phone", ["phone"]),

  // Dodo webhook bookkeeping (so we can dedupe / debug).
  payments: defineTable({
    dodoPaymentId: v.string(),
    userId: v.optional(v.id("users")),
    email: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    recordedAt: v.number(),
  }).index("by_dodo_payment_id", ["dodoPaymentId"]),
});
