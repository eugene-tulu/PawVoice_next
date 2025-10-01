// src/components/voice-coach.tsx
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
    if (typeof window === "undefined") return;

    // ✅ Initialize with just the API key
    const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);

    vapi.on("speech-start", () => setListening(true));
    vapi.on("speech-end", () => setListening(false));
    vapi.on("transcript", (t) => setTranscript(t.transcript));
    (window as any).vapiInstance = vapi;

    return () => {
      vapi.stop();
    };
  }, []);

  useEffect(() => {
    if (transcript.includes("Shall we continue?")) {
      createSession({ petId, transcript, outcome: "success", createdAt: Date.now() });
    }
  }, [transcript, createSession, petId]);

  const toggle = () => {
    const vapi = (window as any).vapiInstance;
    if (!vapi) return;
    
    if (listening) {
      vapi.stop();
    } else {
      // ✅ Pass assistant ID to .start()
      vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!);
    }
  };

  return (
    <div className="mt-6">
      <button
        onClick={toggle}
        className={`w-48 h-16 rounded-full text-white text-lg font-bold shadow-lg ${
          listening ? "bg-red-500 animate-pulse" : "bg-paw hover:bg-paw-dark"
        }`}
      >
        {listening ? "Stop" : "Talk to Coach"}
      </button>
      {transcript && (
        <p className="mt-3 p-3 bg-white rounded border italic text-gray-700 max-w-md">
          {transcript}
        </p>
      )}
    </div>
  );
}