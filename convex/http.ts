// convex/http.ts
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { vapiWebhook } from "./vapi";
import { creemWebhook } from "./creemWebhook";

const http = httpRouter();

// Better Auth routes (proxied from the Next.js frontend).
authComponent.registerRoutes(http, createAuth);

// Vapi server URL: assistant-request, tool-calls, end-of-call-report.
http.route({
  path: "/vapi/webhook",
  method: "POST",
  handler: vapiWebhook,
});

// Creem webhook (checkout.completed => add credits).
http.route({
  path: "/creem-webhook",
  method: "POST",
  handler: creemWebhook,
});

export default http;
