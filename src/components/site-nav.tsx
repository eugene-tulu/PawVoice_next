"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "./ui";

export function SiteNav() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 border-b border-rule/70 bg-paper/70 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl font-black tracking-tight text-ink"
        >
          Paw<span className="text-accent">Voice</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {[
            { href: "/#pricing", label: "Pricing" },
            { href: "/#how", label: "How it works" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-2 hover:text-ink transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="grid h-9 w-9 place-items-center rounded-full border border-rule text-ink-2 hover:text-ink hover:bg-paper-2 transition-colors"
          >
            {mounted && resolvedTheme === "dark" ? "☀" : "☾"}
          </button>
          <Link
            href="/login"
            className="text-sm font-medium text-ink-2 hover:text-ink px-3 py-1.5 transition-colors hidden sm:block"
          >
            Sign in
          </Link>
          <Button href="/register" variant="primary" className="!py-2 !px-4">
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
