// convex/sessions.ts
// The old "voice coaching sessions" table is retired. Activity logs now live in
// `convex/logs.ts` and call metadata in `convex/callSessions`. This file is kept
// as an empty module to avoid breaking import resolution; do not re-export
// anything that references removed tables.
export {};
