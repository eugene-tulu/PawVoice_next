import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      <header className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        <h1 className="font-display text-display font-black tracking-tight text-ink mb-6 leading-tight">
          PawVoice
        </h1>
        <p className="text-lg text-ink-2 max-w-xl">
          A voice-first activity logger for pet sitters and owners. Call from the
          road, after a walk, or from the vet — tell PawVoice what happened and
          it records the entry for everyone to see.
        </p>
        <p className="text-sm text-muted mt-4">
          No typing. No apps. No forgetting.
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="font-display text-3xl font-semibold text-ink mb-6">
          How it works
        </h2>

        <ol className="space-y-6">
          <li>
            <strong className="text-ink">1. Dial your assigned number.</strong>
            <p className="text-ink-2 mt-1">
              The voice assistant greets you and asks which pet you&apos;re
              logging for.
            </p>
          </li>
          <li>
            <strong className="text-ink">2. Speak naturally.</strong>
            <p className="text-ink-2 mt-1">
              Say things like &ldquo;Buster had a 30 minute walk and seemed
              energetic&rdquo; or &ldquo;Whiskers took her medication.&rdquo;
            </p>
          </li>
          <li>
            <strong className="text-ink">3. Logged instantly.</strong>
            <p className="text-ink-2 mt-1">
              Your entry appears in the dashboard with the exact words you
              spoke, attributed to the right pet.
            </p>
          </li>
          <li>
            <strong className="text-ink">4. Edit within 24 hours.</strong>
            <p className="text-ink-2 mt-1">
              Mistakes happen — the original logger can correct notes within a
              day of entry.
            </p>
          </li>
        </ol>

        <hr className="my-12 border-rule" />

        <section className="mb-12">
          <h3 className="font-display text-3xl font-semibold text-ink mb-4">
            Pricing
          </h3>
          <p className="text-ink-2 mb-6">
            Pay as you go. Calls cost <strong className="text-ink">$0.18 per minute</strong>. Credit
            packs never expire:
          </p>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="pb-3 text-xs font-medium text-muted uppercase tracking-wider">Pack</th>
                <th className="pb-3 text-xs font-medium text-muted uppercase tracking-wider">Approx. minutes</th>
                <th className="pb-3 text-xs font-medium text-muted uppercase tracking-wider text-right">Price</th>
              </tr>
            </thead>
            <tbody className="border-t border-rule-2">
              <tr className="border-t border-rule-2">
                <td className="py-3 font-medium">Small</td>
                <td className="py-3 text-ink-2">55 min</td>
                <td className="py-3 text-right">— $10</td>
              </tr>
              <tr className="border-t border-rule-2">
                <td className="py-3 font-medium">Medium</td>
                <td className="py-3 text-ink-2">139 min</td>
                <td className="py-3 text-right">— $25</td>
              </tr>
              <tr className="border-t border-rule-2">
                <td className="py-3 font-medium">Large</td>
                <td className="py-3 text-ink-2">333 min</td>
                <td className="py-3 text-right">— $60</td>
              </tr>
            </tbody>
          </table>
        </section>

        <div className="flex gap-6">
          <Link
            href="/register"
            className="inline-block px-6 py-2.5 bg-accent text-paper font-medium rounded-full hover:bg-ink transition-colors duration-150"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 text-ink font-medium hover:text-accent transition-colors duration-150"
          >
            Sign in
          </Link>
        </div>

        <p className="mt-12 text-xs text-muted">
          Built with Convex + Better Auth + Vapi. Calls are $0.18/min. Credit
          packs never expire.
        </p>
      </main>

      <footer className="max-w-2xl mx-auto px-6 pb-12">
        <p className="text-sm text-muted">
          PawVoice records activities as spoken. It is an activity log, not
          medical advice. Contact a veterinarian for health concerns.
        </p>
      </footer>
    </div>
  );
}
