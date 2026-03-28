'use client';

import { useState, useEffect } from 'react';
import { PageHeader, StatCard, SyncStatusCard, QuickActionRow } from '@pawser/ui';

interface DashboardData {
  activePets: number;
  recentAdoptions: number;
  widgetViews: number;
  lastSynced: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    activePets: 0,
    recentAdoptions: 0,
    widgetViews: 0,
    lastSynced: '5m ago',
  });

  useEffect(() => {
    // Placeholder: fetch real data from API
    setData({
      activePets: 42,
      recentAdoptions: 8,
      widgetViews: 1247,
      lastSynced: '5m ago',
    });
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Manage your shelter's activity"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Active Pets" value={data.activePets} trend="+3 this week" icon="pets" />
        <StatCard label="Recent Adoptions" value={data.recentAdoptions} trend="+2 this month" icon="favorite" />
        <StatCard label="Widget Views" value={data.widgetViews} trend="+12% this week" icon="visibility" />
        <SyncStatusCard lastSynced={data.lastSynced} isLive={true} onSyncNow={() => {}} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-8">
          <h3 className="text-lg font-bold text-on-surface mb-4">Widget Preview</h3>
          <div className="aspect-video bg-surface-container rounded-xl flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">widgets</span>
              <p className="text-sm text-on-surface-variant mt-2">Your widget preview will appear here</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <QuickActionRow icon="edit" label="Edit Widget" onClick={() => {}} />
            <QuickActionRow icon="code" label="View Embed Code" onClick={() => {}} />
            <QuickActionRow icon="share" label="Share Link" onClick={() => {}} />
          </div>

          <div className="bg-primary text-on-primary p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-lg">verified_user</span>
              <span className="font-bold text-sm">Secure Connection</span>
            </div>
            <p className="text-sm text-on-primary/80">
              Your ShelterLuv data is encrypted with AES-256-GCM and synced securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
