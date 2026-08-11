"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CONTACT_EMAIL } from "@/lib/site";

export default function Footer() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const authenticated = authStatus?.status === "authenticated";

  return (
    <footer className="mt-16 border-t border-rule">
      <div className="container-x flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Link
            href="/"
            className="font-display text-lg font-black tracking-tight text-ink"
          >
            Paw<span className="text-accent">Voice</span>
          </Link>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            A voice-first activity log for pet sitters and owners. Records what
            happened, in your words.
          </p>
        </div>

        <div className="flex flex-wrap gap-12 text-xs">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-ink">Product</span>
            <Link
              href="/#pricing"
              className="text-muted transition-colors hover:text-ink"
            >
              Pricing
            </Link>
            {authenticated ? (
              <Link
                href="/dashboard"
                className="text-muted transition-colors hover:text-ink"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/register"
                className="text-muted transition-colors hover:text-ink"
              >
                Get started
              </Link>
            )}
            {authenticated ? (
              <Link
                href="/settings"
                className="text-muted transition-colors hover:text-ink"
              >
                Settings
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-muted transition-colors hover:text-ink"
              >
                Sign in
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-ink">Legal</span>
            <Link
              href="/privacy-policy"
              className="text-muted transition-colors hover:text-ink"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-use"
              className="text-muted transition-colors hover:text-ink"
            >
              Terms of Use
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-ink">Contact</span>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-muted transition-colors hover:text-ink"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
      <div className="container-x pb-8 text-xs text-muted">
        <p>
          © {new Date().getFullYear()} PawVoice. Activity log, not medical
          advice.
        </p>
      </div>
    </footer>
  );
}
