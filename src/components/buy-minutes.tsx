"use client";
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

const CREDIT_PACKS = [
  { cents: 1000, label: "$10", minutes: 55 },
  { cents: 2500, label: "$25", minutes: 139 },
  { cents: 6000, label: "$60", minutes: 333 },
];

export default function BuyCredits() {
  const createCreditPack = useAction(api.payments.createCreditPack);
  const [loading, setLoading] = useState<number | null>(null);

  const handlePurchase = async (cents: number) => {
    setLoading(cents);
    try {
      const result = await createCreditPack({ packCents: cents });
      if (result?.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        alert("Could not start checkout. Please try again.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="border border-rule rounded-lg p-5 bg-paper-2">
      <h3 className="font-display text-lg font-semibold text-ink mb-2">
        Buy credits
      </h3>
      <p className="text-sm text-ink-2 mb-4">
        $0.18 per minute. Packs never expire.
      </p>
      <div className="space-y-2">
        {CREDIT_PACKS.map((pack) => (
          <button
            key={pack.cents}
            onClick={() => handlePurchase(pack.cents)}
            disabled={loading !== null}
            className="w-full py-2.5 px-4 rounded text-left font-medium transition
              bg-paper hover:bg-rule
              border border-rule
              text-ink disabled:opacity-60"
          >
            {loading === pack.cents ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border border-ink-2 border-t-transparent rounded-full animate-spin" />
                Redirecting…
              </span>
            ) : (
              `${pack.label} (${pack.minutes} min)`
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
