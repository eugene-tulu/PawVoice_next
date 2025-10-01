// src/app/api/auth/[...all]/route.ts
import { nextJsHandler } from "@convex-dev/better-auth/nextjs";

// Export the handlers returned by nextJsHandler directly
export const { GET, POST } = nextJsHandler();