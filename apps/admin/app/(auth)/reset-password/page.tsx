'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type PageState = 'loading' | 'invalid' | 'form' | 'submitting' | 'success';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [tokenInfo, setTokenInfo] = useState<{ email?: string; expiresAt?: string }>({});
  const [invalidReason, setInvalidReason] = useState<string>('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // Password validation
  const passwordValidation = {
    minLength: newPassword.length >= 10,
    matching: newPassword === confirmPassword && confirmPassword.length > 0,
  };

  const isValidPassword = passwordValidation.minLength && passwordValidation.matching;

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setInvalidReason('No reset token provided');
      setPageState('invalid');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/v1/auth/password/validate-token?token=${encodeURIComponent(token)}`
        );
        const data = await response.json();

        if (data.success && data.data.valid) {
          setTokenInfo({
            email: data.data.email,
            expiresAt: data.data.expiresAt,
          });
          setPageState('form');
        } else {
          const reasonMessages: Record<string, string> = {
            expired: 'This password reset link has expired.',
            used: 'This password reset link has already been used.',
            invalid: 'This password reset link is invalid.',
          };
          setInvalidReason(reasonMessages[data.data?.reason] || 'Invalid reset link');
          setPageState('invalid');
        }
      } catch {
        setInvalidReason('Failed to validate reset link. Please try again.');
        setPageState('invalid');
      }
    };

    validateToken();
  }, [token, apiUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPassword || !token) return;

    setPageState('submitting');
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error?.message || 'Failed to reset password');
        setPageState('form');
        return;
      }

      setPageState('success');
    } catch {
      setError('An error occurred. Please try again.');
      setPageState('form');
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-slate-600">Validating your reset link...</p>
      </div>
    );
  }

  // Invalid token state
  if (pageState === 'invalid') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Link Invalid</h2>
        <p className="text-slate-600 mb-6">{invalidReason}</p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Request a new reset link
        </Link>
        <Link
          href="/login"
          className="block mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to login
        </Link>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Password reset!</h2>
        <p className="text-slate-600 mb-6">
          Your password has been successfully reset. You can now log in with your new password.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Go to login
        </button>
      </div>
    );
  }

  // Form state
  return (
    <>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Create new password</h2>
        {tokenInfo.email && (
          <p className="text-slate-600 mt-1">
            For account: <span className="font-medium">{tokenInfo.email}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              autoFocus
              className="w-full px-4 py-2.5 pr-12 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Password requirements */}
        <div className="space-y-1.5 text-sm">
          <div className={`flex items-center gap-2 ${passwordValidation.minLength ? 'text-emerald-600' : 'text-slate-500'}`}>
            {passwordValidation.minLength ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
              </svg>
            )}
            <span>At least 10 characters</span>
          </div>
          <div className={`flex items-center gap-2 ${passwordValidation.matching ? 'text-emerald-600' : 'text-slate-500'}`}>
            {passwordValidation.matching ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
              </svg>
            )}
            <span>Passwords match</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pageState === 'submitting' || !isValidPassword}
          className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {pageState === 'submitting' ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Resetting...
            </>
          ) : (
            'Reset password'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          ← Back to login
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">pawser</h1>
          <p className="text-slate-600 mt-1">Admin Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <Suspense
            fallback={
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-600">Loading...</p>
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Need help?{' '}
          <a href="mailto:support@pawser.app" className="text-blue-600 hover:text-blue-700">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
