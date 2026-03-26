'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'viewer';
  disabled: boolean;
  lastLoginAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy: { id: string; email: string; name: string | null } | null;
}

interface Invitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'viewer';
  message: string | null;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; email: string; name: string | null };
}

const roleColors = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-200 text-slate-600',
};

export default function MembersPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('admin');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/organizations/${orgId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error?.message || 'Failed to fetch members');
        return;
      }

      setMembers(data.data.members);
      setInvitations(data.data.invitations);
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, orgId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/organizations/${orgId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          message: inviteMessage || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('admin');
        setInviteMessage('');
        fetchMembers();
      } else {
        alert(data.error?.message || 'Failed to send invitation');
      }
    } catch (err) {
      alert('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Change this member's role to ${newRole}?`)) return;

    try {
      const token = getToken();
      const response = await fetch(
        `${apiUrl}/api/v1/organizations/${orgId}/members/${userId}/role`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        fetchMembers();
      } else {
        alert(data.error?.message || 'Failed to change role');
      }
    } catch (err) {
      alert('Failed to change role');
    }
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email} from this organization?`)) return;

    try {
      const token = getToken();
      const response = await fetch(
        `${apiUrl}/api/v1/organizations/${orgId}/members/${userId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        fetchMembers();
      } else {
        alert(data.error?.message || 'Failed to remove member');
      }
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Cancel this invitation?')) return;

    try {
      const token = getToken();
      const response = await fetch(
        `${apiUrl}/api/v1/organizations/${orgId}/invitations/${invitationId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        fetchMembers();
      } else {
        alert(data.error?.message || 'Failed to cancel invitation');
      }
    } catch (err) {
      alert('Failed to cancel invitation');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${apiUrl}/api/v1/organizations/${orgId}/invitations/${invitationId}/resend`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Invitation resent!');
        fetchMembers();
      } else {
        alert(data.error?.message || 'Failed to resend invitation');
      }
    } catch (err) {
      alert('Failed to resend invitation');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href={`/organizations/${orgId}`} className="text-blue-600 hover:text-blue-700 text-sm">
          ← Back to organization
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-600 mt-1">
            {members.length} member{members.length !== 1 ? 's' : ''}
            {invitations.length > 0 && `, ${invitations.length} pending invitation${invitations.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Invite Member
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No team members yet. Invite your first team member to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                        {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {member.name || 'No name'}
                          {member.disabled && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                              Disabled
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 ${roleColors[member.role]}`}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemoveMember(member.userId, member.email)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
            <h2 className="font-semibold text-amber-900">
              Pending Invitations ({invitations.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="px-4 py-3 flex items-center justify-between border-l-4 border-dashed border-amber-300"
              >
                <div>
                  <p className="font-medium text-slate-900">{invitation.email}</p>
                  <p className="text-sm text-slate-500">
                    Invited as{' '}
                    <span className={`px-1.5 py-0.5 rounded text-xs ${roleColors[invitation.role]}`}>
                      {invitation.role}
                    </span>
                    {' '}by {invitation.invitedBy.name || invitation.invitedBy.email}
                    <span className="mx-1">·</span>
                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResendInvitation(invitation.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Invite Team Member</h2>
            <form onSubmit={handleInvite}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'viewer')}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                  >
                    <option value="admin">Admin - Can manage animals, settings</option>
                    <option value="viewer">Viewer - Read-only access</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Personal message (optional)
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Add a personal note..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
