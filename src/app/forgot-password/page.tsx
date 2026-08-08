"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMsg("");
    const { error } = await authClient.forgetPassword({
      email,
      redirectTo: "/reset-password",
    });
    if (error) {
      setStatus("error");
      setMsg(error.message ?? "Failed to send reset email");
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-paper-2 border border-rule rounded-xl p-8 shadow-md"
      >
        <h1 className="font-display text-2xl font-black text-ink text-center mb-2">
          Forgot password
        </h1>
        <p className="text-center text-sm text-muted mb-6">
          We&apos;ll email you a link to reset your password.
        </p>

        {status === "sent" ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">✉️</span>
            </div>
            <p className="text-ink-2 text-sm mb-6">
              If an account exists for{" "}
              <span className="font-mono bg-muted/5 px-2 py-1 rounded">
                {email}
              </span>
              , a reset link is on its way. Check your inbox (and spam folder).
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full px-4 py-2.5 bg-accent text-paper rounded font-medium hover:bg-ink transition-colors"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-rule rounded text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus mb-3"
              required
            />

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full px-4 py-2.5 bg-accent text-paper rounded font-medium hover:bg-ink transition-colors mt-2 disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send reset link"}
            </button>

            {status === "error" && (
              <p className="text-center text-sm mt-4" style={{ color: "var(--color-accent)" }}>
                {msg}
              </p>
            )}
          </>
        )}

        <p className="text-center text-sm text-muted mt-6">
          Remembered it?{" "}
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
