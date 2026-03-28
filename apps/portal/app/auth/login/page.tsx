'use client';

import { useState } from 'react';
import Link from 'next/link';

interface LoginFormState {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' });

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
            </div>
            <span className="text-xl font-black text-primary">Pawser</span>
          </Link>
          <h1 className="text-3xl font-bold text-on-surface">Welcome back</h1>
          <p className="text-on-surface-variant mt-2">Sign in to your shelter dashboard</p>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <form className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Email</label>
              <input
                type="email"
                placeholder="you@shelter.org"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-on-surface"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-on-surface"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
            >
              Sign in
            </button>
          </form>
          <p className="text-center text-sm text-on-surface-variant mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary font-bold hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
