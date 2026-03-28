'use client';

import { useState } from 'react';
import { PageHeader, Badge } from '@pawser/ui';

type IntegrationStep = 1 | 2 | 3;

interface ConnectionStatus {
  connected: boolean;
  animalCount: number;
  error?: string;
}

export default function IntegrationPage() {
  const [step, setStep] = useState<IntegrationStep>(1);
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);

  const testConnection = async () => {
    setTesting(true);
    // Simulate API call
    setTimeout(() => {
      setConnection({ connected: true, animalCount: 42 });
      setTesting(false);
      setStep(2);
    }, 2000);
  };

  const runFirstSync = async () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setStep(3);
    }, 3000);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Connect ShelterLuv"
        subtitle="Link your ShelterLuv account to start syncing animals"
      />

      {/* Step Indicator */}
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s <= step
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {s < step ? (
                <span className="material-symbols-outlined text-sm">check</span>
              ) : (
                s
              )}
            </div>
            <span className={`text-sm font-bold ${s <= step ? 'text-on-surface' : 'text-on-surface-variant'}`}>
              {s === 1 ? 'API Key' : s === 2 ? 'First Sync' : 'Done'}
            </span>
            {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-primary' : 'bg-surface-container-high'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: API Key */}
      {step === 1 && (
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Enter your ShelterLuv API key</h3>
            <p className="text-sm text-on-surface-variant">
              Find your API key in ShelterLuv under Settings &rarr; API &rarr; API Keys. Copy the key and paste it below.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-on-surface ml-1">API Key</label>
            <input
              type="password"
              placeholder="sk_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-on-surface font-mono"
            />
          </div>
          {connection?.error && (
            <Badge variant="error">{connection.error}</Badge>
          )}
          {connection?.connected && (
            <Badge variant="success">Connected — {connection.animalCount} animals found</Badge>
          )}
          <button
            onClick={testConnection}
            disabled={!apiKey || testing}
            className="w-full bg-primary-gradient text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {testing ? 'Testing connection...' : 'Test connection'}
          </button>
        </div>
      )}

      {/* Step 2: First Sync */}
      {step === 2 && (
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Run your first sync</h3>
            <p className="text-sm text-on-surface-variant">
              We will pull all your available animals from ShelterLuv into Pawser.
            </p>
          </div>
          {syncing && (
            <div className="bg-surface-container-low p-4 rounded-xl">
              <p className="text-sm text-on-surface-variant">Fetching animals... {connection?.animalCount} found / Saving...</p>
            </div>
          )}
          <button
            onClick={runFirstSync}
            disabled={syncing}
            className="w-full bg-primary-gradient text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {syncing ? 'Syncing...' : 'Run first sync'}
          </button>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl text-emerald-600">check_circle</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-on-surface mb-2">You are all set!</h3>
            <p className="text-sm text-on-surface-variant">
              {connection?.animalCount} animals synced successfully. Your widget is ready to go.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {}}
              className="bg-primary-gradient text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
            >
              Go to Widget Builder
            </button>
            <button
              onClick={() => {}}
              className="bg-surface-container-lowest text-primary border border-primary/10 px-6 py-3 rounded-xl font-bold hover:bg-surface-container transition-all active:scale-95"
            >
              View your animals
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
