// convex/alerts.ts
//
// Best-effort admin alerting for payment/webhook failures. Kept as a separate
// internalAction (not imported directly by httpActions) so the Resend/Node
// dependency stays out of the httpAction V8 bundle (the same reason billing.ts
// and webCall.ts avoid importing lib/email directly). httpActions call this via
// ctx.runAction so the alert is delivered without blocking the webhook response.
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { sendEmail } from "./lib/email";

function alertAddress(): string | null {
  // Send to ALERT_EMAIL if set; otherwise fall back to the verified "from"
  // address so a misconfig is still observable in that inbox.
  const raw = process.env.ALERT_EMAIL ?? process.env.RESEND_FROM ?? "";
  if (!raw) return null;
  // Accept either "email@x.com" or "Name <email@x.com>".
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim() || null;
}

export const notify = internalAction({
  args: { subject: v.string(), message: v.string() },
  handler: async (_ctx, { subject, message }) => {
    const to = alertAddress();
    if (!to) return;
    try {
      await sendEmail({
        to,
        subject: `[PawVoice] ${subject}`,
        html: `<pre style="white-space:pre-wrap;font-family:monospace;">${message}</pre>`,
        text: message,
      });
    } catch (e) {
      // Never let alerting failures break the calling path.
      console.error("alert notify failed:", e);
    }
  },
});
