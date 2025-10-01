// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl md:text-5xl font-bold text-paw mb-4">
          🐾 PawVoice Pro
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Hands-free AI dog coaching. Just talk — no typing, no apps.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition"
          >
            Create Account
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Built with Convex + Better Auth + Vapi
        </p>
      </div>
    </div>
  );
}