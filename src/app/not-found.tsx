import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper text-ink font-body flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="font-display text-3xl font-black tracking-tight text-ink mt-2">
          This page wandered off.
        </h1>
        <p className="text-ink-2 mt-3">
          The link may be old or the page may have moved. Let&apos;s get you
          back to your pet&apos;s log.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Button href="/">Go home</Button>
          <Button href="/dashboard" variant="ghost">
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
