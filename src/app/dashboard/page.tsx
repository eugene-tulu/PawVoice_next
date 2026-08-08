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
      <div className="min-h-screen bg-cream dark:bg-cream-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  const user = me;
  const hasPhone = user?.phone;
  const credits = user?.credits ?? 0;
  const creditsDollars = (credits / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-start mb-10">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Dashboard
          </h1>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-gray-500 dark:text-gray-500 hover:text-amber-700 dark:hover:text-amber-400"
          >
            Refresh
          </button>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Account
          </h2>
          <div className="border border-amber-100 dark:border-amber-900/30 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Email: {user?.email}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Balance: <strong className="text-amber-700 dark:text-amber-400">${creditsDollars}</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Phone: {hasPhone ? user.phone : <span className="text-red-600">Not registered</span>}
            </p>
          </div>

          {!hasPhone && (
            <form onSubmit={handlePhoneRegister} className="mt-4 flex gap-2 items-end">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Phone number (E.164)
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+15551234567"
                  className="px-3 py-2 border border-amber-200 dark:border-amber-900/30 rounded text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
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
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Your pets
          </h2>
          {pets && pets.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              You haven&apos;t added any pets yet. Add one below to get started.
            </p>
          ) : null}
          {pets && pets.length > 0 && (
            <ul className="space-y-3 mb-6">
              {pets.map((pet) => (
                <li
                  key={pet._id}
                  className="border border-amber-100 dark:border-amber-900/30 rounded-lg p-4 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">{pet.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {pet.species}
                        {pet.breed ? `, ${pet.breed}` : ""}
                        {pet.age ? `, ${pet.age} years` : ""}
                      </p>
                      {pet.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{pet.notes}</p>
                      )}
                    </div>
                    <Link
                      href={`/pets/${pet._id}`}
                      className="text-sm text-amber-700 dark:text-amber-400 hover:underline"
                    >
                      View logs
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <CreatePet />
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Buy credits
          </h2>
          <BuyCredits />
        </section>

        <MedicalDisclaimer />
      </main>
    </div>
  );
}
