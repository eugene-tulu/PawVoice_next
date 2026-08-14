// convex/vapi.ts
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizePhone } from "./lib/phone";
import { BUFFER_CENTS } from "./billing";

const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET ?? "";
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID ?? "";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "";

interface VapiCall {
  id?: string;
  customer?: { number?: string };
  phoneNumber?: { number?: string };
  metadata?: Record<string, unknown>;
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
  };
}

interface VapiEnvelope {
  message?: {
    type?: string;
    call?: VapiCall;
    callId?: string;
    customer?: { number?: string };
    toolCallList?: VapiToolCall[];
  };
  call?: VapiCall;
  callId?: string;
  customer?: { number?: string };
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
  // Web calls: authId passes through Vapi call metadata (set on the assistant/web SDK start options).
  const authId = call?.metadata?.authId ?? null;
  return { id: call?.id ?? inner?.callId ?? message.callId ?? "", customerNumber: number, authId: typeof authId === "string" ? authId : null };
}

function readParams(toolCall: VapiToolCall): Record<string, unknown> {
  return toolCall?.parameters ?? toolCall?.arguments ?? toolCall?.toolCall?.parameters ?? {};
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
      return json(200, { assistantId: ASSISTANT_ID });
    }

    case "tool-calls": {
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
