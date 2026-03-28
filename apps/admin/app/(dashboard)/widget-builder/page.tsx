'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '../context/org-context';

interface WidgetSettings {
  primaryColor: string;
  adoptUrlBase: string;
  animalsPerPage: number;
  defaultSpecies: string;
}

const DEFAULT_SETTINGS: WidgetSettings = {
  primaryColor: '#00113f',
  adoptUrlBase: '',
  animalsPerPage: 24,
  defaultSpecies: 'all',
};

export default function WidgetBuilderPage() {
  const { orgId } = useOrg();
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/proxy/organizations/${orgId}/settings/widget`);
      const json = await res.json();
      if (json.success) {
        setSettings({
          primaryColor: json.data.primaryColor ?? DEFAULT_SETTINGS.primaryColor,
          adoptUrlBase: json.data.adoptUrlBase ?? DEFAULT_SETTINGS.adoptUrlBase,
          animalsPerPage: json.data.animalsPerPage ?? DEFAULT_SETTINGS.animalsPerPage,
          defaultSpecies: json.data.defaultSpecies ?? DEFAULT_SETTINGS.defaultSpecies,
        });
      }
    } catch (err) {
      console.error('Failed to load widget settings', err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = <K extends keyof WidgetSettings>(key: K, value: WidgetSettings[K]) => {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/organizations/${orgId}/settings/widget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        <div className="w-[360px] space-y-4">
          <div className="h-48 bg-surface-container-low rounded-xl animate-pulse" />
          <div className="h-64 bg-surface-container-low rounded-xl animate-pulse" />
        </div>
        <div className="flex-1 bg-surface-container-low rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-on-surface">Widget Builder</h1>
        <p className="text-on-surface-variant mt-1">Customize how your adoption widget looks and behaves.</p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-220px)]">
        {/* Settings Panel */}
        <div className="w-[360px] shrink-0 overflow-y-auto space-y-5 pb-4">

          {/* Styling */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5">
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Styling</h4>

            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Brand Color</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  placeholder="#00113f"
                  className="flex-1 bg-surface-container-highest border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-on-surface font-mono text-sm"
                />
                <input
                  type="color"
                  value={/^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor) ? settings.primaryColor : '#00113f'}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent"
                />
              </div>
              <p className="text-xs text-on-surface-variant ml-1">Applied to buttons, active states, and accents.</p>
            </div>
          </div>

          {/* Display */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5">
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Display</h4>

            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Animals per page</label>
              <div className="flex gap-2">
                {([12, 24, 48] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => updateSetting('animalsPerPage', n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                      settings.animalsPerPage === n
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Default species</label>
              <div className="grid grid-cols-2 gap-2">
                {(['all', 'dog', 'cat', 'other'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateSetting('defaultSpecies', s)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 capitalize ${
                      settings.defaultSpecies === s
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    {s === 'all' ? 'All animals' : s === 'dog' ? 'Dogs' : s === 'cat' ? 'Cats' : 'Other'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Adoption */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5">
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Adoption</h4>
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Adoption URL base</label>
              <input
                type="text"
                placeholder="https://new.shelterluv.com/matchme/adopt/"
                value={settings.adoptUrlBase}
                onChange={(e) => updateSetting('adoptUrlBase', e.target.value)}
                className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-on-surface text-sm"
              />
              <p className="text-xs text-on-surface-variant ml-1">
                Each animal&apos;s external ID is appended to this URL for the &quot;Adopt Me&quot; button.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-primary text-on-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:opacity-90'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Saving…
              </>
            ) : saved ? (
              <>
                <span className="material-symbols-outlined text-[18px]">check</span>
                Saved
              </>
            ) : (
              'Save Changes'
            )}
          </button>

          <a
            href="/embed-code"
            className="block text-center text-sm font-bold text-primary hover:underline"
          >
            Get embed code →
          </a>
        </div>

        {/* Live Preview */}
        <div className="flex-1 bg-surface-container-low rounded-xl p-8 relative overflow-hidden flex flex-col">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-full z-10">
            <span className="text-xs font-bold text-on-surface-variant">Preview</span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {[
                { name: 'Bella', breed: 'Golden Retriever', age: '2 years', sex: 'Female', size: 'Large' },
                { name: 'Oliver', breed: 'Domestic Shorthair', age: '4 months', sex: 'Male', size: 'Small' },
              ].map((animal) => (
                <div key={animal.name} className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                  <div className="aspect-square bg-surface-container-low flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">pets</span>
                  </div>
                  <div className="p-3">
                    <h4 className="font-black text-on-surface text-sm">{animal.name}</h4>
                    <p className="text-xs text-on-surface-variant">{animal.breed} · {animal.age}</p>
                    <p className="text-xs text-on-surface-variant/70">{animal.sex} · {animal.size}</p>
                    <button
                      className="w-full mt-3 py-2 rounded-xl font-bold text-xs text-white transition-all"
                      style={{
                        backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor)
                          ? settings.primaryColor
                          : '#00113f',
                      }}
                    >
                      Adopt Me
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-on-surface-variant/50 mt-4">
            This is a static preview. The live widget fetches your real animals.
          </p>
        </div>
      </div>
    </div>
  );
}
