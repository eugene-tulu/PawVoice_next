"use client";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Vapi from "@vapi-ai/web";

export default function VoiceCoach({ petId }: { petId: string }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const createSession = useMutation(api.sessions.create);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    const assistant = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    if (!key || !assistant) {
      console.error("Missing Vapi env vars");
      return;
    }
    const vapi = new Vapi(key, assistant);
    vapi.on("call-start", () => setListening(true));
    vapi.on("call-end", () => setListening(false));
    vapi.on("message", (msg: { type: string; transcript?: string }) => {
      if (msg.type === "transcript" && msg.transcript) setTranscript(msg.transcript);
    });
    (window as unknown as { vapiInstance?: typeof vapi }).vapiInstance = vapi;
  }, []);

  useEffect(() => {
    if (transcript.toLowerCase().includes("shall we continue?")) {
      createSession({ petId, transcript, outcome: "success", createdAt: Date.now() });
    }
  }, [transcript, createSession, petId]);

  const toggle = () => {
    const vapi = (window as unknown as { vapiInstance?: typeof vapi }).vapiInstance;
    if (!vapi) return;
    listening ? vapi.stop() : vapi.start();
  };

  return (
    <div className="mt-6">
      <button
        onClick={toggle}
        className={`flex items-center justify-center gap-2 w-56 h-16 rounded-full text-white text-xl font-bold shadow-xl transition-all ${
          listening ? "bg-red-600 animate-pulse scale-105" : "bg-paw hover:bg-paw-dark"
        }`}
      >
        {listening ? (
          <>
            <span className="text-2xl">⏹</span> Stop
          </>
        ) : (
          <>
            <span className="text-2xl">🎤</span> Talk to Buddy
          </>
        )}
      </button>
      {transcript && (
        <p className="mt-3 p-3 bg-white rounded border italic text-gray-700 max-w-md">
          {transcript}
        </p>
      )}
    </div>
  );
}