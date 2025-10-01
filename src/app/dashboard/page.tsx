// src/app/dashboard/page.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import CreatePet from "@/components/create-pet";
import VoiceCoach from "@/components/voice-coach";

export default function Dashboard() {
  const pets = useQuery(api.pets.list);
  const router = useRouter();

  if (pets === undefined) return <div className="p-8" style={{ background: '#fdfbf7', minHeight: '100vh', fontSize: '1.125rem', color: '#6b5d4f' }}>Loading...</div>;
  if (!pets) return <div className="p-8" style={{ background: '#fdfbf7', minHeight: '100vh', fontSize: '1.125rem', color: '#ef4444' }}>Failed to load pets</div>;

  if (pets.length === 0) {
    return (
      <main className="p-8 bg-cream min-h-screen" style={{ background: 'linear-gradient(135deg, #fdfbf7 0%, #fff5e6 100%)', padding: '2.5rem 2rem' }}>
        <h1 className="text-3xl font-bold text-paw mb-4" style={{ fontSize: '2.25rem', color: '#e97451', marginBottom: '2rem', letterSpacing: '-0.02em' }}>Dashboard 🐾</h1>
        <CreatePet onSuccess={(id) => router.push(`/dashboard?pet=${id}`)} />
      </main>
    );
  }

  const pet = pets[0];
  return (
    <main className="p-8 bg-cream min-h-screen" style={{ background: 'linear-gradient(135deg, #fdfbf7 0%, #fff5e6 100%)', padding: '2.5rem 2rem' }}>
      <h1 className="text-3xl font-bold text-paw mb-4" style={{ fontSize: '2.25rem', color: '#e97451', marginBottom: '2rem', letterSpacing: '-0.02em' }}>Dashboard 🐾</h1>
      <div className="border rounded p-4 bg-white shadow mb-6 max-w-md" style={{ border: '1.5px solid #f0e6d6', borderRadius: '1rem', padding: '1.5rem', background: 'white', boxShadow: '0 2px 16px rgba(233, 116, 81, 0.06)', marginBottom: '2rem' }}>
        <p className="font-bold" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2d2419', marginBottom: '0.5rem' }}>{pet.name}</p>
        <p className="text-sm text-gray-600" style={{ fontSize: '0.95rem', color: '#6b5d4f', letterSpacing: '0.01em' }}>
          {pet.breed} · {pet.age} y · {pet.energy} energy
        </p>
      </div>
      <VoiceCoach petId={pet._id} />
    </main>
  );
}