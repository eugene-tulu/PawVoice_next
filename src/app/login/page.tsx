// src/app/login/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthShell, AuthNotice } from "@/components/auth-shell";

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

  if (unverified) {
    return (
      <AuthShell
        title="Verify your email"
        subtitle="Your account exists but its email isn't verified yet."
        footer={
          <>
            Different account?{" "}
            <Link
              href="/register"
              className="text-ink font-medium hover:text-accent transition-colors"
            >
              Sign up
            </Link>
          </>
        }
      >
        <p className="text-center text-ink-2 text-sm mb-4">
          Check your inbox for the verification link, then sign in below.
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="w-full px-4 py-2.5 bg-accent text-paper rounded-lg font-medium hover:bg-ink hover:text-paper transition-colors disabled:opacity-60"
        >
          {sending ? "Sending…" : "Resend verification email"}
        </button>
        {msg && <AuthNotice tone="info">{msg}</AuthNotice>}
        <Link
          href="/login"
          className="block text-center text-sm text-ink font-medium hover:text-accent transition-colors mt-6"
        >
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back to PawVoice."
      footer={
        <>
          No account?{" "}
          <Link
            href="/register"
            className="text-ink font-medium hover:text-accent transition-colors"
          >
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="field"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 8)"
          className="field"
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-2.5 mt-2 bg-accent text-paper rounded-lg font-medium hover:bg-ink hover:text-paper transition-colors"
        >
          Sign in
        </button>
      </form>

      {msg && <AuthNotice tone="error">{msg}</AuthNotice>}

      <div className="flex justify-between items-center mt-4 text-sm">
        <Link
          href="/forgot-password"
          className="text-ink font-medium hover:text-accent transition-colors"
        >
          Forgot password?
        </Link>
      </div>
    </AuthShell>
  );
}
