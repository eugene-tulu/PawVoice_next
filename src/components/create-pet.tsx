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
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md" style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 16px rgba(233, 116, 81, 0.06)' }}>
      <h2 className="text-lg font-semibold" style={{ fontSize: '1.375rem', fontWeight: '700', color: '#2d2419', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Add your first pet 🐶</h2>

      <input name="name" placeholder="Name" required className="w-full px-3 py-2 border rounded" style={{ padding: '0.875rem 1rem', fontSize: '1rem', border: '1.5px solid #e5dace', borderRadius: '0.625rem', width: '100%', transition: 'border-color 0.2s', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#e97451'} onBlur={(e) => e.target.style.borderColor = '#e5dace'} />
      <input name="breed" placeholder="Breed" required className="w-full px-3 py-2 border rounded" style={{ padding: '0.875rem 1rem', fontSize: '1rem', border: '1.5px solid #e5dace', borderRadius: '0.625rem', width: '100%', transition: 'border-color 0.2s', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#e97451'} onBlur={(e) => e.target.style.borderColor = '#e5dace'} />
      <input name="age" type="number" min="1" placeholder="Age (years)" required className="w-full px-3 py-2 border rounded" style={{ padding: '0.875rem 1rem', fontSize: '1rem', border: '1.5px solid #e5dace', borderRadius: '0.625rem', width: '100%', transition: 'border-color 0.2s', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#e97451'} onBlur={(e) => e.target.style.borderColor = '#e5dace'} />

      <select name="energy" required className="w-full px-3 py-2 border rounded" style={{ padding: '0.875rem 1rem', fontSize: '1rem', border: '1.5px solid #e5dace', borderRadius: '0.625rem', width: '100%', transition: 'border-color 0.2s', outline: 'none', cursor: 'pointer' }} onFocus={(e) => e.target.style.borderColor = '#e97451'} onBlur={(e) => e.target.style.borderColor = '#e5dace'}>
        <option value="">Select energy level</option>
        <option value="low">Low energy</option>
        <option value="medium">Medium energy</option>
        <option value="high">High energy</option>
      </select>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
        style={{ padding: '0.875rem 1.5rem', background: loading ? '#e5dace' : '#e97451', color: 'white', borderRadius: '0.625rem', fontWeight: '600', fontSize: '1rem', transition: 'all 0.2s', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', marginTop: '1rem' }}
        onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#d45a38')}
        onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#e97451')}
      >
        {loading ? "Saving…" : "Save pet"}
      </button>
    </form>
  );
}