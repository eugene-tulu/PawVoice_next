// convex/vapi.ts
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizePhone } from "./lib/phone";
// $5 overdraft buffer. Inlined (NOT imported from ./billing) so this V8-sandbox
// httpAction does not pull the Node.js-only `resend` dependency into its bundle.
const BUFFER_CENTS = 500;

const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET ?? "";
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID ?? "";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "";

interface VapiCall {
  id?: string;
  customer?: { number?: string };
  phoneNumber?: { number?: string };
  metadata?: Record<string, unknown>;
  assistant?: { metadata?: Record<string, unknown> };
  endedAt?: string | number;
  durationSeconds?: number;
}

interface VapiToolCall {
  id?: string;
  name?: string;
  parameters?: Record<string, unknown>;
  arguments?: Record<string, unknown>;
  toolCall?: {
    id?: string;
    function?: { name?: string };
    parameters?: Record<string, unknown>;
    arguments?: Record<string, unknown>;
  };
}

interface VapiMessage {
  type?: string;
  call?: VapiCall;
  callId?: string;
  customer?: { number?: string };
  assistant?: { metadata?: Record<string, unknown> };
  metadata?: Record<string, unknown>;
  toolCallList?: VapiToolCall[];
}

interface VapiEnvelope {
  message?: VapiMessage;
  call?: VapiCall;
  callId?: string;
  customer?: { number?: string };
  metadata?: Record<string, unknown>;
  toolCallList?: VapiToolCall[];
  type?: string;
}

// Vapi → Convex authentication. Vapi sends either an `Authorization: Bearer <secret>`
// (Custom Credential) or an `X-Vapi-Secret` header.
function verifySignature(request: Request): boolean {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (bearer?.[1] && bearer[1] === WEBHOOK_SECRET) return true;
  if (request.headers.get("x-vapi-secret") === WEBHOOK_SECRET) return true;
  return false;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function extractCall(message: VapiEnvelope): { id: string; customerNumber: string | null; authId: string | null } {
  const inner = message?.message;
  const call = inner?.call ?? message.call ?? {};
  // caller number lands in call.customer.number (phone) or message.customer.number
  const number =
    call?.customer?.number ??
    inner?.customer?.number ??
    message.customer?.number ??
    call?.phoneNumber?.number ??
    null;
  // Web calls: authId is set via the web SDK start() options and must reach
  // the `tool-calls` handler so we can attribute the log to the right user.
  // For web calls the `assistant-request` event (which would create a
  // callSession) never fires, so tool-calls can ONLY be resolved via this
  // metadata. Vapi nests it in different spots depending on the transport,
  // so check every known location.
  const authIdCandidates: unknown[] = [
    call?.metadata?.authId,
    inner?.metadata?.authId,
    message?.metadata?.authId,
    inner?.assistant?.metadata?.authId,
    message?.message?.assistant?.metadata?.authId,
    // Some tool-calls payloads wrap the live call under a different key.
    (call as Record<string, unknown>)?.assistant?.metadata?.authId,
  ];
  const authId = authIdCandidates.find(
    (v): v is string => typeof v === "string" && v.length > 0
  );
  return {
    id: call?.id ?? inner?.callId ?? message.callId ?? "",
    customerNumber: number,
    authId: authId ?? null,
  };
}

function readParams(toolCall: VapiToolCall): Record<string, unknown> {
  // Vapi may deliver the function arguments under `parameters` or `arguments`
  // depending on the transport/model; handle both so the tool never receives
  // an empty object (which would silently log nothing).
  const p =
    toolCall?.parameters ??
    toolCall?.arguments ??
    toolCall?.toolCall?.parameters ??
    toolCall?.toolCall?.arguments;
  return (p ?? {}) as Record<string, unknown>;
}

function extractEndedAt(message: VapiEnvelope): number | undefined {
  const inner = message?.message;
  const call = inner?.call ?? message.call ?? {};
  const endedAt = call?.endedAt ?? inner?.call?.endedAt;
  if (typeof endedAt === "string") {
    const t = Date.parse(endedAt);
    return Number.isFinite(t) ? t : undefined;
  }
  if (typeof endedAt === "number") return endedAt;
  return undefined;
}

function extractDurationSec(message: VapiEnvelope): number | undefined {
  const inner = message?.message;
  const call = inner?.call ?? message.call ?? {};
  const d = call?.durationSeconds ?? inner?.call?.durationSeconds;
  if (typeof d === "number") return Math.max(0, Math.floor(d));
  return undefined;
}

export const vapiWebhook = httpAction(async (ctx, request) => {
  if (!verifySignature(request)) return new Response("Unauthorized", { status: 401 });

  const message = (await request.json().catch(() => ({}))) as VapiEnvelope;
  const type = message?.message?.type;
  const { id: callId, customerNumber, authId } = extractCall(message.message ?? message);

  switch (type) {
     case "assistant-request": {
      const callerPhone = customerNumber
        ? normalizePhone(customerNumber)
        : null;

      if (!callerPhone && !authId) {
        return json(200, {
          error:
            "We couldn't identify your account. Make sure you're logged in to the PawVoice app before calling. Thank you.",
        });
      }
      if (!ASSISTANT_ID) {
        return json(200, {
          error:
            "PawVoice calling is not configured yet. Contact support. Thank you.",
        });
      }

      let user = null;
      if (callerPhone) {
        user = await ctx.runQuery(internal.users.getByPhone, {
          phone: callerPhone,
        });
      }
      if (!user && authId) {
        user = await ctx.runQuery(internal.users.getByAuthId, {
          authId,
        });
      }

      if (!user) {
        return json(200, {
          error: `No account is registered for this caller. Sign up at ${SITE}/register before calling. Thank you.`,
        });
      }
      if ((user.credits ?? 0) < -BUFFER_CENTS) {
        return json(200, {
          error: `Your balance is too low. Please add credits at ${SITE}/dashboard before calling. Thank you.`,
        });
      }

      // Feed the caller's pet list into the assistant so it knows the pet
      // names (and can log for the single pet without asking).
      const petContext = await ctx.runQuery(internal.pets.petContext, {
        userId: user._id,
      });

      // Persist the call session once, with the resolved user, so later
      // tool-calls and billing can attribute cost correctly.
      await ctx.runMutation(internal.callSessions.create, {
        callId,
        callerPhone: callerPhone ?? undefined,
        authId: authId ?? undefined,
        userId: user._id,
        startedAt: Date.now(),
        assistantId: ASSISTANT_ID || undefined,
      });
      return json(200, {
        assistantId: ASSISTANT_ID,
        assistantOverrides: { variableValues: { pets: petContext } },
      });
    }

    case "tool-calls": {
      // Diagnostic: surface whether Vapi delivers the caller identity on web
      // calls. For web calls `assistant-request` never fires, so the only way
      // to attribute a log is via metadata.authId here. Log the envelope so a
      // resolution failure can be traced without guessing.
      console.log(
        "vapi tool-calls:",
        JSON.stringify({
          callId,
          customerNumber,
          authId,
          messageKeys: Object.keys(message?.message ?? {}),
          callKeys: Object.keys((message?.message?.call ?? message?.call) ?? {}),
        })
      );
      const callerPhone = customerNumber
        ? normalizePhone(customerNumber)
        : null;
      // If the envelope lacks caller id, fall back to the session recorded at
      // assistant-request time.
      let resolvedPhone: string | undefined = callerPhone ?? undefined;
      let resolvedAuthId: string | undefined = authId ?? undefined;
      if (!resolvedPhone || !resolvedAuthId) {
        const session = await ctx.runQuery(internal.callSessions.byCallId, {
          callId,
        });
        resolvedPhone = resolvedPhone ?? session?.callerPhone ?? undefined;
        resolvedAuthId = resolvedAuthId ?? session?.authId ?? undefined;
      }

      const toolCallList: VapiToolCall[] =
        message.message?.toolCallList ?? message.toolCallList ?? [];
      const results: { toolCallId: string; name: string; result: string }[] = [];

      for (const toolCall of toolCallList) {
        const id = toolCall?.id ?? toolCall?.toolCall?.id ?? "";
        const name: string = toolCall?.name ?? toolCall?.toolCall?.function?.name ?? "unknown";
        const params = readParams(toolCall);

        let outcome: unknown;
        if (name === "logActivity") {
          outcome = await ctx.runMutation(internal.logs.logActivity, {
            ...params,
            callId,
            callerPhone: resolvedPhone ?? undefined,
            authId: resolvedAuthId ?? undefined,
          } as {
            pet: string;
            activity_type: string;
            duration?: string;
            verbatim_notes?: string;
            callId: string;
            callerPhone?: string;
            authId?: string;
          });
        } else if (name === "undoLastEntry") {
          outcome = await ctx.runMutation(internal.logs.undoLastEntry, {
            callId,
            callerPhone: resolvedPhone ?? undefined,
            authId: resolvedAuthId ?? undefined,
          });
        } else {
          outcome = { ok: false, readback: `Unknown tool ${name}` };
        }

        // Vapi feeds `result` back to the LLM. We return a concise string so the
        // assistant can relay the authoritative read-back verbatim.
        results.push({
          toolCallId: id,
          name,
          result: JSON.stringify(outcome),
        });
      }

      return json(200, { results });
    }

    case "end-of-call-report": {
      const endedAt = extractEndedAt(message);
      const durationSec = extractDurationSec(message);
      await ctx.runAction(internal.billing.recordBilling, {
        callId,
        endedAt,
        ...(durationSec !== undefined ? { durationSec } : {}),
      });
      return new Response("ok", { status: 200 });
    }

    default:
      // status-update, transcript, conversation-update, etc. require no action.
      return new Response("ok", { status: 200 });
  }
});
