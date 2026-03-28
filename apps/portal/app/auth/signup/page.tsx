'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SignupFormState {
  shelterName: string;
  email: string;
  password: string;
}

interface FieldErrors {
  shelterName?: string;
  email?: string;
  password?: string;
}

function validate(form: SignupFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.shelterName.trim()) errors.shelterName = 'Shelter name is required';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address';
  if (!form.password) errors.password = 'Password is required';
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  return errors;
}

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://app.getpawser.io';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.getpawser.io';

export default function SignupPage() {
  const [form, setForm] = useState<SignupFormState>({ shelterName: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.shelterName.trim(),
          organizationName: form.shelterName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error?.message || data.message || 'Sign up failed. Please try again.');
        setLoading(false);
        return;
      }

      // Registration succeeded — redirect to admin dashboard
      setDone(true);
      window.location.href = `${ADMIN_URL}?registered=1`;
    } catch {
      setServerError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const set = (field: keyof SignupFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
    if (fieldErrors[field]) setFieldErrors({ ...fieldErrors, [field]: undefined });
  };

  if (done) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-emerald-600">check_circle</span>
          </div>
          <h2 className="text-2xl font-black text-on-surface mb-2">Account created!</h2>
          <p className="text-on-surface-variant text-sm">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">pets</span>
            </div>
            <span className="text-xl font-black text-primary">Pawser</span>
          </Link>
          <h1 className="text-3xl font-black text-on-surface">Create your account</h1>
          <p className="text-on-surface-variant mt-2 text-sm">Free to start — no credit card required</p>
        </div>

        {/* Form card */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* Shelter name */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-on-surface">Shelter name</label>
              <input
                type="text"
                placeholder="Riverside Animal Rescue"
                value={form.shelterName}
                onChange={set('shelterName')}
                required
                className={`w-full bg-surface-container-highest rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 transition-all text-on-surface placeholder:text-on-surface-variant/50 ${
                  fieldErrors.shelterName ? 'ring-2 ring-rose-400' : 'focus:ring-primary/30'
                }`}
              />
              {fieldErrors.shelterName && (
                <p className="text-xs text-rose-600 pl-1">{fieldErrors.shelterName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-on-surface">Email</label>
              <input
                type="email"
                placeholder="you@shelter.org"
                value={form.email}
                onChange={set('email')}
                required
                className={`w-full bg-surface-container-highest rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 transition-all text-on-surface placeholder:text-on-surface-variant/50 ${
                  fieldErrors.email ? 'ring-2 ring-rose-400' : 'focus:ring-primary/30'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-rose-600 pl-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-on-surface">Password</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
                className={`w-full bg-surface-container-highest rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 transition-all text-on-surface placeholder:text-on-surface-variant/50 ${
                  fieldErrors.password ? 'ring-2 ring-rose-400' : 'focus:ring-primary/30'
                }`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-rose-600 pl-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">
                <span className="material-symbols-outlined text-sm">error</span>
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>

            <p className="text-xs text-on-surface-variant/60 text-center">
              By signing up you agree to our{' '}
              <a href="/terms" className="underline hover:opacity-70">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="underline hover:opacity-70">Privacy Policy</a>.
            </p>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-bold hover:opacity-70 transition-opacity">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
