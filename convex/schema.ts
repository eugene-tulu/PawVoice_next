// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  pets: defineTable({
    userId: v.string(),
    name: v.string(),
    breed: v.string(),
    age: v.number(),
    energy: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  }),

  sessions: defineTable({
    petId: v.id('pets'),
    transcript: v.string(),
    outcome: v.union(v.literal('success'), v.literal('retry')),
    createdAt: v.number(),
  }),
})