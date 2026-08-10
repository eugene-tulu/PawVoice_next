"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthShell, AuthNotice } from "@/components/auth-shell";

function ResetPasswordForm() {
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
      <AuthShell
        title="Invalid link"
        subtitle="This password reset link is missing its token or has expired."
        footer={
          <Link
            href="/forgot-password"
            className="text-ink font-medium hover:text-accent transition-colors"
          >
            Request a new link
          </Link>
        }
      >
        <Link
          href="/forgot-password"
          className="block w-full px-4 py-2.5 bg-accent text-paper rounded-lg font-medium hover:bg-ink transition-colors text-center"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Choose a new password for your account."
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
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min 8)"
          className="w-full px-3 py-2 border border-rule rounded-lg text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus"
          required
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="w-full px-3 py-2 border border-rule rounded-lg text-sm bg-paper text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus"
          required
        />
        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full px-4 py-2.5 mt-2 bg-accent text-paper rounded-lg font-medium hover:bg-ink transition-colors disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Set new password"}
        </button>
      </form>
      {status === "done" && (
        <AuthNotice tone="success">
          Password updated — taking you to sign in…
        </AuthNotice>
      )}
      {status === "error" && <AuthNotice tone="error">{msg}</AuthNotice>}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
