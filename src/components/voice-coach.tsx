// src/components/voice-coach.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Vapi from "@vapi-ai/web";

declare global {
  interface Window {
    vapiInstance?: Vapi;
  }
}

export default function VoiceCoach({ petId }: { petId: string }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const sessionStartTime = useRef<number | null>(null);
  const autoStopTimer = useRef<NodeJS.Timeout | null>(null);

  const userBalance = useQuery(api.users.getBalance);
  const deductMinutes = useMutation(api.users.deductMinutes);
  const createSession = useMutation(api.sessions.create);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);
    window.vapiInstance = vapi;

    vapi.on("speech-start", () => {
      setListening(true);
      sessionStartTime.current = Date.now();
    });
    vapi.on("speech-end", () => {
      setListening(false);
      if (autoStopTimer.current) {
        clearTimeout(autoStopTimer.current);
        autoStopTimer.current = null;
      }
    });
    vapi.on("transcript", (t) => setTranscript(t.transcript));

    return () => {
      vapi.stop();
      if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
    };
  }, []);

  const endSession = () => {
    if (!sessionStartTime.current) return;
    const durationMinutes = (Date.now() - sessionStartTime.current) / 60000;
    deductMinutes({ minutesUsed: durationMinutes });
    sessionStartTime.current = null;
    setListening(false);
  };

  useEffect(() => {
    if (transcript.includes("Shall we continue?") && sessionStartTime.current) {
      createSession({ 
        petId, 
        transcript, 
        outcome: "success",
        createdAt: Date.now()
      });
      endSession();
    }
  }, [transcript, createSession, petId]);

  const toggle = () => {
    const vapi = window.vapiInstance;
    if (!vapi) return;

    if (listening) {
      vapi.stop();
      endSession();
    } else {
      const minutesLeft = userBalance?.minutesRemaining || 0;
      if (minutesLeft <= 0) {
        alert("Out of minutes! Top up to keep training 🐶");
        return;
      }

      vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!);
      
      const maxDuration = Math.min(minutesLeft, 5) * 60 * 1000;
      autoStopTimer.current = setTimeout(() => {
        vapi.stop();
        endSession();
      }, maxDuration);
    }
  };

  return (
    <div className="mt-6">
      <div className="mb-3 text-right text-sm text-gray-600">
        Minutes left: {userBalance ? userBalance.minutesRemaining.toFixed(1) : '...'}
      </div>
      <button
        onClick={toggle}
        disabled={userBalance === undefined}
        className={`w-48 h-16 rounded-full text-white text-lg font-bold shadow-lg ${
          listening 
            ? "bg-red-500 animate-pulse" 
            : "bg-paw hover:bg-paw-dark"
        } ${userBalance === undefined ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{
          width: '14rem',
          height: '4rem',
          borderRadius: '9999px',
          color: 'white',
          fontSize: '1.125rem',
          fontWeight: '700',
          boxShadow: listening 
            ? '0 8px 24px rgba(239, 68, 68, 0.3)' 
            : '0 8px 24px rgba(233, 116, 81, 0.25)',
          background: listening ? '#ef4444' : '#e97451',
          border: 'none',
          cursor: userBalance === undefined ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => {
          if (!listening && userBalance !== undefined) {
            e.currentTarget.style.background = '#d45a38';
          }
        }}
        onMouseLeave={(e) => {
          if (!listening && userBalance !== undefined) {
            e.currentTarget.style.background = '#e97451';
          }
        }}
      >
        {listening ? "Stop" : "Talk to Coach"}
      </button>
      {transcript && (
        <p className="mt-3 p-3 bg-white rounded border italic text-gray-700 max-w-md" style={{ 
          marginTop: '1.5rem', 
          padding: '1.25rem', 
          background: 'white', 
          borderRadius: '0.875rem', 
          border: '1.5px solid #f0e6d6', 
          fontStyle: 'italic', 
          color: '#6b5d4f', 
          lineHeight: '1.7', 
          fontSize: '0.975rem', 
          boxShadow: '0 2px 12px rgba(233, 116, 81, 0.05)' 
        }}>
          {transcript}
        </p>
      )}
    </div>
  );
}