// convex/users.ts
import { query, mutation } from './_generated/server';
import { authComponent } from './auth';
import { v } from 'convex/values';

async function getOrCreateAppUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) throw new Error("Unauthorized");
  if (!authUser.emailVerified) throw new Error("Email not verified");

  const existing = await ctx.db
    .query('users')
    .withIndex('by_auth_id', (q: any) => q.eq('authId', authUser._id))
    .first();

  if (existing) return existing;

  return await ctx.db.insert('users', {
    authId: authUser._id,
    minutesRemaining: 0,
  });
}

export const getBalance = query({
  handler: async (ctx) => {
    const user = await getOrCreateAppUser(ctx);
    return { minutesRemaining: user.minutesRemaining };
  },
});

// 💰 $0.60 per minute → 60 cents = 1 minute
const CENTS_PER_MINUTE = 60;

export const addMinutesFromPayment = mutation({
  args: { cents: v.number() },
  handler: async (ctx, { cents }) => {
    const user = await getOrCreateAppUser(ctx);
    const minutesToAdd = cents / CENTS_PER_MINUTE;
    const newBalance = user.minutesRemaining + minutesToAdd;
    await ctx.db.patch(user._id, { minutesRemaining: newBalance });
    return { minutes: minutesToAdd, total: newBalance };
  },
});

export const deductMinutes = mutation({
  args: { minutesUsed: v.number() },
  handler: async (ctx, { minutesUsed }) => {
    const user = await getOrCreateAppUser(ctx);
    const newBalance = Math.max(0, user.minutesRemaining - minutesUsed);
    await ctx.db.patch(user._id, { minutesRemaining: newBalance });
    return newBalance;
  },
});