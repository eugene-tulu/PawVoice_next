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

  return (
    <nav className="px-4 py-3 border-b border-amber-100 dark:border-amber-900/30">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-amber-800 dark:text-amber-300 no-underline">
          PawVoice
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className="text-gray-700 dark:text-gray-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="text-gray-700 dark:text-gray-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
          >
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="text-gray-700 dark:text-gray-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors underline decoration-amber-700/30 decoration-offset-2 hover:decoration-amber-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
