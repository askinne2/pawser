'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export interface OrgUser {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  memberships: Array<{
    orgId: string;
    orgSlug: string;
    orgName: string;
    role: string;
  }>;
}

export interface OrgContext {
  /** The authenticated user */
  user: OrgUser | null;
  /** The active organization ID (derived from first membership for shelter users) */
  orgId: string | null;
  /** Public URL slug — required for widget + public animals API (?orgSlug=) */
  orgSlug: string | null;
  /** The active organization name */
  orgName: string | null;
  /** The user's role within the active org */
  orgRole: string | null;
  /** Loading state for initial auth check */
  loading: boolean;
  /** Error state (e.g. session expired) */
  error: string | null;
  /** Re-fetch the current user (e.g. after profile update) */
  refresh: () => Promise<void>;
  /** Sign out — clears cookies and redirects to /login */
  signOut: () => Promise<void>;
}

const OrgContextValue = createContext<OrgContext>({
  user: null,
  orgId: null,
  orgSlug: null,
  orgName: null,
  orgRole: null,
  loading: true,
  error: null,
  refresh: async () => {},
  signOut: async () => {},
});

export function useOrg(): OrgContext {
  return useContext(OrgContextValue);
}

interface OrgProviderProps {
  children: ReactNode;
}

export function OrgProvider({ children }: OrgProviderProps) {
  const [user, setUser] = useState<OrgUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/auth/me', { credentials: 'same-origin' });

      if (res.status === 401) {
        // Session expired or not logged in
        setUser(null);
        setError('session_expired');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message || 'Failed to load user');
        return;
      }

      const data = await res.json();
      setUser(data.data?.user ?? null);
      setError(null);
    } catch {
      setError('Network error — please check your connection');
    }
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [fetchMe]);

  // Redirect to login on session expiry
  useEffect(() => {
    if (error === 'session_expired' && !loading) {
      window.location.href = '/login';
    }
  }, [error, loading]);

  const refresh = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/login';
  }, []);

  // Derive org context from the user's first membership
  const activeMembership = user?.memberships?.[0] ?? null;
  const orgId = activeMembership?.orgId ?? null;
  const orgSlug = activeMembership?.orgSlug ?? null;
  const orgName = activeMembership?.orgName ?? null;
  const orgRole = activeMembership?.role ?? null;

  return (
    <OrgContextValue.Provider
      value={{ user, orgId, orgSlug, orgName, orgRole, loading, error, refresh, signOut }}
    >
      {children}
    </OrgContextValue.Provider>
  );
}
