"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthShell, AuthNotice } from "@/components/auth-shell";

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

  if (status === "sent") {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="If that email has an account, a reset link is on its way."
        footer={
          <Link
            href="/login"
            className="text-ink font-medium hover:text-accent transition-colors"
          >
            Back to sign in
          </Link>
        }
      >
        <p className="text-center text-ink-2 text-sm mb-1">
          We sent a reset link to{" "}
          <span className="font-mono bg-muted/5 px-2 py-1 rounded">{email}</span>
          . Check your inbox (and spam folder).
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full px-4 py-2.5 mt-4 bg-accent text-paper rounded-lg font-medium hover:bg-ink hover:text-paper transition-colors"
        >
          Back to sign in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll email you a link to reset your password."
      footer={
        <Link
          href="/login"
          className="text-ink font-medium hover:text-accent transition-colors"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 border border-rule rounded-lg text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus"
          required
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full px-4 py-2.5 mt-2 bg-accent text-paper rounded-lg font-medium hover:bg-ink hover:text-paper transition-colors disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send reset link"}
        </button>
      </form>
      {status === "error" && <AuthNotice tone="error">{msg}</AuthNotice>}
    </AuthShell>
  );
}
