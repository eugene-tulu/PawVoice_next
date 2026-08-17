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
  assistantOverrides?: { variableValues?: Record<string, unknown> };
  endedAt?: string | number;
  startedAt?: string | number;
  durationSeconds?: number;
}

interface VapiToolCall {
  id?: string;
  // Vapi may key the call by `toolCallId` instead of `id` in some payloads.
  toolCallId?: string;
  name?: string;
  // `arguments` is sometimes a JSON string (OpenAI-style) rather than an object.
  parameters?: Record<string, unknown>;
  arguments?: unknown;
  function?: {
    name?: string;
    parameters?: Record<string, unknown>;
    arguments?: unknown;
  };
  toolCall?: {
    id?: string;
    function?: {
      name?: string;
      parameters?: Record<string, unknown>;
      arguments?: unknown;
    };
    parameters?: Record<string, unknown>;
    arguments?: unknown;
  };
}

interface VapiMessage {
  type?: string;
  // `end-of-call-report` carries timing/duration at the message level (not under `call`).
  startedAt?: string | number;
  endedAt?: string | number;
  durationSeconds?: number;
  durationMs?: number;
  call?: VapiCall;
  callId?: string;
  customer?: { number?: string };
  assistant?: { metadata?: Record<string, unknown> };
  assistantOverrides?: { variableValues?: Record<string, unknown> };
  metadata?: Record<string, unknown>;
  toolCallList?: VapiToolCall[];
  toolWithToolCallList?: VapiToolCall[];
}

interface VapiEnvelope {
  message?: VapiMessage;
  call?: VapiCall;
  callId?: string;
  customer?: { number?: string };
  metadata?: Record<string, unknown>;
  assistantOverrides?: { variableValues?: Record<string, unknown> };
  toolCallList?: VapiToolCall[];
  toolWithToolCallList?: VapiToolCall[];
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
  // Web calls: the user identity must reach the `tool-calls` handler so we can
  // attribute each logged activity to the right user. For web calls the
  // `assistant-request` event (which would create a callSession) never fires,
  // and Vapi does NOT forward `metadata.authId` to the tool-calls webhook.
  // It DOES echo `assistantOverrides.variableValues` back, so the frontend
  // passes authId there — read it from every known location as a fallback.
  const variableValues =
    call?.assistantOverrides?.variableValues ??
    inner?.assistantOverrides?.variableValues ??
    message?.assistantOverrides?.variableValues ??
    {};
  const authIdCandidates: unknown[] = [
    variableValues?.authId,
    call?.metadata?.authId,
    inner?.metadata?.authId,
    message?.metadata?.authId,
    inner?.assistant?.metadata?.authId,
    message?.message?.assistant?.metadata?.authId,
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

// Vapi nests the tool name in several shapes across API versions:
// top-level `name`, `function.name`, or `toolCall.function.name`.
function readToolName(toolCall: VapiToolCall): string {
  const candidates: unknown[] = [
    toolCall?.name,
    toolCall?.function?.name,
    toolCall?.toolCall?.function?.name,
  ];
  const found = candidates.find(
    (n): n is string => typeof n === "string" && n.length > 0
  );
  return found ?? "unknown";
}

function readParams(toolCall: VapiToolCall): Record<string, unknown> {
  // Vapi may deliver the function arguments under `parameters` or `arguments`,
  // nested under `function` or `toolCall`, depending on the transport/model.
  // `arguments` can also arrive as a JSON *string* (OpenAI-style) rather than an
  // object, so parse it when needed. Handle all shapes so the tool never
  // receives an empty object (which would silently log nothing).
  const raw =
    toolCall?.parameters ??
    toolCall?.arguments ??
    toolCall?.function?.arguments ??
    toolCall?.function?.parameters ??
    toolCall?.toolCall?.parameters ??
    toolCall?.toolCall?.arguments ??
    toolCall?.toolCall?.function?.arguments ??
    toolCall?.toolCall?.function?.parameters;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return (JSON.parse(raw) ?? {}) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw as Record<string, unknown>;
}

function extractEndedAt(message: VapiEnvelope): number | undefined {
  const inner = message?.message;
  const call = inner?.call ?? message.call ?? {};
  // Vapi's end-of-call-report carries these at the message level, not under `call`.
  const endedAt = inner?.endedAt ?? call?.endedAt ?? inner?.call?.endedAt;
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
  // `durationSeconds` (and `durationMs`) live at the message level for
  // end-of-call-report.
  const d = inner?.durationSeconds ?? call?.durationSeconds ?? inner?.call?.durationSeconds;
  if (typeof d === "number") return Math.max(0, Math.floor(d));
  if (typeof d === "string") {
    const n = Number(d);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  const ms = inner?.durationMs;
  if (typeof ms === "number" && ms > 0) return Math.max(0, Math.floor(ms / 1000));
  return undefined;
}

function extractStartedAt(message: VapiEnvelope): number | undefined {
  const inner = message?.message;
  const call = inner?.call ?? message.call ?? {};
  // Vapi's end-of-call-report carries these at the message level, not under `call`.
  const startedAt = inner?.startedAt ?? call?.startedAt ?? inner?.call?.startedAt;
  if (typeof startedAt === "string") {
    const t = Date.parse(startedAt);
    return Number.isFinite(t) ? t : undefined;
  }
  if (typeof startedAt === "number" && startedAt > 0) return startedAt;
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
      if ((user.credits ?? 0) <= -BUFFER_CENTS) {
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
      const rawToolCalls: unknown[] = [
        ...(message.message?.toolCallList ?? message.toolCallList ?? []),
        ...(message.message?.toolWithToolCallList ??
          message.toolWithToolCallList ??
          []),
      ];

      // Vapi may include the same tool call in BOTH `toolCallList` and
      // `toolWithToolCallList`. De-duplicate by id, preferring the copy that
      // actually carries arguments (the two copies nest them differently), so we
      // run the tool exactly once and don't double-log or 500 on a copy that
      // lacks args.
      const seen = new Set<string>();
      const toolCalls: VapiToolCall[] = [];
      const hasArgs = (tc: VapiToolCall) =>
        !!(tc?.arguments || tc?.parameters || tc?.function?.arguments ||
          tc?.function?.parameters || tc?.toolCall?.function?.arguments ||
          tc?.toolCall?.function?.parameters);
      for (const raw of rawToolCalls) {
        const tc = raw as VapiToolCall;
        const id = tc?.id ?? tc?.toolCallId ?? tc?.toolCall?.id ?? "";
        if (!id) {
          toolCalls.push(tc);
          continue;
        }
        const existingIdx = toolCalls.findIndex(
          (u) => (u?.id ?? u?.toolCallId ?? u?.toolCall?.id ?? "") === id
        );
        if (existingIdx === -1) {
          seen.add(id);
          toolCalls.push(tc);
        } else if (!hasArgs(toolCalls[existingIdx]!) && hasArgs(tc)) {
          toolCalls[existingIdx] = tc;
        }
      }

      // Diagnostic: surface whether Vapi delivers the caller identity and tool
      // calls on web calls. For web calls `assistant-request` never fires, so the
      // only way to attribute a log is via metadata.authId here. Log the envelope
      // so a resolution failure can be traced without guessing.
      console.log(
        "vapi tool-calls:",
        JSON.stringify({
          callId,
          customerNumber,
          authId,
          messageKeys: Object.keys(message?.message ?? {}),
          callKeys: Object.keys((message?.message?.call ?? message?.call) ?? {}),
          rawCount: rawToolCalls.length,
          uniqueCount: toolCalls.length,
          tools: toolCalls.map((tc) => ({
            id: tc?.id ?? tc?.toolCallId ?? tc?.toolCall?.id ?? null,
            name: readToolName(tc),
            topKeys: Object.keys(tc ?? {}),
            argLocations: {
              arguments: typeof tc?.arguments,
              parameters: typeof tc?.parameters,
              functionArguments: typeof tc?.function?.arguments,
              functionParameters: typeof tc?.function?.parameters,
              toolCallFunctionArguments:
                typeof tc?.toolCall?.function?.arguments,
              toolCallFunctionParameters:
                typeof tc?.toolCall?.function?.parameters,
            },
          })),
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

      // Server-side backstop: even if a caller bypasses the client-side gate,
      // refuse to log activities once they're past the overdraft buffer. Vapi's
      // own per-minute transport cost still accrues (handled by recordBilling),
      // but we don't give away unlimited free logging. `undoLastEntry` is allowed
      // regardless so a user can still clean up an earlier (paid) log.
      let balanceOk = true;
      {
        const acct = resolvedPhone
          ? await ctx.runQuery(internal.users.getByPhone, { phone: resolvedPhone })
          : resolvedAuthId
            ? await ctx.runQuery(internal.users.getByAuthId, { authId: resolvedAuthId })
            : null;
        if (acct && acct.credits <= -BUFFER_CENTS) balanceOk = false;
      }

      // Vapi delivers tool calls in either `toolCallList` (flattened) or
      // `toolWithToolCallList` (with the original tool config), and nests the
      // name/arguments in several shapes. `toolCalls` is the de-duplicated list.
      const results: { toolCallId: string; name: string; result: string }[] = [];

      for (const toolCall of toolCalls) {
        const id =
          toolCall?.id ?? toolCall?.toolCallId ?? toolCall?.toolCall?.id ?? "";
        // Normalize case: the registered tool is "logActivity" but Vapi's
        // dashboard/strip may capitalize it ("LogActivity").
        const name = readToolName(toolCall).toLowerCase();
        const params = readParams(toolCall);

        let outcome: unknown;
        try {
          if (name === "logactivity") {
            if (!balanceOk) {
              outcome = {
                ok: false,
                readback:
                  "Your PawVoice balance is too low to save activities. Please add credits in the app, then call again. Thank you.",
              };
            } else {
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
            }
          } else if (name === "undolastentry") {
            outcome = await ctx.runMutation(internal.logs.undoLastEntry, {
              callId,
              callerPhone: resolvedPhone ?? undefined,
              authId: resolvedAuthId ?? undefined,
            });
          } else {
            outcome = { ok: false, readback: `Unknown tool ${name}` };
          }
        } catch (e) {
          // Never let a throw abort the whole webhook (which would make Vapi
          // report "No result returned"). Return a graceful, relayable error.
          console.error("vapi tool-calls handler error:", e);
          outcome = {
            ok: false,
            readback:
              "Sorry, something went wrong while saving that. Please try again.",
          };
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
      const startedAt = extractStartedAt(message);
      // `callId`, `customerNumber`, and `authId` are extracted at the top of
      // this handler. Web calls carry identity only via `authId` (no phone),
      // so forward both so recordBilling can attribute the call when no
      // assistant-request session exists.
      console.log(
        "vapi end-of-call-report:",
        JSON.stringify({
          callId,
          customerNumber,
          authId,
          durationSec,
          startedAt,
          endedAt,
          messageKeys: Object.keys(message?.message ?? {}),
          callKeys: Object.keys(
            (message?.message?.call ?? message?.call) ?? {}
          ),
        })
      );
      await ctx.runAction(internal.billing.recordBilling, {
        callId,
        endedAt,
        startedAt,
        callerPhone: customerNumber
          ? normalizePhone(customerNumber) ?? undefined
          : undefined,
        authId: authId ?? undefined,
        ...(durationSec !== undefined ? { durationSec } : {}),
      });
      return new Response("ok", { status: 200 });
    }

    default:
      // status-update, transcript, conversation-update, etc. require no action.
      return new Response("ok", { status: 200 });
  }
});
