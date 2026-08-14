// src/app/call/page.tsx
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PrepareResult } from "../../../convex/webCall";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { useToast } from "@/components/toast";
import MedicalDisclaimer from "@/components/medical-disclaimer";
import Vapi from "@vapi-ai/web";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";

type CallState =
  | "idle"
  | "preparing"
  | "connecting"
  | "listening"
  | "speaking"
  | "ending";

interface TranscriptItem {
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function CallPage() {
  const authStatus = useQuery(api.auth.getAuthStatus);
  const me = useQuery(api.users.me);
  const router = useRouter();
  const toast = useToast();
  const convex = useConvex();

  const [callState, setCallState] = useState<CallState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const listenersAttachedRef = useRef(false);
  const startingRef = useRef(false);

  useEffect(() => {
    if (authStatus?.status === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus?.status === "authenticated" && !authStatus.emailVerified) {
      router.push("/verify-email");
    }
  }, [authStatus, router]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const addTranscript = useCallback((item: TranscriptItem) => {
    setTranscript((prev) => [...prev, item]);
  }, []);

  const setCallStateAndReset = useCallback(
    (state: CallState) => {
      setCallState(state);
      if (state === "idle") {
        stopTimer();
        setTranscript([]);
        setVolume(0);
        setMuted(false);
      }
    },
    [stopTimer]
  );

  const extractError = useCallback((e: unknown): string => {
    const err = e as {
      type?: string;
      message?: string;
      error?: { message?: string; error?: string };
    };
    if (err?.error?.message) return err.error.message;
    if (err?.error?.error) return err.error.error;
    if (err?.message) return err.message;
    return "A call error occurred";
  }, []);

  const attachListeners = useCallback(
    (instance: Vapi) => {
      if (listenersAttachedRef.current) return;
      listenersAttachedRef.current = true;

      instance.on("message", (message: unknown) => {
        const msg = message as Record<string, unknown>;
        const type = typeof msg.type === "string" ? msg.type : "";

        if (type === "transcript" && typeof msg.transcript === "string") {
          const role = msg.role === "assistant" ? "assistant" : "user";
          addTranscript({
            role: role as "user" | "assistant",
            content: msg.transcript,
            ts: Date.now(),
          });
        }

        if (type === "model-output" && typeof msg.modelOutput === "string") {
          addTranscript({
            role: "assistant",
            content: msg.modelOutput,
            ts: Date.now(),
          });
        }

        if (type === "tool-calls-result" && typeof msg.result === "string") {
          let resultText = msg.result;
          try {
            const parsed = JSON.parse(resultText);
            if (parsed?.readback) {
              resultText = parsed.readback;
            }
          } catch {
            // keep raw result
          }
          addTranscript({
            role: "assistant",
            content: resultText,
            ts: Date.now(),
          });
        }

        if (
          type === "conversation-update" &&
          msg.conversation &&
          typeof msg.conversation === "object"
        ) {
          const conv = msg.conversation as { messages?: unknown[] };
          const msgs = conv.messages ?? [];
          if (msgs.length > 0) {
            const last = msgs[msgs.length - 1] as Record<string, unknown>;
            if (last?.role === "assistant" && typeof last.content === "string") {
              addTranscript({
                role: "assistant",
                content: last.content,
                ts: Date.now(),
              });
            }
          }
        }
      });

      instance.on("error", (e: unknown) => {
        console.error("Vapi error:", e);
        const message = extractError(e);
        const isJoinError =
          (e as { type?: string })?.type === "daily-call-join-error";
        setCallStateAndReset("idle");
        startingRef.current = false;
        setError(isJoinError ? `${message} — check your connection and try again.` : message);
        toast(message, "error");
      });

      instance.on("call-start", () => {
        startingRef.current = false;
        setCallStateAndReset("listening");
        setElapsed(0);
        timerRef.current = setInterval(() => {
          setElapsed((prev) => prev + 1000);
        }, 1000);
      });

      instance.on("call-end", () => {
        setCallStateAndReset("idle");
      });

      instance.on("call-start-failed", (e: unknown) => {
        console.error("Vapi call-start-failed:", e);
        const message = extractError(e);
        setCallStateAndReset("idle");
        startingRef.current = false;
        setError(`Could not connect to the call — ${message}`);
      });

      instance.on("speech-start", () => {
        setCallState((prev) => (prev === "listening" ? "speaking" : prev));
      });

      instance.on("speech-end", () => {
        setCallState((prev) => (prev === "speaking" ? "listening" : prev));
      });

      instance.on("local-volume-level", (vol: number) => {
        setVolume(vol);
      });
    },
    [addTranscript, extractError, setCallStateAndReset, toast]
  );

  const getVapi = useCallback(() => {
    let instance = vapiRef.current;
    if (!instance) {
      instance = new Vapi(PUBLIC_KEY);
      vapiRef.current = instance;
      attachListeners(instance);
    }
    return instance;
  }, [attachListeners]);

  const disposeVapi = useCallback(() => {
    const instance = vapiRef.current;
    if (instance) {
      void instance.stop().catch(() => {});
      instance.removeAllListeners();
      listenersAttachedRef.current = false;
      vapiRef.current = null;
    }
  }, []);

  const startCall = useCallback(async () => {
    if (!PUBLIC_KEY) {
      setError("Vapi public key is not configured");
      return;
    }
    if (!me) return;
    // Guard against double-start (e.g. rapid clicks or re-entrancy)
    if (startingRef.current) return;

    startingRef.current = true;
    setCallState("preparing");
    setError(null);

    // Fetch call config imperatively so a Convex server error doesn't crash the page
    let callConfig: PrepareResult | null = null;
    try {
      callConfig = await convex.query(api.webCall.prepare);
    } catch (e) {
      startingRef.current = false;
      setCallState("idle");
      setError(e instanceof Error ? e.message : "Failed to load call configuration");
      return;
    }

    if (!callConfig || !callConfig.ok) {
      startingRef.current = false;
      setCallState("idle");
      setError(callConfig?.reason ?? "Cannot start call");
      return;
    }

    const instance = getVapi();

    // Show "Connecting…" immediately. `start()` only resolves once the call
    // actually connects, so waiting to flip the state until after `await`
    // leaves the user stuck on "Checking your account…" during long joins.
    setCallState("connecting");

    try {
      await instance.start(callConfig.assistantId, {
        metadata: { authId: me!.authId },
      });
    } catch (e) {
      startingRef.current = false;
      setCallState("idle");
      setError(
        e instanceof Error
          ? `Could not start the call — ${e.message}`
          : "Failed to start call"
      );
    }
  }, [me, convex, getVapi]);

  const endCall = useCallback(async () => {
    const instance = vapiRef.current;
    if (!instance) return;
    setCallState("ending");
    startingRef.current = false;
    try {
      await instance.stop();
    } catch (e) {
      console.error("Error stopping call:", e);
    }
    setCallStateAndReset("idle");
  }, [setCallStateAndReset]);

  const toggleMute = useCallback(() => {
    const instance = vapiRef.current;
    if (!instance) return;
    const next = !muted;
    setMuted(next);
    try {
      instance.setMuted(next);
    } catch (e) {
      // setMuted throws "Call object is not available" if the call already
      // ended/errored — keep the UI consistent without crashing.
      console.warn("Mute toggle ignored (no active call):", e);
      setMuted(!next);
    }
  }, [muted]);

  useEffect(() => {
    return () => {
      stopTimer();
      disposeVapi();
    };
  }, [stopTimer, disposeVapi]);

  const isReady = authStatus?.status === "authenticated" && authStatus.emailVerified;
  const active = callState !== "idle" && callState !== "preparing";

  const stateLabel = {
    idle: "Ready to call",
    preparing: "Checking your account…",
    connecting: "Connecting…",
    listening: "Listening…",
    speaking: "Speaking…",
    ending: "Ending call…",
  }[callState];

  const stateColor = {
    idle: "text-muted",
    preparing: "text-accent",
    connecting: "text-accent",
    listening: "text-ink-2",
    speaking: "text-accent",
    ending: "text-muted",
  }[callState];

  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-6 py-12 pb-32">
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="font-display text-3xl font-black tracking-tight">
            Voice call
          </h1>
          {me && (
            <span className="font-mono text-sm text-ink-2 tabular-nums">
              ${((me.credits ?? 0) / 100).toFixed(2)} · {me.phone ? "...​" + String(me.phone).slice(-4) : "no phone"}
            </span>
          )}
        </div>

        {!isReady && (
          <div className="text-center py-12">
            <p className="text-ink-2">Redirecting…</p>
          </div>
        )}

        {error && (
          <div className="border border-red-500/30 bg-red-50/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className={`space-y-4 ${active ? "mb-6" : "mb-12"}`}>
          {transcript.map((item, i) => (
            <div
              key={i}
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                item.role === "user"
                  ? "ml-auto bg-accent text-paper"
                  : item.role === "assistant"
                  ? "mr-auto bg-paper-2 text-ink border border-rule"
                  : "mx-auto text-center text-xs text-muted"
              }`}
            >
              {item.content}
            </div>
          ))}
        </div>

        <div
          className={`flex items-center justify-center gap-3 py-6 ${
            active ? "border-t border-rule" : ""
          }`}
        >
          {active && (
            <div className="flex-1 flex items-center justify-center gap-2">
              <div className="flex items-end gap-0.5 h-8">
                {Array.from({ length: 12 }).map((_, i) => {
                  const height = Math.max(
                    2,
                    Math.round(
                      8 +
                        (i === 5
                          ? volume
                          : i < 5
                          ? volume * (i / 5)
                          : (12 - i) / 7) *
                          20
                    )
                  );
                  return (
                    <span
                      key={i}
                      className="w-1 rounded-sm bg-accent transition-all duration-75"
                      style={{ height }}
                    />
                  );
                })}
              </div>
              <span className={`text-xs font-medium ${stateColor}`}>{stateLabel}</span>
              <span className="font-mono text-xs text-muted tabular-nums">
                {formatDuration(elapsed)}
              </span>
            </div>
          )}

          {!active && (
            <>
              <span className={`text-sm font-medium ${stateColor}`}>{stateLabel}</span>
              <button
                onClick={startCall}
                disabled={callState === "preparing" || !isReady}
                className="px-6 py-3 bg-accent text-paper rounded-full font-medium hover:bg-ink hover:text-paper transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {callState === "preparing" ? "…" : "Start web call"}
              </button>
            </>
          )}

          {active && (
            <>
              <button
                onClick={toggleMute}
                className={`p-2 rounded-full border transition-colors ${
                  muted
                    ? "bg-red-100 border-red-300 text-red-700"
                    : "border-rule text-ink hover:bg-paper-2"
                }`}
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              >
                {muted ? (
                  <span className="text-sm">🔇</span>
                ) : (
                  <span className="text-sm">🎙️</span>
                )}
              </button>
              <button
                onClick={endCall}
                className="px-4 py-2 bg-red-500/10 text-red-600 rounded-full font-medium hover:bg-red-500/20 transition-colors"
              >
                End call
              </button>
            </>
          )}
        </div>

        {!active && isReady && me && (
          <div className="mt-8 border-t border-rule pt-8">
            <p className="text-xs text-ink-2 mb-3">
              You can start calling right away. To receive calls on your Vapi
              number, register a phone number in{" "}
              <span
                onClick={() => router.push("/settings")}
                className="text-accent cursor-pointer underline"
              >
                Settings
              </span>
              . Each call costs $0.18/minute against your credit balance.
            </p>
            <p className="text-xs text-ink-2">
              <strong>Tell the assistant:</strong> which pet, what activity,
              and how long — e.g. &lsquo;Buster had a 30 minute walk and seemed
              energetic.&rsquo;
            </p>
          </div>
        )}

        <div className="mt-12">
          <MedicalDisclaimer />
        </div>
      </main>
    </div>
  );
}
