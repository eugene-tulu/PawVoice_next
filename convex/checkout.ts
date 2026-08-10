// convex/checkout.ts
//
// Creem checkout / customer-portal REST helpers. Deliberately crypto-free:
// the webhook HMAC verification lives in ./creem.ts. Keeping this module free
// of `crypto.subtle` types avoids pulling WebCrypto into billing.ts's
// internalAction graph, which previously tripped a TS2589 type-instantiation
// cascade.
//
// Refs: https://docs.creem.io (checkouts: POST /v1/checkouts; customer billing:
// POST /v1/customers/billing).

export type CreemEnvironment = "test" | "live";

export const CREEM_BASE: Record<CreemEnvironment, string> = {
  test: "https://test-api.creem.io",
  live: "https://api.creem.io",
};

function creemEnv(): CreemEnvironment {
  const k = process.env.CREEM_API_KEY ?? "";
  return k.startsWith("creem_test_") ? "test" : "live";
}

export function creemApiKey(): string {
  const k = process.env.CREEM_API_KEY;
  if (!k) throw new Error("CREEM_API_KEY environment variable is required");
  return k;
}

export const CREDIT_PACKS: Record<number, string | undefined> = {
  1000: process.env.CREEM_CREDIT_PACK_10,
  2500: process.env.CREEM_CREDIT_PACK_25,
  6000: process.env.CREEM_CREDIT_PACK_60,
};

export function creditPackName(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function creemHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": creemApiKey(),
  };
}

export async function creemCheckoutUrl(opts: {
  packCents: number;
  email?: string;
  name?: string;
  returnUrl?: string;
}): Promise<string> {
  const productId = CREDIT_PACKS[opts.packCents];
  if (!productId) {
    throw new Error(
      `No Creem product configured for the ${creditPackName(
        opts.packCents
      )} credit pack (set CREEM_CREDIT_PACK_${Math.round(opts.packCents / 100)})`
    );
  }
  const payload: Record<string, unknown> = {
    product_id: productId,
    success_url: opts.returnUrl,
    // Idempotency + reconciliation key carried through to the webhook payload.
    request_id: `pack_${opts.packCents}_${Date.now()}`,
    metadata: { userId: opts.email ?? "", packCents: String(opts.packCents) },
  };
  if (opts.email) {
    payload.customer = { email: opts.email, name: opts.name ?? undefined };
  }
  const res = await fetch(`${CREEM_BASE[creemEnv()]}/v1/checkouts`, {
    method: "POST",
    headers: creemHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Creem checkout failed (${res.status}): ${txt}`);
  }
  const json = (await res.json()) as { checkout_url?: string };
  if (!json.checkout_url) {
    throw new Error("Creem checkout response did not include a checkout_url");
  }
  return json.checkout_url;
}

export async function creemCustomerPortalUrl(opts: {
  customerId: string;
  returnUrl?: string;
}): Promise<string> {
  const payload: Record<string, unknown> = {
    customer_id: opts.customerId,
  };
  if (opts.returnUrl) payload.return_url = opts.returnUrl;
  const res = await fetch(`${CREEM_BASE[creemEnv()]}/v1/customers/billing`, {
    method: "POST",
    headers: creemHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Creem customer portal failed (${res.status}): ${txt}`);
  }
  const json = (await res.json()) as { customer_portal_link?: string };
  if (!json.customer_portal_link)
    throw new Error("Creem portal response did not include a customer_portal_link");
  return json.customer_portal_link;
}
