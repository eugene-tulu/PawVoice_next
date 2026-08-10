// src/app/register/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [created, setCreated] = useState(false);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0],
      callbackURL: "/dashboard",
    });
    if (error) {
      setMsg(error.message ?? "Failed to create account");
    } else {
      // Email verification is required, so the user is NOT auto-signed-in.
      // Show a verification-pending state instead of a dead "redirecting" message.
      setCreated(true);
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
        setMsg("Verification email resent — check your inbox.");
      } else {
        setMsg(error.message ?? "Failed to resend. Please try again.");
      }
    } catch {
      setMsg("Network error. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-4">
        <div className="w-full max-w-sm bg-paper-2 border border-rule rounded-xl p-8 shadow-md text-center">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">✉️</span>
          </div>
          <h1 className="font-display text-2xl font-black text-ink mb-2">
            Verify your email
          </h1>
          <p className="text-ink-2 text-sm mb-1">
            We sent a verification link to{" "}
            <span className="font-mono bg-muted/5 px-2 py-1 rounded">
              {email}
            </span>
          </p>
          <p className="text-muted text-sm mb-6">
            Check your inbox (and spam folder), then sign in.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="w-full px-4 py-2.5 bg-accent text-paper rounded font-medium hover:bg-ink transition-colors disabled:opacity-60 mb-3"
          >
            {sending ? "Sending…" : "Resend verification email"}
          </button>
          {msg && <p className="text-sm text-muted mb-3">{msg}</p>}
          <Link
            href="/login"
            className="text-ink font-medium hover:text-accent transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

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
          Create account
        </button>

        {msg && (
          <p
            className="text-center text-sm mt-4"
            style={{ color: "var(--color-accent)" }}
          >
            {msg}
          </p>
        )}

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-ink font-medium hover:text-accent transition-colors"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
