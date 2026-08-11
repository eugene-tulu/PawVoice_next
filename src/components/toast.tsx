"use client";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type Tone = "success" | "error" | "info";

type ToastItem = { id: number; message: string; tone: Tone };

type ToastFn = (message: string, tone?: Tone) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback<ToastFn>((message, tone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-md ${
              t.tone === "error"
                ? "border-accent/20 bg-accent/10 text-accent"
                : "border-rule bg-surface text-ink-2"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
