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

  if (pets === undefined) return <div className="p-8">Loading...</div>;
  if (!pets) return <div className="p-8">Failed to load pets</div>;

  if (pets.length === 0) {
    return (
      <main className="p-8 bg-cream min-h-screen">
        <h1 className="text-3xl font-bold text-paw mb-4">Dashboard 🐾</h1>
        <CreatePet onSuccess={(id) => router.push(`/dashboard?pet=${id}`)} />
      </main>
    );
  }

  const pet = pets[0];
  return (
    <main className="p-8 bg-cream min-h-screen">
      <h1 className="text-3xl font-bold text-paw mb-4">Dashboard 🐾</h1>
      <div className="border rounded p-4 bg-white shadow mb-6 max-w-md">
        <p className="font-bold">{pet.name}</p>
        <p className="text-sm text-gray-600">
          {pet.breed} · {pet.age} y · {pet.energy} energy
        </p>
      </div>
      <VoiceCoach petId={pet._id} />
    </main>
  );
}