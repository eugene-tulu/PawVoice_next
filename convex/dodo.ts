// convex/dodo.ts
//
// Direct Dodo Payments REST integration. We avoid `@dodopayments/convex`'s
// component because registering it (`app.use(dodopayments)`) adds its schema
// to the Convex `DataModel`, whose generated types make every Convex builder
// hit TS2589 ("Type instantiation is excessively deep") under the project's
// TypeScript. Calling Dodo's REST API directly keeps the type-check clean.

export type DodoEnvironment = "test_mode" | "live_mode";

export const DODO_BASE: Record<DodoEnvironment, string> = {
  test_mode: "https://test.dodopayments.com/api/v1",
  live_mode: "https://live.dodopayments.com/api/v1",
};

function dodoEnv(): DodoEnvironment {
  const e = (process.env.DODO_ENV ?? "test_mode") as DodoEnvironment;
  return e === "live_mode" ? "live_mode" : "test_mode";
}

export function dodoApiKey(): string {
  const k = process.env.DODO_API_KEY;
  if (!k) throw new Error("DODO_API_KEY environment variable is required");
  return k;
}

export function dodoWebhookSecret(): string {
  const s = process.env.DODO_WEBHOOK_SECRET;
  if (!s) throw new Error("DODO_WEBHOOK_SECRET environment variable is required");
  return s;
}

export const CREDIT_PACKS: Record<number, string | undefined> = {
  1000: process.env.DODO_CREDIT_PACK_10,
  2500: process.env.DODO_CREDIT_PACK_25,
  6000: process.env.DODO_CREDIT_PACK_60,
};

export function creditPackName(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function b64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64Encode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function constTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function dodoCheckoutUrl(opts: {
  packCents: number;
  email?: string;
  name?: string;
  returnUrl?: string;
}): Promise<string> {
  const productId = CREDIT_PACKS[opts.packCents];
  if (!productId) {
    throw new Error(
      `No Dodo product configured for the ${creditPackName(
        opts.packCents
      )} credit pack (set DODO_CREDIT_PACK_${Math.round(opts.packCents / 100)})`
    );
  }
  const payload: Record<string, unknown> = {
    product_cart: [{ product_id: productId, quantity: 1 }],
    return_url: opts.returnUrl,
  };
  if (opts.email) {
    payload.customer = { email: opts.email, name: opts.name ?? undefined };
  }
  const res = await fetch(`${DODO_BASE[dodoEnv()]}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${dodoApiKey()}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Dodo checkout failed (${res.status}): ${txt}`);
  }
  const json = (await res.json()) as { checkout_url?: string };
  if (!json.checkout_url) {
    throw new Error("Dodo checkout response did not include a checkout_url");
  }
  return json.checkout_url;
}

export async function dodoCustomerPortalUrl(opts: {
  customerId: string;
  returnUrl?: string;
  sendEmail?: boolean;
}): Promise<string> {
  const params = new URLSearchParams();
  if (opts.returnUrl) params.set("return_url", opts.returnUrl);
  if (opts.sendEmail) params.set("send_email", "true");
  const qs = params.toString();
  const res = await fetch(
    `${DODO_BASE[dodoEnv()]}/customers/${encodeURIComponent(opts.customerId)}/customer-portal/session${
      qs ? `?${qs}` : ""
    }`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${dodoApiKey()}`,
      },
      body: "{}",
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Dodo customer portal failed (${res.status}): ${txt}`);
  }
  const json = (await res.json()) as { link?: string };
  if (!json.link) throw new Error("Dodo portal response did not include a link");
  return json.link;
}

export async function dodoVerifyWebhook(
  body: string,
  getHeader: (name: string) => string | null
): Promise<unknown> {
  const secret = dodoWebhookSecret();
  const key = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret;
  const keyBytes = b64Decode(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
  const msgId = getHeader("webhook-id");
  const msgSignature = getHeader("webhook-signature");
  const msgTimestamp = getHeader("webhook-timestamp");
  if (!msgId || !msgSignature || !msgTimestamp) {
    throw new Error("Missing required Dodo webhook headers");
  }
  const timestamp = parseInt(msgTimestamp, 10);
  if (Number.isNaN(timestamp)) throw new Error("Invalid webhook timestamp");
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    throw new Error("Webhook timestamp outside tolerance");
  }
  const toSign = `${msgId}.${msgTimestamp}.${body}`;
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(toSign)
  );
  const expectedB64 = b64Encode(new Uint8Array(sigBuf));
  for (const versioned of msgSignature.split(" ")) {
    const [version, sig] = versioned.split(",");
    if (version === "v1" && sig !== undefined && constTimeEqual(sig, expectedB64)) {
      return JSON.parse(body);
    }
  }
  throw new Error("Invalid Dodo webhook signature");
}