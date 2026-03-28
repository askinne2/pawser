'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, StatCard, SyncStatusCard, QuickActionRow } from '@pawser/ui';
import { useOrg } from './context/org-context';

interface DashboardStats {
  activePets: number;
  lastSynced: string;
  syncStatus: 'live' | 'error' | 'pending';
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardPage() {
  const { orgId, orgSlug, orgName, loading: orgLoading } = useOrg();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    activePets: 0,
    lastSynced: '—',
    syncStatus: 'pending',
  });
  const [syncing, setSyncing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!orgId || !orgSlug) return;
    setStatsLoading(true);

    try {
      const animalsParams = new URLSearchParams({
        orgSlug,
        status: 'available',
        page: '1',
        perPage: '1',
      });
      const [animalsRes, syncRes] = await Promise.all([
        fetch(`/api/proxy/animals?${animalsParams.toString()}`),
        fetch(`/api/proxy/sync/${orgId}/status`),
      ]);

      let activePets = 0;
      let lastSynced = '—';
      let syncStatus: DashboardStats['syncStatus'] = 'pending';

      if (animalsRes.ok) {
        const animalsData = await animalsRes.json();
        activePets = animalsData.total ?? animalsData.animals?.length ?? 0;
      }

      if (syncRes.ok) {
        const syncData: {
          success?: boolean;
          status?: { lastSyncAt?: string | null; lastSyncStatus?: string | null };
        } = await syncRes.json();
        if (syncData.success && syncData.status) {
          lastSynced = formatRelativeTime(syncData.status.lastSyncAt ?? null);
          const st = syncData.status.lastSyncStatus;
          syncStatus = st === 'completed' ? 'live' : st === 'failed' ? 'error' : 'pending';
        }
      }

      setStats({ activePets, lastSynced, syncStatus });
    } catch {
      // Silently degrade — mock data already shown via initial state
    } finally {
      setStatsLoading(false);
    }
  }, [orgId, orgSlug]);

  useEffect(() => {
    if (!orgLoading) fetchStats();
  }, [orgLoading, fetchStats]);

  const handleSyncNow = async () => {
    if (!orgId || syncing) return;
    setSyncing(true);
    try {
      await fetch(`/api/proxy/sync/${orgId}`, { method: 'POST' });
      // Give the queue a moment then refresh
      setTimeout(() => {
        fetchStats();
        setSyncing(false);
      }, 2000);
    } catch {
      setSyncing(false);
    }
  };

  const isLoading = orgLoading || statsLoading;

  return (
    <div className="space-y-8">
      <PageHeader
        title={orgName ? `${orgName} Dashboard` : 'Dashboard Overview'}
        subtitle="Manage your shelter's activity and adoption widget"
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Available Pets"
          value={isLoading ? '—' : stats.activePets}
          trend="Listed on your widget"
          icon="pets"
        />
        <StatCard
          label="Widget Embed"
          value="Active"
          trend="Serving live data"
          icon="widgets"
        />
        <StatCard
          label="Data Source"
          value="ShelterLuv"
          trend="Auto-syncing"
          icon="sync"
        />
        <SyncStatusCard
          lastSynced={isLoading ? '…' : stats.lastSynced}
          isLive={stats.syncStatus === 'live'}
          onSyncNow={handleSyncNow}
        />
      </div>

      {/* Lower grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget preview placeholder */}
        <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-8">
          <h3 className="text-lg font-bold text-on-surface mb-4">Widget Preview</h3>
          <div className="aspect-video bg-surface-container rounded-xl flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">widgets</span>
              <p className="text-sm text-on-surface-variant mt-2">
                Your widget preview will appear here
              </p>
              <button
                onClick={() => router.push('/widget-builder')}
                className="mt-4 text-xs font-bold text-primary hover:opacity-70 transition-opacity"
              >
                Open Widget Builder →
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="space-y-2">
            <QuickActionRow icon="edit" label="Edit Widget" onClick={() => router.push('/widget-builder')} />
            <QuickActionRow icon="code" label="View Embed Code" onClick={() => router.push('/embed-code')} />
            <QuickActionRow icon="link" label="Manage Integration" onClick={() => router.push('/integration')} />
            <QuickActionRow
              icon="sync"
              label={syncing ? 'Syncing…' : 'Sync Now'}
              onClick={handleSyncNow}
            />
          </div>

          <div className="bg-primary text-on-primary p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-lg">verified_user</span>
              <span className="font-bold text-sm">Secure Connection</span>
            </div>
            <p className="text-sm text-on-primary/80">
              Your ShelterLuv API key is encrypted with AES-256-GCM and never exposed in plaintext.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
