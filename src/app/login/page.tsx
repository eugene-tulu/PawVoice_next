// src/app/login/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [unverified, setUnverified] = useState(false);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setUnverified(false);
    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    });
    if (error) {
      if (
        error.code === "EMAIL_NOT_VERIFIED" ||
        /not verified/i.test(error.message ?? "")
      ) {
        setUnverified(true);
      } else {
        setMsg(error.message ?? "Failed to sign in");
      }
    } else {
      router.push("/dashboard");
    }
  };

  const handleResend = async () => {
    setSending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/dashboard",
      });
      if (!error) {
        setMsg("Verification email resent — check your inbox, then sign in.");
      } else {
        setMsg(error.message ?? "Failed to resend. Please try again.");
      }
    } catch {
      setMsg("Network error. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-paper-2 border border-rule rounded-xl p-8 shadow-md"
      >
        <h1 className="font-display text-2xl font-black text-ink text-center mb-6">
          PawVoice
        </h1>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 border border-rule rounded text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus mb-3"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 8)"
          className="w-full px-3 py-2 border border-rule rounded text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus mb-3"
          required
        />

        <button
          type="submit"
          className="w-full px-4 py-2.5 bg-accent text-paper rounded font-medium hover:bg-ink transition-colors mt-2"
        >
          Sign in
        </button>

        {unverified ? (
          <div className="mt-4 text-center">
            <p className="text-sm text-accent mb-3">
              Your email isn&apos;t verified yet. Check your inbox for the
              verification link.
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={sending}
              className="w-full px-4 py-2.5 bg-accent text-paper rounded font-medium hover:bg-ink transition-colors disabled:opacity-60 mb-2"
            >
              {sending ? "Sending…" : "Resend verification email"}
            </button>
            {msg && <p className="text-sm text-muted">{msg}</p>}
          </div>
        ) : (
          msg && (
            <p
              className="text-center text-sm mt-4"
              style={{ color: "var(--color-accent)" }}
            >
              {msg}
            </p>
          )
        )}

        <div className="flex justify-between items-center mt-4 text-sm">
          <Link
            href="/forgot-password"
            className="text-ink font-medium hover:text-accent transition-colors"
          >
            Forgot password?
          </Link>
          <span className="text-muted">
            No account?{" "}
            <Link
              href="/register"
              className="text-ink font-medium hover:text-accent transition-colors"
            >
              Sign up
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
}
