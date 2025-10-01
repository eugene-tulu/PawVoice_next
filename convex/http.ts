// convex/http.ts
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();
console.log("🔌 Mounting Better Auth routes...");
authComponent.registerRoutes(http, createAuth);
console.log("✅ Better Auth routes mounted");
export default http;