// src/components/create-pet.tsx
"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function CreatePet({ onSuccess }: { onSuccess: (id: string) => void }) {
  const create = useMutation(api.pets.create);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const id = await create({
        name: fd.get("name") as string,
        breed: fd.get("breed") as string,
        age: Number(fd.get("age")),
        energy: fd.get("energy") as string,
      });
      onSuccess(id);
    } catch (error) {
      console.error("Failed to create pet:", error);
      alert("Failed to save pet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
      <h2 className="text-lg font-semibold">Add your first pet 🐶</h2>

      <input name="name" placeholder="Name" required className="w-full px-3 py-2 border rounded" />
      <input name="breed" placeholder="Breed" required className="w-full px-3 py-2 border rounded" />
      <input name="age" type="number" min="1" placeholder="Age (years)" required className="w-full px-3 py-2 border rounded" />

      <select name="energy" required className="w-full px-3 py-2 border rounded">
        <option value="">Select energy level</option>
        <option value="low">Low energy</option>
        <option value="medium">Medium energy</option>
        <option value="high">High energy</option>
      </select>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save pet"}
      </button>
    </form>
  );
}