"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";

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
    <div className="min-h-screen bg-paper text-ink font-body">
      <SiteNav />
      <main className="max-w-md mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 bg-ink/5 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">✉️</span>
        </div>
        <h1 className="font-display text-2xl font-black text-ink mb-3">
          You&apos;ve been invited
        </h1>
        <p className="text-ink-2 mb-6">
          An owner has invited you to view or co-manage a pet on PawVoice.
          Accepting will add you as a member of this pet and give you access to
          its activity logs.
        </p>
        <p className="text-xs text-muted break-all mb-6">
          Invite token: {token}
        </p>
        {error && (
          <p className="text-sm text-muted mb-4">{error}</p>
        )}
        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full px-6 py-3 bg-accent text-paper rounded-full font-medium hover:bg-ink hover:text-paper transition-colors disabled:opacity-60"
        >
          {loading ? "Accepting…" : "Accept invitation"}
        </button>
        <p className="text-xs text-muted mt-6">
          Signed in as {authStatus.email}
        </p>
      </main>
    </div>
  );
}
