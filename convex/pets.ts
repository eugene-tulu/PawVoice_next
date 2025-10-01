// convex/pets.ts
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { authComponent } from './auth'

export const create = mutation({
  args: {
    name: v.string(),
    breed: v.string(),
    age: v.number(),
    energy: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')
    return ctx.db.insert('pets', { ...args, userId: user._id })
  },
})

export const list = query({
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return []
    return await ctx.db.query('pets').filter(q => q.eq(q.field('userId'), user._id)).collect()
  },
})