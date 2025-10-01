// src/app/register/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0],
      callbackURL: "/dashboard",
    });
    if (error) setMsg(`❌ ${error.message}`);
    else setMsg("✅ Account created – redirecting…");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fdfbf7 0%, #fff5e6 100%)' }}>
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md" style={{ background: 'white', padding: '2.5rem', borderRadius: '1rem', boxShadow: '0 4px 24px rgba(233, 116, 81, 0.08)' }}>
        <h1 className="text-2xl font-bold text-center" style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#2d2419', letterSpacing: '-0.02em' }}>🐾 PawVoice Pro</h1>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-2 border rounded"
          style={{ padding: '0.875rem 1rem', fontSize: '1rem', border: '1.5px solid #e5dace', borderRadius: '0.625rem', transition: 'all 0.2s', outline: 'none' }}
          onFocus={(e) => e.target.style.borderColor = '#e97451'}
          onBlur={(e) => e.target.style.borderColor = '#e5dace'}
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 8)"
          className="w-full px-4 py-2 border rounded"
          style={{ padding: '0.875rem 1rem', fontSize: '1rem', border: '1.5px solid #e5dace', borderRadius: '0.625rem', transition: 'all 0.2s', outline: 'none' }}
          onFocus={(e) => e.target.style.borderColor = '#e97451'}
          onBlur={(e) => e.target.style.borderColor = '#e5dace'}
          required
        />

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          style={{ background: '#e97451', padding: '0.875rem', borderRadius: '0.625rem', fontWeight: '600', fontSize: '1rem', transition: 'all 0.2s', cursor: 'pointer', border: 'none', marginTop: '1.5rem' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#d45a38'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#e97451'}
        >
          Create account
        </button>

        {msg && <p className="text-center text-sm text-gray-600" style={{ fontSize: '0.9rem', marginTop: '1rem', color: msg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{msg}</p>}

        <p className="text-center text-sm" style={{ fontSize: '0.9rem', marginTop: '1.5rem', color: '#6b5d4f' }}>
          Already have an account?{" "}
          <Link href="/login" className="underline text-blue-600" style={{ color: '#e97451', textDecoration: 'none', fontWeight: '600', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}