"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/navigation";
import CreatePet from "@/components/create-pet";
import BuyCredits from "@/components/buy-minutes";
import MedicalDisclaimer from "@/components/medical-disclaimer";

export default function Dashboard() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const me = useQuery(api.users.me);
  const pets = useQuery(api.pets.list);
  const ensureRow = useMutation(api.users.ensureRow);
  const registerPhone = useMutation(api.users.registerPhone);
  const router = useRouter();

  const [phoneInput, setPhoneInput] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus?.status === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus?.status === "authenticated" && authStatus.emailVerified) {
      void ensureRow({});
    }
  }, [authStatus, ensureRow]);

  if (authStatus === undefined || authStatus?.status === "unauthenticated") {
    return null;
  }

  if (authStatus.status === "authenticated" && !authStatus.emailVerified) {
    router.push("/verify-email");
    return null;
  }

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const loading = me === undefined || pets === undefined;
  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ink-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </div>
    );
  }

  const user = me;
  const hasPhone = user?.phone;
  const credits = user?.credits ?? 0;
  const creditsDollars = (credits / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      <Navigation />
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="flex justify-between items-baseline mb-12">
          <h1 className="font-display text-3xl font-black tracking-tight">
            Dashboard
          </h1>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-muted hover:text-ink transition-colors"
          >
            Refresh
          </button>
        </div>

        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Account
          </h2>
          <div className="border border-rule rounded-lg p-5">
            <p className="text-sm text-ink-2">
              Email: <span className="text-ink">{user?.email}</span>
            </p>
            <p className="text-sm text-ink-2 mt-1">
              Balance:{" "}
              <strong className="text-ink font-medium tabular-nums">${creditsDollars}</strong>
            </p>
            <p className="text-sm text-ink-2 mt-1">
              Phone:{" "}
              {hasPhone ? (
                <span className="text-ink font-medium">{user.phone}</span>
              ) : (
                <span className="text-muted">Not registered</span>
              )}
            </p>
          </div>

          {!hasPhone && (
            <form onSubmit={handlePhoneRegister} className="mt-4 flex gap-2 items-end">
              <div>
                <label className="block text-xs text-muted mb-1">
                  Phone number (E.164)
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+15551234567"
                  className="px-3 py-2 border border-rule rounded text-sm bg-paper-2 text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus"
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
        </section>

        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Your pets
          </h2>
          {pets && pets.length === 0 ? (
            <p className="text-ink-2 text-sm">
              You haven&apos;t added any pets yet. Add one below to get started.
            </p>
          ) : null}
          {pets && pets.length > 0 && (
            <ul className="space-y-3 mb-6">
              {pets.map((pet) => (
                <li
                  key={pet._id}
                  className="border border-rule rounded-lg p-4 hover:bg-paper-2 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display font-semibold text-ink">{pet.name}</h3>
                      <p className="text-sm text-ink-2">
                        {pet.species}
                        {pet.breed ? `, ${pet.breed}` : ""}
                        {pet.age ? `, ${pet.age} years` : ""}
                      </p>
                      {pet.notes && (
                        <p className="text-xs text-muted mt-1">{pet.notes}</p>
                      )}
                    </div>
                    <Link
                      href={`/pets/${pet._id}`}
                      className="text-sm text-accent hover:text-ink transition-colors"
                    >
                      View logs →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <CreatePet />
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            Buy credits
          </h2>
          <BuyCredits />
        </section>

        <div className="mt-12">
          <MedicalDisclaimer />
        </div>
      </main>
    </div>
  );
}
