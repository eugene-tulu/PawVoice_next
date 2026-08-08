"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle"
  );
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    if (password.length < 8) {
      setStatus("error");
      setMsg("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setMsg("Passwords do not match");
      return;
    }
    setStatus("saving");
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    if (error) {
      setStatus("error");
      setMsg(error.message ?? "Failed to reset password");
    } else {
      setStatus("done");
      setTimeout(() => router.push("/login"), 1500);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-4">
        <div className="text-center p-6 max-w-sm">
          <h1 className="font-display text-2xl font-black text-ink mb-2">
            Invalid link
          </h1>
          <p className="text-ink-2 mb-6 text-sm">
            This password reset link is missing its token or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="px-6 py-3 bg-accent text-paper rounded-full font-medium hover:bg-ink transition-colors inline-block"
          >
            Request a new link
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
          Reset password
        </h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min 8)"
          className="w-full px-3 py-2 border border-rule rounded text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus mb-3"
          required
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="w-full px-3 py-2 border border-rule rounded text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus mb-3"
          required
        />

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full px-4 py-2.5 bg-accent text-paper rounded font-medium hover:bg-ink transition-colors mt-2 disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Set new password"}
        </button>

        {status === "done" && (
          <p className="text-center text-sm mt-4" style={{ color: "var(--color-ink)" }}>
            Password updated — redirecting to sign in…
          </p>
        )}
        {status === "error" && (
          <p className="text-center text-sm mt-4" style={{ color: "var(--color-accent)" }}>
            {msg}
          </p>
        )}

        <p className="text-center text-sm text-muted mt-6">
          <Link
            href="/login"
            className="text-ink font-medium hover:text-accent transition-colors"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
