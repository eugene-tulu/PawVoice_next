// convex/lib/email.ts
// Transactional email via Resend. Used by both Better Auth verification callbacks
// and app-originated emails (invite links, low-balance notices).

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(input: EmailInput): Promise<{ id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured. Set it via `npx convex env set RESEND_API_KEY <key>`."
    );
  }
  const from =
    input.from ?? process.env.RESEND_FROM ?? "PawVoice <hello@pawvoice.com>";
  const res = await fetch("https://api.resend.dev/v1/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
  return (await res.json().catch(() => ({}))) as { id?: string };
}

export function viewOnlyLinkUrl(token: string): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "";
  return `${site}/p/${token}`;
}

export function appUrl(path: string): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "";
  return `${site}${path}`;
}

export function inviteAcceptUrl(token: string): string {
  return appUrl(`/invite/${token}`);
}

export function verifyEmailHtml(url: string, email: string): string {
  return `<html><body>
<h2>Verify your email</h2>
<p>Hi ${email ?? ""},</p>
<p>Please verify your email to continue using PawVoice:</p>
<p><a href="${url}">Verify email</a></p>
<p>If you didn't sign up, you can ignore this email.</p>
</body></html>`;
}

export function resetPasswordHtml(url: string): string {
  return `<html><body>
<h2>Reset your password</h2>
<p><a href="${url}">Reset password</a></p>
</body></html>`;
}
