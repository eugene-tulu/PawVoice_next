"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function Navigation() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div
        className="inline-flex items-center gap-1 px-2 py-1.5 bg-paper/80 dark:bg-paper/10 backdrop-blur-sm border border-rule rounded-full shadow-md"
      >
        <Link
          href="/dashboard"
          className="font-display text-lg font-semibold text-ink px-2 py-1"
        >
          PawVoice
        </Link>
        <div className="h-4 w-px bg-rule mx-1" />
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-ink-2 hover:text-ink px-3 py-1 rounded-full transition-colors duration-150"
          >
            {link.label}
          </Link>
        ))}
        <div className="h-4 w-px bg-rule mx-1" />
        <button
          onClick={handleSignOut}
          className="text-xs font-medium text-muted hover:text-ink px-3 py-1 rounded-full transition-colors duration-150"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
