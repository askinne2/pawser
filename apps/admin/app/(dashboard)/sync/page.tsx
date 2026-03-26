'use client';

import { useEffect, useState } from 'react';

interface SyncStatus {
  organizationId: string;
  hasCredentials: boolean;
  lastSyncAt: string | null;
  lastCachedAt: string | null;
  cachedAnimalsCount: number;
}

export default function SyncPage() {
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSyncStatuses();
  }, []);

  const fetchSyncStatuses = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1];

      // First get all organizations
      const orgsResponse = await fetch('http://localhost:3002/api/v1/organizations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!orgsResponse.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const orgsData = await orgsResponse.json();
      const organizations = orgsData.organizations || [];

      // Then get sync status for each
      const statuses: Record<string, SyncStatus> = {};
      for (const org of organizations) {
        const statusResponse = await fetch(
          `http://localhost:3002/api/v1/sync/${org.id}/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          statuses[org.id] = statusData.status;
        }
      }

      setSyncStatuses(statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync statuses');
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async (organizationId: string) => {
    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch(`http://localhost:3002/api/v1/sync/${organizationId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }

      // Refresh statuses
      fetchSyncStatuses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to trigger sync');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Sync Management</h1>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Organization ID</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Has Credentials</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Last Sync</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Cached Animals</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(syncStatuses).map(([orgId, status]) => (
              <tr key={orgId}>
                <td style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>{orgId}</td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
                  {status.hasCredentials ? '✓' : '✗'}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
                  {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : 'Never'}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
                  {status.cachedAnimalsCount}
                </td>
                <td style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
                  <button
                    onClick={() => triggerSync(orgId)}
                    disabled={!status.hasCredentials}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: status.hasCredentials ? '#0070f3' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: status.hasCredentials ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Sync Now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {Object.keys(syncStatuses).length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            No organizations found.
          </div>
        )}
      </div>
    </div>
  );
}

