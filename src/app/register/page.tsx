// src/app/register/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { AuthShell, AuthNotice } from "@/components/auth-shell";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [created, setCreated] = useState(false);
  const [sending, setSending] = useState(false);

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
      <AuthShell
        title="Verify your email"
        subtitle="We just sent you a verification link."
        footer={
          <>
            Already verified?{" "}
            <Link
              href="/login"
              className="text-ink font-medium hover:text-accent transition-colors"
            >
              Sign in
            </Link>
          </>
        }
      >
        <p className="text-center text-ink-2 text-sm mb-1">
          Check{" "}
          <span className="font-mono bg-muted/5 px-2 py-1 rounded">{email}</span>{" "}
          (and your spam folder) for the link, then sign in.
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="w-full px-4 py-2.5 mt-4 bg-accent text-paper rounded-lg font-medium hover:bg-ink transition-colors disabled:opacity-60"
        >
          {sending ? "Sending…" : "Resend verification email"}
        </button>
        {msg && <AuthNotice tone="info">{msg}</AuthNotice>}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Start logging your pet's day with voice."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-ink font-medium hover:text-accent transition-colors"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 border border-rule rounded-lg text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 8)"
          className="w-full px-3 py-2 border border-rule rounded-lg text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus"
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-2.5 mt-2 bg-accent text-paper rounded-lg font-medium hover:bg-ink transition-colors"
        >
          Create account
        </button>
      </form>
      {msg && <AuthNotice tone="error">{msg}</AuthNotice>}
    </AuthShell>
  );
}
