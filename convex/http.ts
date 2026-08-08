// convex/http.ts
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { vapiWebhook } from "./vapi";
import { dodoWebhook } from "./dodoWebhook";

const http = httpRouter();

// Better Auth routes (proxied from the Next.js frontend).
authComponent.registerRoutes(http, createAuth);

// Vapi server URL: assistant-request, tool-calls, end-of-call-report.
http.route({
  path: "/vapi/webhook",
  method: "POST",
  handler: vapiWebhook,
});

// Dodo Payments webhook (payment succeeded => add credits).
http.route({
  path: "/dodopayments-webhook",
  method: "POST",
  handler: dodoWebhook,
});

export default http;
