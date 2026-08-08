// convex/vapiSetup.ts
// One-time wiring that provisions the Vapi assistant + function tools that
// implement the PawVoice voice flow. Run with:
//
//   npx convex run vapi:setupAssistant
//
// Required env (set via `npx convex env set`):
//   VAPI_API_KEY, VAPI_WEBHOOK_SECRET, VAPI_ASSISTANT_ID (optional),
//   VAPI_PHONE_NUMBER_ID (optional), NEXT_PUBLIC_CONVEX_SITE_URL
import { action } from "./_generated/server";

const VAPI_API_KEY = process.env.VAPI_API_KEY ?? "";
const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET ?? "";
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID ?? "";
const PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID ?? "";
const SITE = (process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "").replace(/\/+$/, "");
const WEBHOOK_URL = `${SITE}/vapi/webhook`;

interface VapiAssistant {
  id?: string;
  name?: string;
  assistantId?: string;
}

interface VapiListResponse {
  data?: VapiAssistant[];
}

export const ASSISTANT_FIRST_MESSAGE =
  "Hi, this is PawVoice. Tell me which pet you're logging for and what they did — for example, 'Buster had a 30 minute walk and seemed energetic.'";

export const ASSISTANT_SYSTEM_PROMPT = `You are PawVoice, a friendly voice assistant that turns spoken pet-sitting visits into structured activity logs. You only log activities — you do not schedule, bill, or give medical advice.

Operate as follows:
1. Greet briefly and ask which pet they are logging for and what happened (activity + duration + any notes).
2. When you have enough detail, call the logActivity tool with: pet (the name the caller said), activity_type (one of: walk, run, play, feeding, medication, grooming, bathroom, poop, pee, vet, training, cuddle, other), duration (a phrase like "30 minutes", "half an hour", or "15 mins"), and verbatim_notes (the caller's exact words, word for word, including behavioral observations — do NOT summarize).
3. After logActivity returns, speak its readback to the caller exactly as returned, then say: "Is that correct?"
4. If the caller confirms (yes/correct/right): ask "Anyone else?" and, if they say yes, loop to step 2 for the next pet.
5. If the caller corrects you or says something was different (e.g. "No, that was Max, not Buster"): call undoLastEntry to discard the previous entry, then start fresh with the correct pet and details.
6. You must NEVER classify severity or diagnose. Transcribe behavioral notes verbatim — e.g. "caller noted: seemed sluggish." Never infer a condition. If asked for medical advice, say: "I'm not a vet — contact your veterinarian for health concerns."
7. Never end the call yourself; wait for the caller to hang up after they say no more.

Medical-boundary reminder to surface in any summary: This is an activity log, not medical advice.`;

const LOG_ACTIVITY_TOOL = {
  type: "function",
  function: {
    name: "logActivity",
    description:
      "Record one structured pet activity log entry extracted from the caller. Call ONLY after the caller has given pet, activity, duration, and notes.",
    parameters: {
      type: "object",
      properties: {
        pet: {
          type: "string",
          description: "The pet's name exactly as the caller said it.",
        },
        activity_type: {
          type: "string",
          enum: [
            "walk", "run", "play", "feeding", "medication", "grooming",
            "bathroom", "poop", "pee", "vet", "training", "cuddle", "other",
          ],
          description: "The category of activity.",
        },
        duration: {
          type: "string",
          description:
            "How long the activity lasted, e.g. '30 minutes', 'half an hour', '15 mins'.",
        },
        verbatim_notes: {
          type: "string",
          description:
            "The caller's exact words describing the visit, behaviors, and observations. Transcribe verbatim — do not summarize or infer severity.",
        },
      },
      required: ["pet", "activity_type", "duration", "verbatim_notes"],
      additionalProperties: false,
    },
    strict: true,
  },
};

const UNDO_LAST_TOOL = {
  type: "function",
  function: {
    name: "undoLastEntry",
    description:
      "Discard the most recently logged entry for this caller in the current call, so a corrected entry can be logged instead. Call this when the caller corrects you before re-logging.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    strict: true,
  },
};

const ASSISTANT_PAYLOAD = {
  name: "PawVoice Activity Logger",
  firstMessage: ASSISTANT_FIRST_MESSAGE,
  model: {
    provider: "openai",
    model: "gpt-4o",
    messages: [{ role: "system", content: ASSISTANT_SYSTEM_PROMPT }],
    tools: [LOG_ACTIVITY_TOOL, UNDO_LAST_TOOL],
  },
  transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
  voice: {
    provider: "11labs",
    voiceId: process.env.VAPI_VOICE_ID ?? "21m00Tcsa6VES8Plo5x8",
  },
  server: {
    url: WEBHOOK_URL,
    headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
  },
};

async function vapiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
  const body = await res.text();
  let json: unknown = body;
  try { json = JSON.parse(body); } catch {}
  if (!res.ok)   throw new Error(`Vapi ${res.status}: ${JSON.stringify(json)}`);
  return json as Record<string, unknown>;
}

export const setupAssistant = action({
  args: {},
  handler: async () => {
    const notes: string[] = [];
    if (!VAPI_API_KEY)
      notes.push("VAPI_API_KEY is not set — assistant not created.");
    if (!WEBHOOK_SECRET)
      notes.push("VAPI_WEBHOOK_SECRET is not set.");
    if (!WEBHOOK_URL || !SITE)
      notes.push("NEXT_PUBLIC_CONVEX_SITE_URL is not set — cannot build webhook URL.");
    if (notes.length) return { assistantId: ASSISTANT_ID, webhookUrl: WEBHOOK_URL, tools: ["logActivity", "undoLastEntry"], notes };

    let assistantId = ASSISTANT_ID;
    if (assistantId) {
      await vapiFetch(`/assistant/${assistantId}`, {
        method: "PATCH",
        body: JSON.stringify(ASSISTANT_PAYLOAD),
      });
      notes.push(`Updated existing assistant ${assistantId}.`);
    } else {
      // Try to find an existing assistant by name to avoid duplicates.
      const list = (await vapiFetch("/assistant?limit=50")) as VapiListResponse;
      const existing = (list?.data ?? []).find((a) => a.name === ASSISTANT_PAYLOAD.name);
      if (existing) {
        assistantId = existing.id ?? "";
        await vapiFetch(`/assistant/${assistantId}`, {
          method: "PATCH",
          body: JSON.stringify(ASSISTANT_PAYLOAD),
        });
        notes.push(`Updated existing assistant ${assistantId}.`);
      } else {
        const created = (await vapiFetch("/assistant", {
          method: "POST",
          body: JSON.stringify(ASSISTANT_PAYLOAD),
        })) as VapiAssistant;
        assistantId = created?.id ?? created?.assistantId ?? "";
        notes.push(`Created assistant ${assistantId}.`);
      }
    }

    // Point the inbound phone number at this assistant + webhook so the
    // assistant-request low-balance / registration check runs.
    if (PHONE_NUMBER_ID) {
      try {
        await vapiFetch(`/phone-number/${PHONE_NUMBER_ID}`, {
          method: "PATCH",
          body: JSON.stringify({
            assistantId: null,
            server: {
              url: WEBHOOK_URL,
              headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
            },
          }),
        });
        notes.push(`Configured phone-number ${PHONE_NUMBER_ID} (cleared assistantId, set server).`);
      } catch (e: unknown) {
        notes.push(
          `Phone-number update failed (${e instanceof Error ? e.message : String(e)}). Manually set its Server URL to ${WEBHOOK_URL} with Authorization: Bearer ${WEBHOOK_SECRET} and remove any Assistant assignment so assistant-request fires.`
        );
      }
    } else {
      notes.push(
        "VAPI_PHONE_NUMBER_ID is not set. Assign an assistant-less number whose Server URL is " +
          `${WEBHOOK_URL} (Authorization: Bearer <VAPI_WEBHOOK_SECRET>) in the Vapi dashboard.`
      );
    }

    return {
      assistantId,
      webhookUrl: WEBHOOK_URL,
      tools: ["logActivity", "undoLastEntry"],
      notes,
    };
  },
});
