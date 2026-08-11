"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function CreatePet({ onSuccess }: { onSuccess?: (id: string) => void }) {
  const create = useMutation(api.pets.create);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const id = await create({
        name: fd.get("name") as string,
        species: fd.get("species") as string,
        breed: (fd.get("breed") as string) || undefined,
        age: fd.get("age") ? Number(fd.get("age")) : undefined,
        notes: (fd.get("notes") as string) || undefined,
      });
      onSuccess?.(id);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-rule rounded-lg p-5 bg-paper-2"
    >
      <h3 className="font-display text-lg font-semibold text-ink mb-4">
        Add a pet
      </h3>
      {error && <p className="text-xs text-muted mb-3">{error}</p>}

      <input
        name="name"
        placeholder="Name *"
        required
        disabled={loading}
        className="w-full field disabled:opacity-60"
      />

      <select
        name="species"
        required
        disabled={loading}
        className="mt-3 w-full px-3 py-2 border border-rule rounded text-sm bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-60 cursor-pointer"
      >
        <option value="">Species *</option>
        <option value="dog">Dog</option>
        <option value="cat">Cat</option>
        <option value="other">Other</option>
      </select>

      <input
        name="breed"
        placeholder="Breed (optional)"
        disabled={loading}
        className="mt-3 w-full field disabled:opacity-60"
      />

      <input
        name="age"
        type="number"
        min="0"
        placeholder="Age in years (optional)"
        disabled={loading}
        className="mt-3 w-full field disabled:opacity-60"
      />

      <textarea
        name="notes"
        placeholder="Notes (optional)"
        rows={2}
        disabled={loading}
        className="mt-3 w-full field disabled:opacity-60"
      />

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary mt-4 w-full"
      >
        {loading ? "Saving…" : "Save pet"}
      </button>
    </form>
  );
}
