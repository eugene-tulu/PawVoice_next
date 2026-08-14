// convex/logs.ts
import { v } from "convex/values";
import type { DataModel, Id } from "./_generated/dataModel";
import type { GenericQueryCtx } from "convex/server";
import {
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { parseDurationMinutes, durationLabel } from "./lib/duration";

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const CANONICAL_ACTIVITIES = new Set([
  "walk", "run", "play", "feeding", "medication", "grooming",
  "bathroom", "poop", "pee", "vet", "training", "cuddle", "other",
]);
const ACTIVITY_ALIASES: Record<string, string> = {
  walked: "walk", walk: "walk", running: "run", ran: "run", run: "run",
  played: "play", play: "play", feeding: "feeding", fed: "feeding",
  "feed": "feeding", food: "feeding", ate: "feeding",
  meds: "medication", medicine: "medication", medication: "medication",
  pill: "medication", groomed: "grooming", grooming: "grooming",
  bathroom: "bathroom", peed: "pee", pee: "pee", pooped: "poop", poop: "poop",
  "pooped outside": "poop",
  "went potty": "bathroom", potty: "bathroom",
  vet: "vet", "vet visit": "vet", doctor: "vet",
  trained: "training", training: "training",
  cuddled: "cuddle", cuddle: "cuddle",
};

function normalizeActivity(raw: string | undefined | null): string {
  if (!raw) return "other";
  const key = raw.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (CANONICAL_ACTIVITIES.has(key)) return key;
  if (ACTIVITY_ALIASES[key]) return ACTIVITY_ALIASES[key];
  return "other";
}

function activityLabel(activity: string): string {
  const labels: Record<string, string> = {
    walk: "walk", run: "run", play: "play", feeding: "feeding",
    medication: "medication", grooming: "grooming", bathroom: "bathroom",
    poop: "poop", pee: "pee", vet: "vet visit", training: "training",
    cuddle: "cuddle", other: "activity",
  };
  return labels[activity] ?? "activity";
}

// --- Internal writes driven by the Vapi webhook (function calling). ---

export const logActivity = internalMutation({
  args: {
    pet: v.string(),
    activity_type: v.string(),
    duration: v.optional(v.string()),
    verbatim_notes: v.optional(v.string()),
    callId: v.string(),
    callerPhone: v.optional(v.string()),
    authId: v.optional(v.string()),
  },
  handler: async (ctx, { pet, activity_type, duration, verbatim_notes, callId, callerPhone, authId }) => {
    let user = null;
    if (callerPhone) {
      user = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", callerPhone))
        .first();
    }
    if (!user && authId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_auth_id", (q) => q.eq("authId", authId))
        .first();
    }
    if (!user) {
      return {
        ok: false,
        readback:
          "No account is registered for this caller. Sign up in the PawVoice app before calling. Thank you.",
      };
    }

    // Resolve pet by name among THIS caller's pet memberships (case-insensitive).
    const name = pet.trim();
    const memberships = await ctx.db
      .query("petMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const candidates: Array<{ _id: Id<"pets">; name: string; species: string }> =
      [];
    for (const m of memberships) {
      const p = await ctx.db.get(m.petId);
      if (p && p.name.toLowerCase() === name.toLowerCase()) {
        candidates.push({ _id: p._id, name: p.name, species: p.species });
      }
    }

    if (candidates.length === 0) {
      return {
        ok: false,
        readback: `I couldn't find a pet named ${name} under your account. Please check the name or add the pet in the app.`,
      };
    }
    if (candidates.length > 1) {
      return {
        ok: false,
        readback: `You have multiple pets named ${name}. Please rename one in the app so each pet has a unique name.`,
      };
    }

    const chosen = candidates[0]!;
    const activity = normalizeActivity(activity_type);
    const minutes = parseDurationMinutes(duration);
    const notes = verbatim_notes?.trim() || undefined;
    const now = Date.now();

    const id = await ctx.db.insert("logs", {
      petId: chosen._id,
      userId: user._id,
      callerId: callerPhone ?? user.authId,
      activityType: activity,
      durationMinutes: minutes ?? undefined,
      durationRaw: duration ?? undefined,
      notes,
      sessionId: callId,
      callId,
      timestamp: now,
    });

    const dur = durationLabel(minutes);
    const readback =
      `Logged: ${activityLabel(activity)} for ${chosen.name}, ${dur}. ` +
      `Notes: ${notes ?? "none noted"}. Is that correct?`;

    return {
      ok: true,
      entryId: id,
      readback,
      petId: chosen._id,
      activityType: activity,
      durationMinutes: minutes ?? undefined,
      notes,
    };
  },
});

export const undoLastEntry = internalMutation({
  args: { callId: v.string(), callerPhone: v.optional(v.string()), authId: v.optional(v.string()) },
  handler: async (ctx, { callId, callerPhone, authId }) => {
    const callerId = callerPhone ?? authId ?? "";
    const last = await ctx.db
      .query("logs")
      .withIndex("by_call", (q) => q.eq("callId", callId))
      .filter((q) => q.eq(q.field("callerId"), callerId))
      .order("desc")
      .first();
    if (!last) {
      return {
        ok: false,
        readback: "There's nothing to undo. Go ahead and tell me about the correct pet.",
      };
    }
    // Only allow undo of entries from the current call (safe within-call correction).
    if (last.callId !== callId) {
      return {
        ok: false,
        readback: "I can only correct the most recent entry in this call.",
      };
    }
    await ctx.db.delete(last._id);
    return {
      ok: true,
      readback:
        "Okay, I removed that entry. Tell me about the correct pet, activity and duration.",
    };
  },
});

// Ordered log feed for a pet (used by the viewer + exports).
async function orderedLogs(
  ctx: GenericQueryCtx<DataModel>,
  petId: Id<"pets">,
  limit = 100
) {
  const found = await ctx.db
    .query("logs")
    .withIndex("by_pet_time", (q) => q.eq("petId", petId))
    .order("desc")
    .take(limit);
  return Promise.all(
    found.map(async (l) => {
      const u = l.userId ? await ctx.db.get(l.userId) : null;
      return { ...l, callerName: u?.name ?? u?.email ?? "…" };
    })
  );
}

// Public: list a pet's logs (caller must be a member).
export const listByPet = query({
  args: { petId: v.id("pets"), limit: v.optional(v.number()) },
  handler: async (ctx, { petId, limit }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user) return null;
    const member = await ctx.db
      .query("petMembers")
      .withIndex("by_pet", (q) => q.eq("petId", petId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();
    if (!member) return null;
    return orderedLogs(ctx, petId, limit ?? 100);
  },
});

const EDITABLE = v.object({
  logId: v.id("logs"),
  notes: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
});

// 24-hour edit window for the original logger (typo / correction fixes).
export const editLog = mutation({
  args: EDITABLE,
  handler: async (ctx, { logId, notes, durationMinutes }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user) throw new Error("User not found");
    const log = await ctx.db.get(logId);
    if (!log) throw new Error("Log not found");
    if (log.userId !== user._id) throw new Error("Not authorized");
    if (Date.now() - log.timestamp > EDIT_WINDOW_MS)
      throw new Error("Edit window closed (24 hours)");
    const patch: Record<string, unknown> = { editedAt: Date.now() };
    if (notes !== undefined) patch.notes = notes;
    if (durationMinutes !== undefined) patch.durationMinutes = durationMinutes;
    await ctx.db.patch(logId, patch);
    return { ok: true };
  },
});

export const deleteLog = mutation({
  args: { logId: v.id("logs") },
  handler: async (ctx, { logId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user) throw new Error("User not found");
    const log = await ctx.db.get(logId);
    if (!log) throw new Error("Log not found");
    if (log.userId !== user._id) throw new Error("Not authorized");
    if (Date.now() - log.timestamp > EDIT_WINDOW_MS)
      throw new Error("Edit window closed (24 hours)");
    await ctx.db.delete(logId);
    return { ok: true };
  },
});

export const countByCall = internalQuery({
  args: { callId: v.string() },
  handler: async (ctx, { callId }) => {
    const found = await ctx.db
      .query("logs")
      .withIndex("by_call", (q) => q.eq("callId", callId))
      .collect();
    return found.length;
  },
});

export const exportJson = query({
  args: { petId: v.id("pets") },
  handler: async (ctx, { petId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user) throw new Error("User not found");
    const member = await ctx.runQuery(internal.petMembers.isMember, {
      userId: user._id,
      petId,
    });
    if (!member) throw new Error("Not authorized");
    return orderedLogs(ctx, petId, 1000);
  },
});

export const exportCsv = query({
  args: { petId: v.id("pets") },
  handler: async (ctx, { petId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });
    if (!user) throw new Error("User not found");
    const member = await ctx.runQuery(internal.petMembers.isMember, {
      userId: user._id,
      petId,
    });
    if (!member) throw new Error("Not authorized");
    const rows = (await orderedLogs(
      ctx,
      petId,
      1000
    )) as unknown as Array<Record<string, unknown>>;
    const columns = [
      "timestamp", "pet", "activityType", "durationMinutes",
      "durationRaw", "notes", "callerName", "sessionId",
    ];
    const esc = (s: unknown) =>
      `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [columns.join(",")];
    for (const r of rows) {
      lines.push(columns.map((c) => esc(r[c])).join(","));
    }
    return lines.join("\n");
  },
});
