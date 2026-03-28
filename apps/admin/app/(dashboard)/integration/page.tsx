'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Badge } from '@pawser/ui';
import { useOrg } from '../context/org-context';

type IntegrationStep = 1 | 2 | 3;

interface ConnectionResult {
  connected: boolean;
  animalCount?: number;
  sampleAnimal?: { name: string; species: string } | null;
  error?: string;
}

interface SyncStatus {
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  animalsCount: number;
  hasDataSources: boolean;
}

function formatSyncTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

export default function IntegrationPage() {
  const { orgId } = useOrg();
  const router = useRouter();

  const [initialLoad, setInitialLoad] = useState(true);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [step, setStep] = useState<IntegrationStep>(1);
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connection, setConnection] = useState<ConnectionResult | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncMessage, setSyncMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showApiKeySection, setShowApiKeySection] = useState(false);
  /** When true, saving a key should advance the first-time wizard (not used for "update key" on connected dashboard). */
  const [firstTimeSetup, setFirstTimeSetup] = useState(false);

  const refreshSyncStatus = useCallback(async () => {
    if (!orgId) return;
    const res = await fetch(`/api/proxy/sync/${orgId}/status`);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success && data.status) {
      setSyncStatus({
        lastSyncAt: data.status.lastSyncAt,
        lastSyncStatus: data.status.lastSyncStatus,
        animalsCount: data.status.animalsCount ?? 0,
        hasDataSources: data.status.hasDataSources ?? false,
      });
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    (async () => {
      try {
        const credRes = await fetch(`/api/proxy/organizations/${orgId}/credentials`);
        const credData = credRes.ok ? await credRes.json() : null;
        if (cancelled) return;
        if (credData?.hasActiveCredentials) {
          setHasSavedCredentials(true);
          setFirstTimeSetup(false);
          await refreshSyncStatus();
        } else {
          setFirstTimeSetup(true);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setInitialLoad(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, refreshSyncStatus]);

  const testConnection = async () => {
    if (!orgId || !apiKey.trim()) return;
    setTesting(true);
    setConnection(null);

    try {
      const res = await fetch(`/api/proxy/organizations/${orgId}/credentials/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setConnection({ connected: true, animalCount: data.animalsFound, sampleAnimal: data.sampleAnimal });
        setSaving(true);
        const saveRes = await fetch(`/api/proxy/organizations/${orgId}/credentials`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
        });
        setSaving(false);
        if (saveRes.ok) {
          setHasSavedCredentials(true);
          setApiKey('');
          setShowApiKeySection(false);
          if (firstTimeSetup) {
            setStep(2);
          } else {
            setConnection(null);
            setSyncMessage({
              type: 'ok',
              text: 'API key updated. You can run a sync whenever you are ready.',
            });
          }
          await refreshSyncStatus();
        } else {
          const saveJson = await saveRes.json().catch(() => ({}));
          setConnection({
            connected: false,
            error: saveJson.message || 'Connection tested OK, but saving the key failed. Please retry.',
          });
        }
      } else {
        setConnection({ connected: false, error: data.message || 'Could not connect. Check your API key and try again.' });
      }
    } catch {
      setConnection({ connected: false, error: 'Network error. Please check your connection and try again.' });
    } finally {
      setTesting(false);
      setSaving(false);
    }
  };

  const runSync = async (afterSuccess?: () => void) => {
    if (!orgId) return;
    setSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch(`/api/proxy/sync/${orgId}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setSyncMessage({ type: 'ok', text: data.message || 'Sync started. Animals will update shortly.' });
        await refreshSyncStatus();
        afterSuccess?.();
      } else {
        setSyncMessage({
          type: 'err',
          text: data.message || data.error || 'Could not start sync. Check your integration and try again.',
        });
      }
    } catch {
      setSyncMessage({ type: 'err', text: 'Network error. Please try again.' });
    } finally {
      setSyncing(false);
    }
  };

  const runFirstSync = () => {
    void runSync(() => {
      setTimeout(() => setStep(3), 400);
    });
  };

  const isBusy = testing || saving;

  if (initialLoad) {
    return (
      <div className="space-y-8 max-w-2xl">
        <PageHeader title="ShelterLuv" subtitle="Connect and sync your adoptable animals" />
        <div className="bg-surface-container-lowest p-10 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-center gap-3 text-on-surface-variant text-sm font-bold">
          <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
          Loading integration…
        </div>
      </div>
    );
  }

  const connectedDashboard = hasSavedCredentials && step !== 2 && step !== 3;
  const lastSyncLabel = formatSyncTime(syncStatus?.lastSyncAt);

  if (connectedDashboard) {
    return (
      <div className="space-y-8 max-w-2xl">
        <PageHeader
          title="ShelterLuv"
          subtitle="Sync adoptable animals from ShelterLuv into Pawser"
        />

        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl text-primary">link</span>
              </div>
              <div>
                <p className="text-lg font-bold text-on-surface">Connected</p>
                <p className="text-sm text-on-surface-variant mt-1">
                  Your API key is stored encrypted. Run a sync anytime to pull the latest animals.
                </p>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>

          <div className="bg-surface-container-low rounded-2xl px-5 py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-primary text-lg">pets</span>
                <span>
                  <span className="font-bold">{syncStatus?.animalsCount ?? '—'}</span>
                  <span className="text-on-surface-variant font-normal"> in Pawser</span>
                </span>
              </div>
              {lastSyncLabel && (
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-lg">history</span>
                  <span>
                    Last sync: <span className="font-bold text-on-surface">{lastSyncLabel}</span>
                    {syncStatus?.lastSyncStatus && (
                      <span className="text-on-surface-variant"> ({syncStatus.lastSyncStatus})</span>
                    )}
                  </span>
                </div>
              )}
            </div>
            {!syncStatus?.hasDataSources && (
              <p className="text-xs text-on-surface-variant">
                If sync fails, confirm your ShelterLuv data source is active in the API.
              </p>
            )}
          </div>

          {syncMessage && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${
                syncMessage.type === 'ok'
                  ? 'bg-surface-container-low text-on-surface'
                  : 'text-rose-800 bg-rose-50'
              }`}
            >
              <span className="material-symbols-outlined text-lg shrink-0">
                {syncMessage.type === 'ok' ? 'check_circle' : 'error'}
              </span>
              {syncMessage.text}
            </div>
          )}

          <button
            type="button"
            onClick={() => void runSync()}
            disabled={syncing}
            className="w-full bg-primary-gradient text-on-primary py-4 rounded-xl font-bold shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {syncing ? 'Starting sync…' : 'Sync now'}
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/pets')}
              className="text-sm font-bold text-primary hover:underline underline-offset-4"
            >
              View animals
            </button>
            <span className="text-on-surface-variant">·</span>
            <button
              type="button"
              onClick={() => router.push('/widget-builder')}
              className="text-sm font-bold text-primary hover:underline underline-offset-4"
            >
              Widget builder
            </button>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setShowApiKeySection((v) => {
                const next = !v;
                if (next) {
                  setConnection(null);
                  setApiKey('');
                }
                return next;
              });
            }}
            className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-surface-container-low/80 transition-colors"
            aria-expanded={showApiKeySection}
          >
            <span className="text-sm font-bold text-on-surface">Update API key</span>
            <span
              className={`material-symbols-outlined text-on-surface-variant transition-transform ${
                showApiKeySection ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>
          {showApiKeySection && (
            <div className="px-6 pb-8 pt-2 space-y-6 bg-surface-container-lowest">
              <p className="text-sm text-on-surface-variant">
                Paste a new key from ShelterLuv{' '}
                <span className="font-bold text-on-surface">Settings → API → API Keys</span>. The previous key is replaced
                and cannot be recovered.
              </p>
              <div className="space-y-2">
                <label htmlFor="integration-api-key" className="text-sm font-bold text-on-surface">
                  New API key
                </label>
                <input
                  id="integration-api-key"
                  type="password"
                  autoComplete="off"
                  placeholder="sk_live_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-surface-container-highest rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-on-surface font-mono text-sm"
                />
              </div>
              {connection?.error && (
                <div className="flex items-center gap-2 text-rose-800 bg-rose-50 px-4 py-3 rounded-xl text-sm">
                  <span className="material-symbols-outlined text-sm shrink-0">error</span>
                  {connection.error}
                </div>
              )}
              {connection?.connected && (
                <Badge variant="success">
                  {saving ? 'Saving…' : `Verified — ${connection.animalCount ?? 0} animals visible from ShelterLuv`}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => void testConnection()}
                disabled={!apiKey.trim() || isBusy}
                className="w-full bg-primary-gradient text-on-primary py-4 rounded-xl font-bold shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {saving ? 'Saving key…' : testing ? 'Testing…' : 'Test & save new key'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Connect ShelterLuv"
        subtitle="Link your ShelterLuv account to start syncing animals"
      />

      <div className="flex items-center gap-4 flex-wrap">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s <= step ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {s < step ? (
                <span className="material-symbols-outlined text-sm">check</span>
              ) : (
                s
              )}
            </div>
            <span className={`text-sm font-bold ${s <= step ? 'text-on-surface' : 'text-on-surface-variant'}`}>
              {s === 1 ? 'API Key' : s === 2 ? 'First sync' : 'Done'}
            </span>
            {s < 3 && (
              <div className={`hidden sm:block w-12 h-0.5 ${s < step ? 'bg-primary' : 'bg-surface-container-high'}`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Enter your ShelterLuv API key</h3>
            <p className="text-sm text-on-surface-variant">
              Find your key in ShelterLuv under <span className="font-bold text-on-surface">Settings → API → API Keys</span>.
              It is stored encrypted and is never shown again.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="setup-api-key" className="text-sm font-bold text-on-surface">
              API key
            </label>
            <input
              id="setup-api-key"
              type="password"
              autoComplete="off"
              placeholder="sk_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-surface-container-highest rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-on-surface font-mono text-sm"
            />
          </div>

          {connection?.error && (
            <div className="flex items-center gap-2 text-rose-800 bg-rose-50 px-4 py-3 rounded-xl text-sm">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              {connection.error}
            </div>
          )}

          {connection?.connected && (
            <Badge variant="success">
              {saving ? 'Saving…' : `Connected — ${connection.animalCount ?? 0} animals found`}
            </Badge>
          )}

          <button
            type="button"
            onClick={() => void testConnection()}
            disabled={!apiKey.trim() || isBusy}
            className="w-full bg-primary-gradient text-on-primary py-4 rounded-xl font-bold shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? 'Saving key…' : testing ? 'Testing connection…' : 'Test & save connection'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Run your first sync</h3>
            <p className="text-sm text-on-surface-variant">
              We pull animals from ShelterLuv into Pawser. Large shelters may take a minute; you can leave this page.
            </p>
          </div>

          {connection?.animalCount != null && (
            <div className="flex items-center gap-3 bg-surface-container-low p-4 rounded-xl">
              <span className="material-symbols-outlined text-primary">pets</span>
              <span className="text-sm text-on-surface">
                <span className="font-bold">{connection.animalCount}</span> animals available from ShelterLuv
                {connection.sampleAnimal && (
                  <span className="text-on-surface-variant">
                    {' '}
                    (e.g. {connection.sampleAnimal.name}, {connection.sampleAnimal.species})
                  </span>
                )}
              </span>
            </div>
          )}

          {syncMessage && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${
                syncMessage.type === 'ok' ? 'bg-surface-container-low text-on-surface' : 'text-rose-800 bg-rose-50'
              }`}
            >
              <span className="material-symbols-outlined text-lg shrink-0">
                {syncMessage.type === 'ok' ? 'check_circle' : 'error'}
              </span>
              {syncMessage.text}
            </div>
          )}

          {syncing && (
            <div className="bg-surface-container-low p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
              <p className="text-sm text-on-surface-variant">Starting sync…</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void runFirstSync()}
            disabled={syncing}
            className="w-full bg-primary-gradient text-on-primary py-4 rounded-xl font-bold shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {syncing ? 'Starting…' : 'Run first sync'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl text-primary">check_circle</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-on-surface mb-2">You are all set</h3>
            <p className="text-sm text-on-surface-variant">
              Your shelter data is syncing. You can run another sync anytime from this page.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => router.push('/widget-builder')}
              className="bg-primary-gradient text-on-primary px-8 py-3 rounded-xl font-bold shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:opacity-95 active:scale-[0.99] transition-all"
            >
              Widget builder
            </button>
            <button
              type="button"
              onClick={() => router.push('/pets')}
              className="bg-surface-container-low text-primary px-6 py-3 rounded-xl font-bold hover:bg-surface-container transition-all active:scale-[0.99]"
            >
              View animals
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
