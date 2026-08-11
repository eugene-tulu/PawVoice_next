"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-paper text-ink font-body flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="font-mono text-sm text-accent">Something broke</p>
        <h1 className="font-display text-3xl font-black tracking-tight text-ink mt-2">
          We hit a snag.
        </h1>
        <p className="text-ink-2 mt-3">
          An unexpected error occurred. You can try again — your data is safe.
        </p>
        <div className="mt-7 flex justify-center">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
