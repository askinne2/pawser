'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      // Token is now in an httpOnly cookie — do a hard navigation so the
      // browser sends the fresh cookie in the very next request.
      window.location.href = '/';
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">

        {/* Wordmark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <span className="material-symbols-outlined text-white">pets</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">pawser</h1>
          <p className="text-sm text-on-surface-variant mt-1">Shelter Admin Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-low rounded-2xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <h2 className="text-xl font-black text-on-surface mb-1">Welcome back</h2>
          <p className="text-sm text-on-surface-variant mb-6">Sign in to manage your shelter</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-on-surface mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@shelter.org"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-bold text-on-surface">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-primary hover:opacity-70 transition-opacity"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-on-surface-variant mt-6">
          Need an account?{' '}
          <a
            href="https://getpawser.io/auth/signup"
            className="font-bold text-primary hover:opacity-70 transition-opacity"
          >
            Sign up at getpawser.io
          </a>
        </p>
        <p className="text-center text-xs text-on-surface-variant/50 mt-3">
          Need help?{' '}
          <a href="mailto:support@getpawser.io" className="underline hover:opacity-70 transition-opacity">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
