import { Button, Section, Eyebrow, Badge } from "@/components/ui";
import { ProductPreview } from "@/components/product-preview";
import { SiteNav } from "@/components/site-nav";

const STEPS = [
  {
    n: "01",
    title: "Dial your number",
    body: "The voice assistant greets you and asks which pet you're logging for.",
  },
  {
    n: "02",
    title: "Speak naturally",
    body: "“Buster had a 30-minute walk and seemed energetic” — no forms, no typing.",
  },
  {
    n: "03",
    title: "Logged instantly",
    body: "Your entry appears in the dashboard with the exact words you spoke.",
  },
  {
    n: "04",
    title: "Edit within 24 hours",
    body: "The original logger can correct any note within a day of entry.",
  },
];

const FEATURES = [
  {
    title: "Voice-first logging",
    body: "Call from the road, after a walk, or from the vet. PawVoice captures the moment in spoken words — no app to open, nothing to type.",
    span: "lg:col-span-2",
    big: true,
  },
  {
    title: "Per-pet timelines",
    body: "Every pet gets a clean, chronological activity log anyone on the team can read.",
  },
  {
    title: "Share with sitters",
    body: "Invite co-owners and sitters by email. They see logs the moment you hang up.",
  },
  {
    title: "Pay as you go",
    body: "$0.18 per minute. Credit packs never expire — no subscriptions, no waste.",
    span: "lg:col-span-2",
  },
];

const PACKS = [
  { label: "Small", price: "$10", minutes: 55, note: "Casual logging" },
  { label: "Medium", price: "$25", minutes: 139, note: "Most popular", featured: true },
  { label: "Large", price: "$60", minutes: 333, note: "Busy households" },
];

const FAQ = [
  {
    q: "Do I need to install anything?",
    a: "No. PawVoice is a phone call away. You dial your assigned number, speak, and the entry lands in your dashboard — works from any phone.",
  },
  {
    q: "How much does it cost?",
    a: "Calls are $0.18 per minute. Buy credit packs that never expire, so you only pay for what you use.",
  },
  {
    q: "Can I share logs with a sitter?",
    a: "Yes. Invite co-owners or sitters by email and they get read access to a pet's activity log instantly.",
  },
  {
    q: "Is this veterinary advice?",
    a: "No. PawVoice is a verbatim activity log. It is not a medical diary and does not provide diagnosis or treatment. Contact a vet for health concerns.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      <SiteNav />

      {/* HERO */}
      <section className="aurora">
        <div className="container-x relative grid items-center gap-12 pt-16 pb-20 md:grid-cols-2 md:pt-24 md:pb-28">
          <div className="reveal">
            <Badge tone="accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Voice-first pet activity log
            </Badge>
            <h1 className="font-display text-display font-black tracking-tight text-ink mt-5 text-balance leading-[1.02]">
              Log your pet&apos;s day,{" "}
              <span className="text-accent">just by calling.</span>
            </h1>
            <p className="text-md text-ink-2 mt-5 max-w-lg text-pretty">
              PawVoice turns a quick phone call into a clear, shared activity log
              for pet sitters and owners. No typing. No apps. No forgetting what
              happened on the walk.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/register" variant="primary">
                Get started — it&apos;s free to try
              </Button>
              <Button href="/login" variant="ghost">
                Sign in
              </Button>
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {[
                ["$0.18/min", "per voice call"],
                ["No subscription", "pay for what you use"],
                ["24h", "to edit any entry"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="font-display text-lg font-semibold text-ink">{k}</dt>
                  <dd className="text-xs text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="reveal" style={{ animationDelay: "120ms" }}>
            <ProductPreview />
          </div>
        </div>
      </section>

      <hr className="rule container-x !max-w-6xl" />

      {/* HOW IT WORKS */}
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="font-display text-3xl font-semibold text-ink mt-3 text-balance">
            Four steps. One phone call.
          </h2>
        </div>
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="card p-6">
              <span className="font-mono text-xs text-accent">{s.n}</span>
              <h3 className="font-display text-lg font-semibold text-ink mt-2">
                {s.title}
              </h3>
              <p className="text-sm text-ink-2 mt-2 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* FEATURES (bento) */}
      <Section className="bg-paper-2 !rounded-[2rem] my-4">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <Eyebrow>Built for real life</Eyebrow>
          <h2 className="font-display text-3xl font-semibold text-ink mt-3 text-balance">
            A log that keeps up with you
          </h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`card-raise p-7 ${f.span ?? ""} ${
                f.big ? "flex flex-col justify-between" : ""
              }`}
            >
              <div>
                <h3 className="font-display text-xl font-semibold text-ink">
                  {f.title}
                </h3>
                <p className="text-sm text-ink-2 mt-2 leading-relaxed max-w-prose">
                  {f.body}
                </p>
              </div>
              {f.big && (
                <div className="mt-6 flex items-center gap-2 rounded-xl bg-paper px-4 py-3 border border-rule">
                  <span className="text-xl" aria-hidden>📞</span>
                  <p className="text-xs text-ink-2">
                    “Whiskers took her medication and ate well” — logged in 12 seconds.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* PRICING */}
      <Section id="pricing">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Simple pricing</Eyebrow>
          <h2 className="font-display text-3xl font-semibold text-ink mt-3 text-balance">
            Pay for minutes, not seats
          </h2>
          <p className="text-sm text-muted mt-3">
            Credit packs never expire. One price for everyone on your team.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-3">
          {PACKS.map((p) => (
            <div
              key={p.label}
              className={`card p-7 flex flex-col ${
                p.featured
                  ? "ring-2 ring-accent shadow-glow relative"
                  : ""
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-paper">
                  Most popular
                </span>
              )}
              <p className="font-display text-lg font-semibold text-ink">{p.label}</p>
              <p className="mt-3 font-display text-4xl font-black text-ink">
                {p.price}
              </p>
              <p className="text-sm text-ink-2 mt-1">≈ {p.minutes} minutes</p>
              <Button
                href="/register"
                variant={p.featured ? "primary" : "ghost"}
                className="mt-6 w-full"
              >
                Buy {p.label}
              </Button>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section className="bg-paper-2 !rounded-[2rem] my-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-semibold text-ink text-center text-balance">
            Questions, answered
          </h2>
          <div className="mt-10 divide-y divide-rule border-y border-rule">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-ink">
                  <span className="font-medium">{item.q}</span>
                  <span className="text-accent transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="text-sm text-ink-2 mt-3 leading-relaxed max-w-prose">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section>
        <div className="card-raise relative overflow-hidden bg-ink text-paper px-8 py-14 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(30rem 18rem at 50% -20%, oklch(56% 0.17 33 / 0.5), transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold text-paper text-balance">
              Start logging in the next call.
            </h2>
            <p className="text-md text-paper/70 mt-3 max-w-md mx-auto text-pretty">
              Create an account, add your first pet, and speak your first entry.
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                href="/register"
                variant="primary"
                className="!bg-paper !text-ink hover:!bg-accent-soft hover:!text-accent"
              >
                Get started free
              </Button>
            </div>
          </div>
        </div>
      </Section>

    </div>
  );
}
