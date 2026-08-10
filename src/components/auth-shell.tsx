"use client";
import Link from "next/link";
import type { ReactNode } from "react";

// Shared shell for the auth flow — editorial wordmark + refined card,
// consistent with the Hallmark-inspired tokens in globals.css.
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="font-display text-3xl font-black tracking-tight text-ink"
          >
            Paw<span className="text-accent">Voice</span>
          </Link>
        </div>
        <div className="bg-paper-2 border border-rule rounded-2xl p-8 shadow-sm">
          <h1 className="font-display text-2xl font-semibold text-ink text-center mb-1">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-center text-sm text-muted mb-6">{subtitle}</p>
          ) : (
            <div className="mb-6" />
          )}
          {children}
        </div>
        {footer ? (
          <p className="text-center text-sm text-muted mt-6">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}

// Clearly-visible status/error note. `error` = terracotta (brand accent),
// `info`/`success` = quiet neutral. Never invisible.
export function AuthNotice({
  tone = "error",
  children,
}: {
  tone?: "error" | "info" | "success";
  children: ReactNode;
}) {
  const cls =
    tone === "error"
      ? "bg-accent/10 text-accent border-accent/20"
      : tone === "success"
        ? "bg-ink/5 text-ink-2 border-rule"
        : "bg-ink/5 text-muted border-rule";
  return (
    <p
      className={`text-center text-sm mt-4 rounded-lg border px-3 py-2 ${cls}`}
    >
      {children}
    </p>
  );
}
