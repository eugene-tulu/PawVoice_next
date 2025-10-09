// src/components/buy-minutes.tsx
"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function BuyMinutes() {
  const [loading, setLoading] = useState(false);
  const addMinutes = useMutation(api.users.addMinutesFromPayment);

  const packages = [
    { minutes: 10, cents: 600, display: "$6.00" },
    { minutes: 25, cents: 1500, display: "$15.00" },
    { minutes: 50, cents: 3000, display: "$30.00" },
  ];

  const handlePurchase = async (cents: number) => {
    setLoading(true);
    try {
      const dodo = (window as any).Dodo;
      if (!dodo) {
        alert("Payment system not ready. Please refresh.");
        return;
      }

      const result = await dodo.pay({
        amount: cents,
        currency: "usd",
        description: "PawVoice dog training minutes",
      });

      if (result.status === "succeeded") {
        await addMinutes({ cents });
        alert("✅ Minutes added! Happy training!");
      }
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-4 bg-white rounded-xl border border-amber-100 max-w-md">
      <h3 className="font-bold text-lg mb-3" style={{ color: '#e97451' }}>
        Top Up Training Time ($0.60/min)
      </h3>
      <div className="space-y-3">
        {packages.map((pkg) => (
          <button
            key={pkg.cents}
            onClick={() => handlePurchase(pkg.cents)}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg font-medium transition
              bg-gradient-to-r from-amber-50 to-orange-50 
              hover:from-amber-100 hover:to-orange-100
              border border-amber-200
              text-amber-800 hover:text-amber-900"
          >
            {loading ? "Processing..." : `${pkg.minutes} min — ${pkg.display}`}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500 text-center">
        Minutes never expire. Cancel anytime.
      </p>
    </div>
  );
}