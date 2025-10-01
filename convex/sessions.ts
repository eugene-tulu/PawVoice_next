// convex/sessions.ts
import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { authComponent } from './auth'

export const create = mutation({
  args: {
    petId: v.id('pets'),
    transcript: v.string(),
    outcome: v.union(v.literal('success'), v.literal('retry')),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')
    // Optional: verify pet belongs to user
    return ctx.db.insert('sessions', args)
  },
})