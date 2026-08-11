"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui";

export function SiteNav() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const authStatus = useQuery(api.auth.getAuthStatus);

  useEffect(() => setMounted(true), []);

  const authenticated = authStatus?.status === "authenticated";

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const publicLinks = [
    { href: "/#pricing", label: "Pricing" },
    { href: "/#how", label: "How it works" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-rule/70 bg-paper/70 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl font-black tracking-tight text-ink"
        >
          Paw<span className="text-accent">Voice</span>
        </Link>

        {!authenticated && (
          <nav className="hidden items-center gap-7 md:flex">
            {publicLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-ink-2 hover:text-ink transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <button
            aria-label="Toggle theme"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            className="grid h-9 w-9 place-items-center rounded-full border border-rule text-ink-2 hover:text-ink hover:bg-paper-2 transition-colors"
          >
            {mounted && resolvedTheme === "dark" ? "☀" : "☾"}
          </button>

          {authenticated ? (
            <>
              <Link
                href="/dashboard"
                className="hidden px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink sm:block"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="hidden px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink sm:block"
              >
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink sm:block"
              >
                Sign in
              </Link>
              <Button href="/register" variant="primary" className="!px-4 !py-2">
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
