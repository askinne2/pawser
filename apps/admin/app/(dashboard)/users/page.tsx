'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  disabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  orgCount: number;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

type SortOption = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc' | 'email_asc' | 'login_desc';

const sortLabels: Record<SortOption, string> = {
  created_desc: 'Newest First',
  created_asc: 'Oldest First',
  name_asc: 'Name A-Z',
  name_desc: 'Name Z-A',
  email_asc: 'Email A-Z',
  login_desc: 'Last Login',
};

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state from URL
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const isSuperAdmin = searchParams.get('isSuperAdmin') || '';
  const hasOrg = searchParams.get('hasOrg') || '';
  const sort = (searchParams.get('sort') as SortOption) || 'created_desc';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(search);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // Build query string from current filters
  const buildQueryString = useCallback((overrides: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams();
    const values = {
      search: overrides.search !== undefined ? overrides.search : search,
      status: overrides.status !== undefined ? overrides.status : status,
      isSuperAdmin: overrides.isSuperAdmin !== undefined ? overrides.isSuperAdmin : isSuperAdmin,
      hasOrg: overrides.hasOrg !== undefined ? overrides.hasOrg : hasOrg,
      sort: overrides.sort !== undefined ? overrides.sort : sort,
      page: overrides.page !== undefined ? overrides.page : page,
    };

    Object.entries(values).forEach(([key, value]) => {
      if (value && value !== '' && value !== 1) {
        params.set(key, String(value));
      }
    });

    return params.toString();
  }, [search, status, isSuperAdmin, hasOrg, sort, page]);

  // Update URL with new filters
  const updateFilters = useCallback((updates: Record<string, string | number | undefined>) => {
    const queryString = buildQueryString({ ...updates, page: updates.page ?? 1 });
    router.push(`/users${queryString ? `?${queryString}` : ''}`);
  }, [buildQueryString, router]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1];

      const queryString = buildQueryString();
      const response = await fetch(`${apiUrl}/api/v1/users?${queryString}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 403) {
          setError('You do not have permission to view users. Super admin access required.');
        } else {
          setError(data.error?.message || 'Failed to fetch users');
        }
        setUsers([]);
        return;
      }

      setUsers(data.data.users);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      setError('Failed to connect to the server');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, buildQueryString]);

  // Fetch on mount and when URL changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateFilters({ search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, updateFilters]);

  // Toggle user status
  const handleToggleStatus = async (userId: string, currentlyDisabled: boolean) => {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];

    try {
      const response = await fetch(`${apiUrl}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ disabled: !currentlyDisabled }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to toggle user status:', err);
    }
  };

  // Impersonate user
  const handleImpersonate = async (userId: string) => {
    if (!confirm('You will be logged in as this user. Your actions will be logged. Continue?')) {
      return;
    }

    setImpersonatingUserId(userId);
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];

    try {
      const response = await fetch(`${apiUrl}/api/v1/users/${userId}/impersonate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store impersonation token and redirect
        document.cookie = `token=${data.data.token}; path=/; max-age=900`; // 15 minutes
        document.cookie = `impersonating=true; path=/; max-age=900`;
        router.push(data.data.redirectUrl);
      } else {
        alert(data.error?.message || 'Failed to impersonate user');
      }
    } catch (err) {
      alert('Failed to impersonate user');
    } finally {
      setImpersonatingUserId(null);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-600 mt-1">Manage all platform users</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
            />
          </div>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm bg-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>

          {/* Super Admin filter */}
          <select
            value={isSuperAdmin}
            onChange={(e) => updateFilters({ isSuperAdmin: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm bg-white"
          >
            <option value="">All Roles</option>
            <option value="true">Super Admin</option>
            <option value="false">Regular User</option>
          </select>

          {/* Has Org filter */}
          <select
            value={hasOrg}
            onChange={(e) => updateFilters({ hasOrg: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm bg-white"
          >
            <option value="">All Users</option>
            <option value="true">Has Org</option>
            <option value="false">Orphan Accounts</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm bg-white"
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Active filters display */}
        {(search || status || isSuperAdmin || hasOrg) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200">
            {search && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                Search: {search}
                <button
                  onClick={() => {
                    setSearchInput('');
                    updateFilters({ search: '' });
                  }}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            {status && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                Status: {status}
                <button onClick={() => updateFilters({ status: '' })} className="hover:text-blue-900">
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchInput('');
                router.push('/users');
              }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-8 h-8 mx-auto mb-4 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="mb-2">No users found</p>
            {(search || status || isSuperAdmin || hasOrg) && (
              <button
                onClick={() => {
                  setSearchInput('');
                  router.push('/users');
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Orgs
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/users/${user.id}`} className="group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 group-hover:text-blue-600">
                              {user.name || 'No name'}
                            </p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.disabled ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            Disabled
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        )}
                        {user.isSuperAdmin && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            Super Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.orgCount}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {formatRelativeTime(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(user.id, user.disabled)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            user.disabled
                              ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200'
                              : 'text-red-700 bg-red-100 hover:bg-red-200'
                          }`}
                        >
                          {user.disabled ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          onClick={() => handleImpersonate(user.id)}
                          disabled={user.disabled || impersonatingUserId === user.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {impersonatingUserId === user.id ? 'Loading...' : 'Impersonate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total} users
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateFilters({ page: page - 1 })}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => updateFilters({ page: page + 1 })}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
