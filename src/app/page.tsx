import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-paw mb-4">
            PawVoice
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl">
            A voice-first activity logger. Call from the road, after a walk, or
            from the vet — tell PawVoice what happened and it logs it for you.
            No typing, no apps, no forgetting.
          </p>
        </header>

        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">How it works</h2>
          <ol className="space-y-4 text-gray-700 dark:text-gray-300">
            <li className="flex gap-3">
              <span className="text-paw font-bold">1</span>
              <span>
                <strong>Dial your Vapi number.</strong> The voice assistant greets
                you and asks which pet you&apos;re logging for.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-paw font-bold">2</span>
              <span>
                <strong>Speak naturally.</strong> Say things like &quot;Buster had a
                30 minute walk and seemed energetic&quot; or &quot;Whiskers took her
                medication.&quot;
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-paw font-bold">3</span>
              <span>
                <strong>Activity is logged instantly.</strong> Your entry appears
                in the dashboard with the exact words you spoke.
              </span>
            </li>
          </ol>
        </div>

        <div className="border-t border-amber-100 dark:border-amber-900/30 pt-8 mb-16">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Pricing</h2>
            <p className="text-gray-700 dark:text-gray-300 max-w-2xl">
              Pay as you go. Calls cost <strong>$0.18 per minute</strong>. Buy
              credit packs that never expire:
            </p>
            <table className="text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-2 text-gray-800 dark:text-white">Pack</th>
                  <th className="pb-2 text-gray-800 dark:text-white">Approx. minutes</th>
                  <th className="pb-2 text-gray-800 dark:text-white">Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-amber-100 dark:border-amber-900/30">
                  <td className="py-2">Small</td>
                  <td className="py-2">55 min</td>
                  <td className="py-2">$10</td>
                </tr>
                <tr className="border-t border-amber-100 dark:border-amber-900/30">
                  <td className="py-2">Medium</td>
                  <td className="py-2">139 min</td>
                  <td className="py-2">$25</td>
                </tr>
                <tr className="border-t border-amber-100 dark:border-amber-900/30">
                  <td className="py-2">Large</td>
                  <td className="py-2">333 min</td>
                  <td className="py-2">$60</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-4">
          <Link
            href="/register"
            className="px-6 py-3 bg-paw text-white rounded-full font-semibold hover:bg-paw-dark transition"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 text-paw font-semibold hover:text-paw-dark transition"
          >
            Sign in
          </Link>
        </div>

        <p className="mt-12 text-xs text-gray-500">
          Built with Convex + Better Auth + Vapi. Calls are $0.18/min. Credit
          packs never expire.
        </p>
      </div>
    </div>
  );
}
