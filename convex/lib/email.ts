// convex/lib/email.ts
// Transactional email via the Resend SDK. Used by both Better Auth verification
// callbacks and app-originated emails (invite links, low-balance notices).
//
// Applied Resend skill best practices:
// - Idempotency: every send passes an Idempotency-Key so retries (Better Auth
//   auto-retries, Convex action retries) never deliver the same email twice.
// - Error handling: the SDK returns { data, error }; we check `error`
//   explicitly rather than relying on try/catch for API failures.
// - Deliverability: HTML + plain-text bodies, verified-domain "from" address,
//   and tracking disabled (default) for transactional mail.

import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Resend client
// ---------------------------------------------------------------------------

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured. Set it via `npx convex env set RESEND_API_KEY <key>`."
    );
  }
  return new Resend(apiKey);
}

function getFrom(): string {
  // Sending identity. Must be a verified domain on Resend. Override per-env
  // with RESEND_FROM (e.g. "PawVoice <noreply@pawvoice.com>").
  return process.env.RESEND_FROM ?? "PawVoice <hello@pawvoice.xyz>";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  idempotencyKey?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendResult {
  id?: string;
}

// ---------------------------------------------------------------------------
// Core send
// ---------------------------------------------------------------------------

export async function sendEmail(input: EmailOptions): Promise<SendResult> {
  const resend = getResend();

  const { data, error } = await resend.emails.send(
    {
      from: input.from ?? getFrom(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(input.tags && input.tags.length ? { tags: input.tags } : {}),
    },
    {
      // Idempotency key is sent as the `Idempotency-Key` header. Same key +
      // same payload returns the original response instead of resending.
      ...(input.idempotencyKey
        ? { idempotencyKey: input.idempotencyKey }
        : {}),
    }
  );

  if (error) {
    // The Resend SDK does NOT throw — it returns { data, error }.
    throw new Error(`Resend error: ${error.message}`);
  }

  return { id: data?.id };
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

export function appUrl(path: string): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "";
  return `${site}${path}`;
}

export function inviteAcceptUrl(token: string): string {
  return appUrl(`/invite/${token}`);
}

// ---------------------------------------------------------------------------
// Shared HTML layout
// ---------------------------------------------------------------------------

const BRAND = "#6366f1"; // indigo accent used across the app
const INK = "#1a1a1a";
const MUTED = "#6b7280";

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #ececec;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:32px 36px 8px;">
                <div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;color:${INK};">PawVoice</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 36px 36px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px;background:#fafafa;border-top:1px solid #ececec;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED};">
                  PawVoice &middot; ${new Date().getFullYear()}<br />
                  Questions? Reply to this email and we'll help.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:9px;">${label}</a>`;
}

// ---------------------------------------------------------------------------
// Email bodies (verification + password reset used by Better Auth)
// ---------------------------------------------------------------------------

export function verifyEmailHtml(url: string, email: string): string {
  return layout(
    "Verify your email",
    `
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:${INK};">Verify your email</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:${MUTED};">
      Hi${email ? ` ${email}` : ""}, thanks for signing up for PawVoice. Confirm your
      email address to start logging your pet's day with voice.
    </p>
    <p style="margin:0 0 24px;">${button(url, "Verify email")}</p>
    <p style="font-size:13px;line-height:1.5;margin:0;color:${MUTED};">
      This link expires in 24 hours. If you didn't create a PawVoice account you can
      safely ignore this email.
    </p>
  `
  );
}

export function verifyEmailText(url: string, email: string): string {
  return [
    "Verify your email",
    "",
    `Hi${email ? ` ${email}` : ""}, thanks for signing up for PawVoice.`,
    "Confirm your email address to start logging your pet's day with voice.",
    "",
    `Verify your email: ${url}`,
    "",
    "This link expires in 24 hours. If you didn't create a PawVoice account",
    "you can safely ignore this email.",
    "",
    "— PawVoice",
  ].join("\n");
}

export function resetPasswordHtml(url: string): string {
  return layout(
    "Reset your password",
    `
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:${INK};">Reset your password</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:${MUTED};">
      We received a request to reset your PawVoice password. Choose a new password
      using the button below.
    </p>
    <p style="margin:0 0 24px;">${button(url, "Reset password")}</p>
    <p style="font-size:13px;line-height:1.5;margin:0;color:${MUTED};">
      This link expires in 1 hour. If you didn't request a password reset you can
      safely ignore this email — your password won't change.
    </p>
  `
  );
}

export function resetPasswordText(url: string): string {
  return [
    "Reset your password",
    "",
    "We received a request to reset your PawVoice password.",
    "Choose a new password using the link below.",
    "",
    `Reset password: ${url}`,
    "",
    "This link expires in 1 hour. If you didn't request a password reset you can",
    "safely ignore this email — your password won't change.",
    "",
    "— PawVoice",
  ].join("\n");
}

export function inviteEmailHtml(url: string, expiresInDays = 7): string {
  return layout(
    "You're invited to PawVoice",
    `
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:${INK};">You've been invited</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:${MUTED};">
      A PawVoice user has invited you to follow a pet's activity log. Open your
      invite to get started.
    </p>
    <p style="margin:0 0 24px;">${button(url, "Open your invite")}</p>
    <p style="font-size:13px;line-height:1.5;margin:0;color:${MUTED};">
      This link expires in ${expiresInDays} days.
    </p>
  `
  );
}

export function inviteEmailText(url: string, expiresInDays = 7): string {
  return [
    "You've been invited to PawVoice",
    "",
    "A PawVoice user has invited you to follow a pet's activity log.",
    "Open your invite to get started.",
    "",
    `Open your invite: ${url}`,
    "",
    `This link expires in ${expiresInDays} days.`,
    "",
    "— PawVoice",
  ].join("\n");
}

export function lowBalanceHtml(checkoutUrl: string, portalUrl: string): string {
  return layout(
    "Your PawVoice balance is low",
    `
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:${INK};">Balance running low</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:${MUTED};">
      Your PawVoice call credits have dropped below $3. Top up now so your next
      voice log isn't interrupted.
    </p>
    <p style="margin:0 0 20px;">${button(checkoutUrl, "Top up $10")}</p>
    <p style="font-size:13px;line-height:1.5;margin:0;color:${MUTED};">
      You can also manage payment methods in your
      <a href="${portalUrl}" style="color:${BRAND};text-decoration:underline;">billing portal</a>.
    </p>
  `
  );
}

export function lowBalanceText(checkoutUrl: string, portalUrl: string): string {
  return [
    "Your PawVoice balance is low",
    "",
    "Your PawVoice call credits have dropped below $3.",
    "Top up now so your next voice log isn't interrupted.",
    "",
    `Top up $10: ${checkoutUrl}`,
    `Billing portal: ${portalUrl}`,
    "",
    "— PawVoice",
  ].join("\n");
}
