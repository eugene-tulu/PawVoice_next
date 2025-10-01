// src/components/voice-coach.tsx
"use client";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Vapi from "@vapi-ai/web";

// 👇 Declare global type to avoid `any`
declare global {
  interface Window {
    vapiInstance?: Vapi;
  }
}

export default function VoiceCoach({ petId }: { petId: string }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const createSession = useMutation(api.sessions.create);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);
    window.vapiInstance = vapi;

    vapi.on("speech-start", () => setListening(true));
    vapi.on("speech-end", () => setListening(false));
    vapi.on("transcript", (t) => setTranscript(t.transcript));

    return () => {
      vapi.stop();
    };
  }, []);

  useEffect(() => {
    if (transcript.includes("Shall we continue?")) {
      createSession({ 
        petId, 
        transcript, 
        outcome: "success",
        createdAt: Date.now()
      });
    }
  }, [transcript, createSession, petId]);

  const toggle = () => {
    const vapi = window.vapiInstance;
    if (!vapi) return;
    listening ? vapi.stop() : vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!);
  };

  return (
    <div className="mt-6">
      <button
        onClick={toggle}
        className={`w-48 h-16 rounded-full text-white text-lg font-bold shadow-lg ${
          listening ? "bg-red-500 animate-pulse" : "bg-paw hover:bg-paw-dark"
        }`}
        style={{
          width: '14rem',
          height: '4rem',
          borderRadius: '9999px',
          color: 'white',
          fontSize: '1.125rem',
          fontWeight: '700',
          boxShadow: listening ? '0 8px 24px rgba(239, 68, 68, 0.3)' : '0 8px 24px rgba(233, 116, 81, 0.25)',
          background: listening ? '#ef4444' : '#e97451',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => !listening && (e.currentTarget.style.background = '#d45a38')}
        onMouseLeave={(e) => !listening && (e.currentTarget.style.background = '#e97451')}
      >
        {listening ? "Stop" : "Talk to Coach"}
      </button>
      {transcript && (
        <p className="mt-3 p-3 bg-white rounded border italic text-gray-700 max-w-md" style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'white', borderRadius: '0.875rem', border: '1.5px solid #f0e6d6', fontStyle: 'italic', color: '#6b5d4f', lineHeight: '1.7', fontSize: '0.975rem', boxShadow: '0 2px 12px rgba(233, 116, 81, 0.05)' }}>
          {transcript}
        </p>
      )}
    </div>
  );
}