"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/components/navigation";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const authStatus = useQuery(api.auth.getAuthStatus);
  const acceptInvite = useMutation(api.invites.accept);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await acceptInvite({ token });
      router.push(`/pets/${result.petId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark">
      <Navigation />
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">✉️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
          You&apos;ve been invited
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          An owner has invited you to view or co-manage a pet on PawVoice.
          Accepting will add you as a member of this pet and give you access to
          its activity logs.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 break-all">
          Invite token: {token}
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full px-6 py-3 bg-paw text-white rounded-full font-semibold hover:bg-paw-dark disabled:opacity-60 transition mb-4"
        >
          {loading ? "Accepting…" : "Accept invitation"}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Signed in as {authStatus.email}
        </p>
      </main>
    </div>
  );
}
