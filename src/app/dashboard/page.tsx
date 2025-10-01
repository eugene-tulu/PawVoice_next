// src/app/dashboard/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  if (isPending) return <div className="p-8">Loading...</div>;
  if (!session) return null;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, {session.user.name}!</h1>
      <p className="mt-2">Email: {session.user.email}</p>
      <button
        onClick={() => authClient.signOut()}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        Sign out
      </button>
    </div>
  );
}