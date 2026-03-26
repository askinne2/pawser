'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  disabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberships: Array<{
    id: string;
    role: string;
    acceptedAt: string | null;
    createdAt: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
  }>;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 404) {
          setError('User not found');
        } else if (response.status === 403) {
          setError('You do not have permission to view this user');
        } else {
          setError(data.error?.message || 'Failed to fetch user');
        }
        return;
      }

      setUser(data.data.user);
      setAuditLogs(data.data.auditLogs);
      setEditedName(data.data.user.name || '');
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editedName }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser({ ...user, name: editedName });
        setIsEditing(false);
      } else {
        alert(data.error?.message || 'Failed to update user');
      }
    } catch (err) {
      alert('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSuperAdmin = async () => {
    if (!user) return;
    
    const confirmMsg = user.isSuperAdmin
      ? 'Remove super admin privileges from this user?'
      : 'Grant super admin privileges to this user? They will have access to all platform data.';
    
    if (!confirm(confirmMsg)) return;

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isSuperAdmin: !user.isSuperAdmin }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser({ ...user, isSuperAdmin: !user.isSuperAdmin });
      } else {
        alert(data.error?.message || 'Failed to update user');
      }
    } catch (err) {
      alert('Failed to update user');
    }
  };

  const handleToggleDisabled = async () => {
    if (!user) return;
    
    const confirmMsg = user.disabled
      ? 'Enable this user account? They will be able to log in again.'
      : 'Disable this user account? They will be logged out and unable to access the platform.';
    
    if (!confirm(confirmMsg)) return;

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ disabled: !user.disabled }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser({ ...user, disabled: !user.disabled });
      } else {
        alert(data.error?.message || 'Failed to update user');
      }
    } catch (err) {
      alert('Failed to update user');
    }
  };

  const handleRemoveMembership = async (orgId: string, orgName: string) => {
    if (!confirm(`Remove this user from ${orgName}?`)) return;

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/users/${userId}/memberships/${orgId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        fetchUser();
      } else {
        alert(data.error?.message || 'Failed to remove membership');
      }
    } catch (err) {
      alert('Failed to remove membership');
    }
  };

  const handleImpersonate = async () => {
    if (!user) return;
    if (!confirm('You will be logged in as this user. Your actions will be logged. Continue?')) return;

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/users/${userId}/impersonate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        document.cookie = `token=${data.data.token}; path=/; max-age=900`;
        document.cookie = `impersonating=true; path=/; max-age=900`;
        router.push(data.data.redirectUrl);
      } else {
        alert(data.error?.message || 'Failed to impersonate user');
      }
    } catch (err) {
      alert('Failed to impersonate user');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const formatActionLabel = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 mb-4">{error || 'User not found'}</p>
          <Link href="/users" className="text-blue-600 hover:text-blue-700">
            ← Back to users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/users" className="text-blue-600 hover:text-blue-700 text-sm">
          ← Back to users
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-2xl font-medium">
              {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-bold text-slate-900 border border-slate-300 rounded px-2 py-1"
                    autoFocus
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-slate-900">{user.name || 'No name'}</h1>
                )}
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-slate-600">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
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
            </div>
          </div>

          {/* Actions dropdown */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setEditedName(user.name || '');
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => copyToClipboard(user.id)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  Copy ID
                </button>
                <button
                  onClick={handleImpersonate}
                  disabled={user.disabled}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                >
                  Impersonate
                </button>
                <button
                  onClick={handleToggleDisabled}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                    user.disabled
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {user.disabled ? 'Enable' : 'Disable'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-slate-500">Email</dt>
                <dd className="text-slate-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Super Admin</dt>
                <dd className="flex items-center gap-2">
                  <button
                    onClick={handleToggleSuperAdmin}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      user.isSuperAdmin ? 'bg-purple-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        user.isSuperAdmin ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-slate-600">
                    {user.isSuperAdmin ? 'Yes' : 'No'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Status</dt>
                <dd className="text-slate-900">{user.disabled ? 'Disabled' : 'Active'}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Created</dt>
                <dd className="text-slate-900">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Last Login</dt>
                <dd className="text-slate-900">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : 'Never'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Memberships & Audit Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Memberships */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Organization Memberships ({user.memberships.length})
            </h2>
            {user.memberships.length === 0 ? (
              <p className="text-slate-500 text-sm">No organization memberships</p>
            ) : (
              <div className="space-y-3">
                {user.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <Link
                        href={`/organizations/${membership.organization.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                      >
                        {membership.organization.name}
                      </Link>
                      <p className="text-sm text-slate-500">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            membership.role === 'owner'
                              ? 'bg-purple-100 text-purple-700'
                              : membership.role === 'admin'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {membership.role}
                        </span>
                        <span className="ml-2">
                          Joined {new Date(membership.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleRemoveMembership(membership.organization.id, membership.organization.name)
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Trail */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
            {auditLogs.length === 0 ? (
              <p className="text-slate-500 text-sm">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{formatActionLabel(log.action)}</span>
                        {log.actorUser && log.actorUser.id !== user.id && (
                          <span className="text-slate-500"> by {log.actorUser.name || log.actorUser.email}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
