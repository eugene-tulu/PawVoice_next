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
// Coerce any value to a renderable string. Vapi message/error payloads can nest
// objects, and rendering an object as JSX children throws React error #31.
import { toText } from "@/lib/text";
import Vapi from "@vapi-ai/web";
import { track } from "@vercel/analytics";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
// Optional override for the Vapi API base URL (defaults to https://api.vapi.ai
// inside the SDK). Useful when requests to api.vapi.ai are blocked/unresolvable
// in a given network and must be routed through a proxy.
const API_BASE_URL = process.env.NEXT_PUBLIC_VAPI_API_BASE_URL || undefined;

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
  // Post-call feedback. Shown after a call ends; submitted as a Vercel
  // Analytics event (no backend storage needed for v1).
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [ratingComment, setRatingComment] = useState("");
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
    // Vapi/Daily error payloads are deeply nested and inconsistent: the useful
    // text can live on .error (string), .error.message, .error.msg/.errorMsg
    // (Daily), or the top-level .message. CRITICALLY, the Vapi SDK's
    // `serializeError` can set `.error.message` to an *object* — Daily's
    // {type, msg, details} — when a meeting ends in error. Returning that
    // object here (as the old code did) gets rendered as a React child and
    // crashes the page (React error #31). So we coerce every candidate to a
    // string and never return a non-string.
    if (typeof e === "string") return e;
    const err = (e ?? {}) as Record<string, unknown>;
    const inner = (err.error && typeof err.error === "object"
      ? (err.error as Record<string, unknown>)
      : {}) as Record<string, unknown>;

    const candidates: unknown[] = [
      err.error,
      inner.message,
      inner.msg,
      inner.errorMsg,
      inner.error,
      err.errorMsg,
      err.msg,
      err.message,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c;
    }
    // Nothing was a plain string. Don't dump the whole serialized error into
    // the UI: the Vapi SDK attaches `stack`, `details`, `cause` etc., which is
    // noise for the user and leaks internals. The raw object is already logged
    // by the `error`/`call-start-failed` handlers for debugging, so fall back
    // to a short, safe label here.
    if (typeof inner.name === "string" && inner.name.trim()) return inner.name;
    if (typeof err.type === "string" && err.type.trim()) return err.type;
    return "A call error occurred";
  }, []);

  // Turn a raw Vapi error into something actionable for the user. A
  // "Failed to fetch" / DNS failure means we couldn't reach api.vapi.ai at all
  // (network, DNS, firewall, or a browser extension/privacy blocker), not a
  // problem with the call itself.
  const describeFailure = useCallback(
    (message: string, type?: string): string => {
      // The most common real failure: the meeting connects but Vapi receives
      // no microphone audio and ends the call immediately (endedReason
      // "call.in-progress.error-assistant-did-not-receive-customer-audio",
      // surfaced to the browser as "Meeting has ended"). This is a mic
      // capture/permission problem, not a network one.
      const isMicAudio =
        /did not receive customer audio|customer audio|meeting has ended|meeting ended|no audio|microphone/i.test(
          message
        );
      if (isMicAudio) {
        return "The call ended because no microphone audio was detected. On web calls the assistant speaks after you do, so start talking when the call connects (and make sure your mic is unmuted, the right input device is selected, no other app is using it, and this site is allowed microphone access).";
      }
      const isNetwork =
        /failed to fetch|name not resolved|networkerror|net::|timeout/i.test(
          message
        ) ||
        type === "start-method-error" ||
        type === "daily-call-join-error";
      if (isNetwork) {
        return `Can't reach Vapi's servers (${message}). Check your internet connection, DNS, firewall, or any browser extension/privacy blocker intercepting api.vapi.ai.`;
      }
      return message;
    },
    []
  );

  const reportFailure = useCallback(
    (e: unknown) => {
      const ev = e as { type?: string; error?: unknown };
      const message = extractError(e);
      setCallStateAndReset("idle");
      startingRef.current = false;
      setError(describeFailure(message, ev?.type));
      toast(message, "error");
    },
    [extractError, describeFailure, setCallStateAndReset, toast]
  );

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
            content: toText(msg.transcript),
            ts: Date.now(),
          });
        }

        if (type === "model-output" && typeof msg.modelOutput === "string") {
          addTranscript({
            role: "assistant",
            content: toText(msg.modelOutput),
            ts: Date.now(),
          });
        }

        if (type === "tool-calls-result" && typeof msg.result === "string") {
          let resultText = msg.result;
          try {
            const parsed = JSON.parse(resultText);
            // Only use readback when it's a string; otherwise keep the raw
            // result text. Using a non-string here (e.g. an object) would get
            // rendered as a React child and crash the page (React error #31).
            if (typeof parsed?.readback === "string") {
              resultText = parsed.readback;
            }
          } catch {
            // keep raw result
          }
          addTranscript({
            role: "assistant",
            content: toText(resultText),
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
                content: toText(last.content),
                ts: Date.now(),
              });
            }
          }
        }
      });

      instance.on("error", (e: unknown) => {
        console.error("Vapi error:", e);
        reportFailure(e);
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
        setShowRating(true);
      });

      instance.on("call-start-failed", (e: unknown) => {
        console.error("Vapi call-start-failed:", e);
        reportFailure(e);
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
    [addTranscript, reportFailure, setCallStateAndReset]
  );

  const getVapi = useCallback(() => {
    let instance = vapiRef.current;
    if (!instance) {
      instance = new Vapi(PUBLIC_KEY, API_BASE_URL);
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
    // Web calls have no `assistant-request` event to gate on (that only fires for
    // inbound phone calls), so verify the balance here before handing off to Vapi.
    // Block honest out-of-credit attempts; a transient check failure falls back to
    // the cached `me.credits` so a network blip can't hard-block a valid caller.
    let canStart = (me.credits ?? 0) > -500;
    try {
      const gate = await convex.query(api.users.canStartCall);
      canStart = gate.ok;
    } catch {
      canStart = (me.credits ?? 0) > -500;
    }
    if (!canStart) {
      startingRef.current = false;
      setCallState("idle");
      setError(
        "Your PawVoice balance is too low to start a call. Add credits in the app, then try again."
      );
      return;
    }

    // Guard against double-start (e.g. rapid clicks or re-entrancy)
    if (startingRef.current) return;

    startingRef.current = true;
    setCallState("preparing");
    setError(null);
    setShowRating(false);
    setRating(null);
    setRatingComment("");

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

    // Preflight: confirm we can actually capture microphone audio *before*
    // joining the meeting. If we skip this, a blocked/broken/absent mic makes
    // the Vapi (Daily) client join with no audio track, and Vapi ends the call
    // server-side within a second — surfaced to the browser only as the opaque
    // "Meeting has ended" (endedReason:
    // "call.in-progress.error-assistant-did-not-receive-customer-audio").
    // Doing the check here lets us fail fast with an actionable message and
    // warms up the permission grant so the SDK's own join succeeds.
    setCallState("connecting");
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        // getUserMedia is unavailable outside a secure context (non-HTTPS).
        const err = new Error("insecure-context");
        err.name = "insecure-context";
        throw err;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const hasLiveAudio = stream
        .getAudioTracks()
        .some((t) => t.readyState === "live" && t.enabled);
      // Release the device immediately so the Vapi/Daily SDK can re-acquire it.
      stream.getTracks().forEach((t) => t.stop());
      if (!hasLiveAudio) {
        const err = new Error("no-audio-track");
        err.name = "NotFoundError";
        throw err;
      }
    } catch (e) {
      startingRef.current = false;
      setCallState("idle");
      const name = (e as { name?: string })?.name ?? "";
      let friendly =
        "We couldn't access your microphone. Allow mic access and try again.";
      if (name === "insecure-context") {
        friendly =
          "Microphone access requires a secure (HTTPS) connection. Open the app over HTTPS and try again.";
      } else if (name === "NotAllowedError" || name === "SecurityError") {
        friendly =
          "Microphone permission is blocked. Allow this site to use your microphone in your browser's site settings, then reload and try again.";
      } else if (name === "NotReadableError" || name === "AbortError") {
        friendly =
          "Your microphone is unavailable — it may be in use by another app. Close the other app, then try again.";
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        friendly =
          "No working microphone was found. Connect a mic and select it as your input device, then try again.";
      }
      setError(friendly);
      return;
    }

    // The user may have hit "End call" while the mic prompt was open, which
    // clears the start guard. Honour that cancellation before joining.
    if (!startingRef.current) {
      setCallStateAndReset("idle");
      return;
    }

    const instance = getVapi();

    try {
      await instance.start(callConfig.assistantId, {
        metadata: { authId: me!.authId },
        // Inject the user's pet list into the assistant prompt so it logs for
        // the correct pet without having to ask. Also pass authId via
        // variableValues: for web calls Vapi echoes variableValues back to the
        // tool-calls webhook (but does NOT forward metadata.authId), so this is
        // how the webhook attributes each logged activity to the right user.
        variableValues: {
          pets: callConfig.petContext ?? "",
          authId: me!.authId,
        },
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
  }, [me, convex, getVapi, setCallStateAndReset]);

  const endCall = useCallback(async () => {
    const instance = vapiRef.current;
    if (!instance) {
      // No SDK instance yet, so the user hit "End call" while the start was
      // still in flight (e.g. the mic permission prompt was open). Clear the
      // start guard so `startCall` aborts before joining, instead of silently
      // doing nothing and then connecting anyway.
      if (startingRef.current) {
        startingRef.current = false;
        setCallStateAndReset("idle");
      }
      return;
    }
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

  const submitRatingUp = useCallback(() => {
    track("call_rated", { rating: "up" });
    setShowRating(false);
  }, []);

  const submitRatingDown = useCallback(() => {
    const comment = ratingComment.trim();
    track("call_rated", comment ? { rating: "down", comment } : { rating: "down" });
    setShowRating(false);
  }, [ratingComment]);

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
            <p className="text-sm text-red-600">{toText(error)}</p>
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
              {toText(item.content)}
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

        {showRating && (
          <div className="border border-rule rounded-lg p-5 mb-6">
            <p className="text-sm font-medium text-ink mb-3">
              How did this call go?
            </p>
            {rating !== "down" ? (
              <div className="flex gap-2">
                <button
                  onClick={submitRatingUp}
                  className="px-4 py-2 rounded-full border border-rule text-ink hover:bg-paper-2 transition-colors"
                  aria-label="Good call"
                >
                  👍 Good
                </button>
                <button
                  onClick={() => setRating("down")}
                  className="px-4 py-2 rounded-full border border-rule text-ink hover:bg-paper-2 transition-colors"
                  aria-label="Bad call"
                >
                  👎 Something off
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="What went wrong? (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-rule rounded-lg text-sm bg-paper-2 text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={submitRatingDown}
                    className="px-4 py-2 bg-accent text-paper rounded-full font-medium hover:bg-ink transition-colors"
                  >
                    Send feedback
                  </button>
                  <button
                    onClick={() => setShowRating(false)}
                    className="px-4 py-2 rounded-full border border-rule text-ink hover:bg-paper-2 transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
