"use client";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { useToast } from "@/components/toast";
import BuyCredits from "@/components/buy-minutes";
import { authClient } from "@/lib/auth-client";

export default function Settings() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const me = useQuery(api.users.me);
  const usage = useQuery(api.usageEvents.listUsage, {});
  const registerPhone = useMutation(api.users.registerPhone);
  const openBillingPortal = useAction(api.payments.billingPortal);
  const deleteAccountData = useMutation(api.account.deleteAccount);
  const router = useRouter();
  const toast = useToast();
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ink-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted">Loading…</p>
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
      setPhoneInput("");
      toast("Phone number registered", "success");
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
      toast(
        err instanceof Error ? err.message : "Could not open billing portal",
        "error"
      );
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      // 1) Wipe all app data while still authenticated.
      await deleteAccountData({});
      // 2) Remove the Better Auth identity (session still valid here).
      await authClient.deleteUser();
      router.push("/");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete account"
      );
      setDeleting(false);
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
    <div className="min-h-screen bg-paper text-ink font-body">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-3xl font-black tracking-tight text-ink mb-10">
          Settings
        </h1>

        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Phone number
          </h2>
          <div className="border border-rule rounded-lg p-5">
            <p className="text-sm text-ink-2">
              Registered:{" "}
              <strong className="text-ink">{me?.phone ?? "Not registered"}</strong>
            </p>
            <p className="text-xs text-muted mt-1">
              Your phone number is required to receive calls on Vapi. It is
              matched against caller ID when you call your assigned number.
            </p>
            {!me?.phone && (
              <form onSubmit={handlePhoneRegister} className="mt-4 flex gap-2 items-end">
                <div>
                  <label className="block text-xs text-muted mb-1">
                    Phone number (E.164, e.g. +15551234567)
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+15551234567"
                    className="px-3 py-2 border border-rule rounded text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={phoneLoading}
                  className="btn btn-primary !rounded-lg"
                >
                  {phoneLoading ? "Saving…" : "Register"}
                </button>
                {phoneError && (
                  <p className="text-xs text-muted ml-2">{phoneError}</p>
                )}
              </form>
            )}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Credits
          </h2>
          <div className="border border-rule rounded-lg p-5">
            <p className="text-sm text-ink-2">
              Current balance:{" "}
              <strong className="text-ink font-medium tabular-nums">
                {me?.credits ? formatCost(me.credits) : "$0.00"}
              </strong>
            </p>
            <p className="text-xs text-muted mt-1">
              $0.18 per minute of voice call. Credits never expire.
            </p>
            <button
              onClick={handlePortal}
              disabled={portalLoading || !me?.dodoCustomerId}
              className="btn btn-ghost !rounded-lg"
            >
              {portalLoading ? "Opening…" : "Billing portal"}
            </button>
            {!me?.dodoCustomerId && (
              <p className="text-xs text-muted mt-2">
                Buy credits first to open your billing portal.
              </p>
            )}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Buy credits
          </h2>
          <BuyCredits />
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Usage history
          </h2>
          {usage.length === 0 ? (
            <p className="text-ink-2 text-sm">
              No usage recorded yet. Make your first voice call to see it here.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-2 text-ink">Date</th>
                  <th className="pb-2 text-ink">Duration</th>
                  <th className="pb-2 text-ink">Cost</th>
                  <th className="pb-2 text-ink">Activities</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u) => (
                  <tr
                    key={u._id}
                    className="border-t border-rule-2"
                  >
                    <td className="py-2 text-ink-2">{formatDate(u.recordedAt)}</td>
                    <td className="py-2 text-ink-2">{Math.round(u.durationSec / 60)}m</td>
                    <td className="py-2 text-ink-2 tabular-nums">{formatCost(u.costCents)}</td>
                    <td className="py-2 text-ink-2">{u.activityCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="mb-4">
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Delete account
          </h2>
          <div className="border border-rule rounded-lg p-5">
            <p className="text-sm text-ink-2">
              Permanently delete your account and all associated data — your
              profile, pets you own, activity logs, call history, and payment
              records. This cannot be undone.
            </p>
            <button
              onClick={() => {
                setConfirmText("");
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              className="mt-3 px-4 py-2 border border-red-500 text-red-600 rounded text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Delete my account
            </button>
          </div>
        </section>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-paper border border-rule rounded-lg p-6 max-w-md w-full">
            <h3 className="font-display text-lg font-semibold text-ink mb-2">
              Delete your account?
            </h3>
            <p className="text-sm text-ink-2 mb-4">
              This permanently erases your account, pets you own, activity logs,
              call history, and payment records. It cannot be undone. Type{" "}
              <strong className="text-ink">DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="field mb-3"
            />
            {deleteError && (
              <p className="text-xs text-red-600 mb-3">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 border border-rule rounded text-sm font-medium text-ink hover:bg-paper-2 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || confirmText !== "DELETE"}
                className="px-4 py-2 bg-red-600 text-paper rounded text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
