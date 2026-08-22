# PawVoice

Voice-first pet activity logging. Call (in the browser) and speak naturally — an
AI assistant turns the conversation into structured, per-pet activity logs. Pet
sitters and owners share logs via email invites. Usage is prepaid and
pay-as-you-go.

> **Launch state:** web (browser) calling only. Inbound phone calls are disabled
> at launch (`PHONE_CALLING_ENABLED` is unset). Phone-number verification is
> deferred to a follow-up (see issue) — until then, caller-ID → account mapping
> is intentionally not trusted.

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **Convex** — backend: functions, schema, realtime, scheduling
- **Vapi** — voice calls (web SDK today; phone wiring present but off)
- **Creem** — payments (credit packs + `checkout.completed` webhook)
- **Better Auth** (`@convex-dev/better-auth`) — accounts + email verification
- **Resend** — transactional email (invites, low-balance, alerts)

## How it works

- **Web call flow:** client calls `webCall.prepare` (verifies email, pets,
  balance) → opens the Vapi web SDK → the assistant logs activities via the
  `logActivity` / `undoLastEntry` tool calls → the `end-of-call-report` bills
  the call.
- **Billing:** metered per minute against a credit balance, with an overdraft
  buffer, a max call duration, and a low-balance top-up email. Rates and
  thresholds are configured in `convex/billing.ts` (`CENTS_PER_MIN`,
  `BUFFER_CENTS`, `MAX_CALL_SECONDS`) — set your own there.
- **One active call per user** is enforced server-side (the `webCall.begin`
  mutation + the inbound `assistant-request` guard) to cap runaway cost.
- **Payments:** a Creem checkout returns to `payments.createCreditPack`; the
  `checkout.completed` webhook (`/creem-webhook`) credits the user by email.
  Credit units and pack pricing are configured via the `CREEM_*` env vars and
  `convex/billing.ts`.

## Environment

All server secrets live in **Convex env** (set via `npx convex env set …`);
client/public vars live in **Vercel**. See `.env.example` for the full list and
per-variable notes. Highlights:

- `VAPI_*` — Vapi keys, assistant id, phone number id, webhook secret
- `CREEM_*` — Creem API key (live `creem_…` prefix), webhook secret, and
  product ids for your credit packs
- `RESEND_*` — Resend API key + verified from-address (`ALERT_EMAIL` optional)
- `BETTER_AUTH_SECRET`, `SITE_URL` / `NEXT_PUBLIC_SITE_URL`

Webhook endpoints to register in the respective dashboards:

- Vapi: `https://<your-deployment>.convex.site/vapi/webhook`
- Creem: `https://<your-deployment>.convex.site/creem-webhook`

## Develop

```bash
pnpm install
npx convex dev          # starts Convex + watches functions
pnpm dev               # starts the Next.js app (Turbopack)
```

(Re)configure the Vapi assistant (model, tools, `maxDurationSeconds`) with:

```bash
npx convex run vapiSetup:setupAssistant
```

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Next.js dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Type-check the Next.js app |
| `pnpm typecheck:convex` | Type-check Convex functions |

CI (`.github/workflows/ci.yml`) runs lint + both typechecks on push/PR.

## Deploy

- **Next.js app:** Vercel (wire the `NEXT_PUBLIC_*` vars from `.env.example`).
- **Convex functions:** `npx convex deploy`.
- **Vapi assistant:** `npx convex run vapiSetup:setupAssistant`.

## Operational notes

- **Creem webhook secret** must match what's registered in the Creem dashboard,
  or `checkout.completed` events fail signature verification and credits are not
  applied (an admin alert is sent on failure).
- If your privacy policy claims calls aren't retained, enable **Vapi Zero Data
  Retention** in the Vapi dashboard.
- Inbound **phone calling** is gated by `PHONE_CALLING_ENABLED`; enable it only
  after phone-number verification is implemented.

## Project structure

- `convex/` — backend functions, schema, Vapi/Creem webhooks, billing, auth
- `src/app/` — Next.js routes (call, dashboard, pets, settings, auth, legal)
- `src/components/` — UI (buy-minutes, create-pet, invite acceptance, etc.)
- `content/` — privacy policy + terms of use markdown
