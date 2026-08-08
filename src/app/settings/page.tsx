"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/components/navigation";
import BuyCredits from "@/components/buy-minutes";

export default function Settings() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const me = useQuery(api.users.me);
  const usage = useQuery(api.usageEvents.listUsage, {});
  const registerPhone = useMutation(api.users.registerPhone);
  const openBillingPortal = useAction(api.payments.billingPortal);
  const router = useRouter();
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (authStatus?.status === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  if (authStatus === undefined || authStatus?.status === "unauthenticated") {
    return null;
  }

  if (authStatus.status === "authenticated" && !authStatus.emailVerified) {
    router.push("/verify-email");
    return null;
  }

  if (me === undefined || usage === undefined) {
    return (
      <div className="min-h-screen bg-cream dark:bg-cream-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return;
    setPhoneLoading(true);
    setPhoneError(null);
    try {
      await registerPhone({ phone: phoneInput });
      window.location.reload();
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Failed to register phone");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const result = await openBillingPortal({});
      if (result?.portal_url) {
        window.location.href = result.portal_url;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const formatCost = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-10">
          Settings
        </h1>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Phone number
          </h2>
          <div className="border border-amber-100 dark:border-amber-900/30 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Registered:{" "}
              <strong className="text-gray-800 dark:text-white">
                {me?.phone ?? "Not registered"}
              </strong>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your phone number is required to receive calls on Vapi. It is
              matched against caller ID when you call your assigned number.
            </p>
            {!me?.phone && (
              <form onSubmit={handlePhoneRegister} className="mt-4 flex gap-2 items-end">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Phone number (E.164, e.g. +15551234567)
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+15551234567"
                    className="px-3 py-2 border border-amber-200 dark:border-amber-900/30 rounded text-sm bg-amber-50/30 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={phoneLoading}
                  className="px-4 py-2 bg-paw text-white rounded text-sm font-semibold hover:bg-paw-dark disabled:opacity-60"
                >
                  {phoneLoading ? "Saving…" : "Register"}
                </button>
                {phoneError && <p className="text-xs text-red-600 ml-2">{phoneError}</p>}
              </form>
            )}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Credits
          </h2>
          <div className="border border-amber-100 dark:border-amber-900/30 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Current balance:{" "}
              <strong className="text-amber-700 dark:text-amber-400">
                {formatCost(me?.credits ?? 0)}
              </strong>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              $0.18 per minute of voice call. Credits never expire.
            </p>
            <button
              onClick={handlePortal}
              disabled={portalLoading || !me?.dodoCustomerId}
              className="mt-3 px-4 py-2 border border-amber-200 dark:border-amber-900/30 rounded text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {portalLoading ? "Opening…" : "Billing portal"}
            </button>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Buy credits
          </h2>
          <BuyCredits />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Usage history
          </h2>
          {usage.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              No usage recorded yet. Make your first voice call to see it here.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-2 text-gray-800 dark:text-white">Date</th>
                  <th className="pb-2 text-gray-800 dark:text-white">Duration</th>
                  <th className="pb-2 text-gray-800 dark:text-white">Cost</th>
                  <th className="pb-2 text-gray-800 dark:text-white">Activities</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u) => (
                  <tr
                    key={u._id}
                    className="border-t border-amber-100 dark:border-amber-900/30"
                  >
                    <td className="py-2 text-gray-600 dark:text-gray-300">
                      {formatDate(u.recordedAt)}
                    </td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">
                      {Math.round(u.durationSec / 60)}m
                    </td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">
                      {formatCost(u.costCents)}
                    </td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">
                      {u.activityCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
