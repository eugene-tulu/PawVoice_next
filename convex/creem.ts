// convex/creem.ts
//
// Creem webhook signature verification (raw REST integration, no SDK). The
// HMAC-SHA256 digest is verified against the `creem-signature` header. This
// module is imported only by creemWebhook.ts, keeping `crypto.subtle` types out
// of billing.ts (whose internalAction graph previously hit TS2589 when the
// WebCrypto types were in its import path).
//
// Refs: https://docs.creem.io (webhooks: HMAC-SHA256 over the raw body).

export function creemWebhookSecret(): string {
  const s = process.env.CREEM_WEBHOOK_SECRET;
  if (!s) throw new Error("CREEM_WEBHOOK_SECRET environment variable is required");
  return s;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function creemVerifyWebhook(
  body: string,
  getHeader: (name: string) => string | null
): Promise<unknown> {
  const secret = creemWebhookSecret();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(body)
  );
  // Compare the raw HMAC-SHA256 digest (always 32 bytes) against the
  // hex-decoded header with a constant-time XOR comparison. The web runtime has
  // no crypto.timingSafeEqual, so we implement it on the digest buffers; the
  // length guard keeps the loop bounds fixed.
  const provided = getHeader("creem-signature");
  if (!provided) throw new Error("Missing creem-signature header");
  const expected = new Uint8Array(sigBuf);
  const received = hexToBytes(provided);
  if (received.length !== expected.length) {
    throw new Error("Invalid Creem webhook signature");
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ received[i];
  if (diff !== 0) throw new Error("Invalid Creem webhook signature");
  return JSON.parse(body);
}
