'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Organization {
  id: string;
  slug: string;
  name: string;
  status: string;
  timezone: string;
  logoUrl: string | null;
  primaryColor: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    animals: number;
    memberships: number;
  };
}

interface Subscription {
  id: string;
  status: string;
  plan: {
    code: string;
    name: string;
    priceCents: number;
  };
  trialEnd: string | null;
  currentPeriodEnd: string | null;
}

interface SyncRun {
  id: string;
  status: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  itemsFetched: number;
  itemsUpserted: number;
  itemsDeleted: number;
  error: string | null;
}

interface IntegrationCredential {
  id: string;
  provider: string;
  accountLabel: string | null;
  status: string;
  lastValidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DataSource {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
}

type TabId = 'overview' | 'billing' | 'sync' | 'integration';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const activeTab = (searchParams.get('tab') as TabId) || 'overview';

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; animalsFound?: number } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];
  };

  useEffect(() => {
    if (id) {
      fetchOrganization();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'billing' && organization) {
      fetchSubscription();
    } else if (activeTab === 'sync' && organization) {
      fetchSyncRuns();
    } else if (activeTab === 'integration' && organization) {
      fetchCredentials();
    }
  }, [activeTab, organization?.id]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/v1/organizations/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!response.ok) throw new Error('Failed to fetch organization');
      const data = await response.json();
      setOrganization(data.organization);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/billing/subscription?orgId=${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    }
  };

  const fetchSyncRuns = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/sync/${id}/history?limit=10`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSyncRuns(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sync runs:', err);
    }
  };

  const fetchCredentials = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/organizations/${id}/credentials`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials || []);
        setDataSources(data.dataSources || []);
      }
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }
    
    setActionLoading(true);
    setTestResult(null);
    setSaveResult(null);
    
    try {
      const response = await fetch(`${apiUrl}/api/v1/organizations/${id}/credentials/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setTestResult({
          success: true,
          message: `Connection successful! Found ${data.animalsFound} animals.`,
          animalsFound: data.animalsFound,
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Connection failed',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to test connection',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!apiKey.trim()) {
      setSaveResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setActionLoading(true);
    setSaveResult(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/organizations/${id}/credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          apiKey,
          provider: 'shelterluv',
          accountLabel: organization?.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveResult({
          success: true,
          message: data.message || 'Credentials saved successfully!',
        });
        setApiKey('');
        await fetchCredentials();
      } else {
        setSaveResult({
          success: false,
          message: data.message || 'Failed to save credentials',
        });
      }
    } catch (err) {
      setSaveResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to save credentials',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!organization) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/organizations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      await fetchOrganization();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/sync/${id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to trigger sync');
      await fetchSyncRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger sync');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      active: { bg: '#dcfce7', text: '#166534' },
      trial: { bg: '#dbeafe', text: '#1e40af' },
      suspended: { bg: '#fef3c7', text: '#92400e' },
      disabled: { bg: '#fee2e2', text: '#991b1b' },
      running: { bg: '#dbeafe', text: '#1e40af' },
      completed: { bg: '#dcfce7', text: '#166534' },
      failed: { bg: '#fee2e2', text: '#991b1b' },
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return (
      <span
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '500',
          backgroundColor: color.bg,
          color: color.text,
        }}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading organization...</p>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>
          {error || 'Organization not found'}
        </div>
        <Link
          href="/organizations"
          style={{ display: 'inline-block', marginTop: '1rem', color: '#3b82f6' }}
        >
          ← Back to Organizations
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/organizations"
          style={{ color: '#6b7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
        >
          ← Back to Organizations
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
              {organization.name}
            </h1>
            <p style={{ color: '#6b7280' }}>
              {organization.slug}.pawser.app
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {getStatusBadge(organization.status)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '2rem' }}>
        <nav style={{ display: 'flex', gap: '2rem' }}>
          {(['overview', 'integration', 'billing', 'sync'] as TabId[]).map((tab) => (
            <Link
              key={tab}
              href={`/organizations/${id}?tab=${tab}`}
              style={{
                padding: '1rem 0',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                textDecoration: 'none',
                fontWeight: activeTab === tab ? '600' : '400',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Organization Details */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Details</h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem' }}>
              <dt style={{ color: '#6b7280' }}>ID</dt>
              <dd style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{organization.id}</dd>

              <dt style={{ color: '#6b7280' }}>Slug</dt>
              <dd>{organization.slug}</dd>

              <dt style={{ color: '#6b7280' }}>Timezone</dt>
              <dd>{organization.timezone}</dd>

              <dt style={{ color: '#6b7280' }}>Created</dt>
              <dd>{formatDate(organization.createdAt)}</dd>

              <dt style={{ color: '#6b7280' }}>Updated</dt>
              <dd>{formatDate(organization.updatedAt)}</dd>
            </dl>
          </div>

          {/* Stats */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Stats</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                  {organization._count?.animals || 0}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Animals</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                  {organization._count?.memberships || 0}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Members</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', gridColumn: 'span 2' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Quick Actions</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {organization.status === 'active' && (
                <button
                  onClick={() => handleStatusChange('suspended')}
                  disabled={actionLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#fbbf24',
                    color: '#78350f',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Suspend
                </button>
              )}
              {organization.status === 'suspended' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  disabled={actionLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Reactivate
                </button>
              )}
              <a
                href={`https://${organization.slug}.pawser.app`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: '500',
                }}
              >
                Visit Portal →
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integration' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Current Integration Status */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>ShelterLuv Integration</h2>
            
            {credentials.length > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: credentials.some(c => c.status === 'active') ? '#22c55e' : '#ef4444',
                  }} />
                  <span style={{ fontWeight: '500' }}>
                    {credentials.some(c => c.status === 'active') ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                {credentials.map((cred) => (
                  <div key={cred.id} style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <span style={{ color: '#6b7280' }}>Provider:</span>
                      <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{cred.provider}</span>
                      
                      <span style={{ color: '#6b7280' }}>Status:</span>
                      <span>{getStatusBadge(cred.status)}</span>
                      
                      <span style={{ color: '#6b7280' }}>Label:</span>
                      <span>{cred.accountLabel || '-'}</span>
                      
                      <span style={{ color: '#6b7280' }}>Added:</span>
                      <span>{formatDate(cred.createdAt)}</span>
                    </div>
                  </div>
                ))}

                {dataSources.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Data Sources</h3>
                    {dataSources.map((ds) => (
                      <div key={ds.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: ds.isActive ? '#22c55e' : '#9ca3af',
                        }} />
                        <span>{ds.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                <p style={{ color: '#92400e', marginBottom: '0.5rem', fontWeight: '500' }}>
                  ⚠️ No integration configured
                </p>
                <p style={{ color: '#a16207', fontSize: '0.875rem' }}>
                  Add your ShelterLuv API key below to start syncing animals.
                </p>
              </div>
            )}
          </div>

          {/* Configure API Key */}
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
              {credentials.length > 0 ? 'Update API Key' : 'Configure API Key'}
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                ShelterLuv API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your ShelterLuv API key (e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                }}
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                You can find your API key in your ShelterLuv account under Settings → API Access
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleTestConnection}
                disabled={actionLoading || !apiKey.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: actionLoading || !apiKey.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  opacity: actionLoading || !apiKey.trim() ? 0.5 : 1,
                }}
              >
                {actionLoading ? 'Testing...' : 'Test Connection'}
              </button>
              
              <button
                onClick={handleSaveCredentials}
                disabled={actionLoading || !apiKey.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: actionLoading || !apiKey.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  opacity: actionLoading || !apiKey.trim() ? 0.5 : 1,
                }}
              >
                {actionLoading ? 'Saving...' : 'Save & Connect'}
              </button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: '6px',
                backgroundColor: testResult.success ? '#dcfce7' : '#fee2e2',
                color: testResult.success ? '#166534' : '#991b1b',
              }}>
                {testResult.message}
              </div>
            )}

            {/* Save Result */}
            {saveResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: '6px',
                backgroundColor: saveResult.success ? '#dcfce7' : '#fee2e2',
                color: saveResult.success ? '#166534' : '#991b1b',
              }}>
                {saveResult.message}
              </div>
            )}
          </div>

          {/* Quick Actions for Integration */}
          {credentials.length > 0 && credentials.some(c => c.status === 'active') && (
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Quick Actions</h2>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleTriggerSync}
                  disabled={actionLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: actionLoading ? 0.5 : 1,
                  }}
                >
                  {actionLoading ? 'Syncing...' : '🔄 Sync Now'}
                </button>
                <Link
                  href={`/organizations/${id}?tab=sync`}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: '500',
                  }}
                >
                  View Sync History →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Billing & Subscription</h2>
          
          {subscription ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <dt style={{ color: '#6b7280' }}>Plan</dt>
                <dd style={{ fontWeight: '500' }}>{subscription.plan.name}</dd>

                <dt style={{ color: '#6b7280' }}>Status</dt>
                <dd>{getStatusBadge(subscription.status)}</dd>

                <dt style={{ color: '#6b7280' }}>Price</dt>
                <dd>${(subscription.plan.priceCents / 100).toFixed(2)}/month</dd>

                {subscription.trialEnd && (
                  <>
                    <dt style={{ color: '#6b7280' }}>Trial Ends</dt>
                    <dd>{formatDate(subscription.trialEnd)}</dd>
                  </>
                )}

                {subscription.currentPeriodEnd && (
                  <>
                    <dt style={{ color: '#6b7280' }}>Period End</dt>
                    <dd>{formatDate(subscription.currentPeriodEnd)}</dd>
                  </>
                )}
              </div>

              {organization.stripeCustomerId && (
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Stripe Customer: {organization.stripeCustomerId}
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>No subscription data available.</p>
          )}
        </div>
      )}

      {activeTab === 'sync' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Sync History</h2>
            <button
              onClick={handleTriggerSync}
              disabled={actionLoading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                opacity: actionLoading ? 0.5 : 1,
              }}
            >
              {actionLoading ? 'Syncing...' : 'Trigger Sync'}
            </button>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Trigger</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Started</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Items</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Error</th>
                </tr>
              </thead>
              <tbody>
                {syncRuns.map((run) => (
                  <tr key={run.id}>
                    <td style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb' }}>
                      {getStatusBadge(run.status)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb', color: '#6b7280' }}>
                      {run.trigger}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb', fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDate(run.startedAt)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb' }}>
                      <span style={{ color: '#059669' }}>+{run.itemsUpserted}</span>
                      {run.itemsDeleted > 0 && (
                        <span style={{ color: '#dc2626', marginLeft: '0.5rem' }}>-{run.itemsDeleted}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb', color: '#dc2626', fontSize: '0.875rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {run.error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {syncRuns.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                No sync runs found. Trigger a sync to get started.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
