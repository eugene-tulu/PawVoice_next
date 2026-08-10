// convex/dodo.ts
//
// Re-export shim. billing.ts (an internalAction with a deep ctx.runQuery/
// runMutation chain) only type-checks when it imports its checkout helper from
// a module named `dodo` — any other name (creem/checkout/gateway) tips the
// Convex-generated `internal.*` type graph into a TS2589 cascade. The actual
// implementation lives in ./checkout and ./creem. Keep this filename stable.
export { creemCheckoutUrl } from "./checkout";
