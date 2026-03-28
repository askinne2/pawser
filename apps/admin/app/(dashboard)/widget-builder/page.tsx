'use client';

import { useState } from 'react';
import { PageHeader } from '@pawser/ui';

interface WidgetSettings {
  primaryColor: string;
  buttonStyle: 'rounded' | 'square' | 'pill';
  cardStyle: 'shadow' | 'border' | 'flat';
  showDogs: boolean;
  showCats: boolean;
  showOther: boolean;
  animalsPerPage: number;
  sortDefault: string;
  adoptUrlBase: string;
  adoptionProcessText: string;
}

export default function WidgetBuilderPage() {
  const [settings, setSettings] = useState<WidgetSettings>({
    primaryColor: '#00113f',
    buttonStyle: 'rounded',
    cardStyle: 'shadow',
    showDogs: true,
    showCats: true,
    showOther: true,
    animalsPerPage: 24,
    sortDefault: 'newest',
    adoptUrlBase: '',
    adoptionProcessText: '',
  });

  const updateSetting = <K extends keyof WidgetSettings>(key: K, value: WidgetSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Widget Builder" subtitle="Customize your adoption widget" />

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Settings Panel */}
        <div className="w-[360px] shrink-0 overflow-y-auto space-y-6">
          {/* Status */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-sm font-bold text-on-surface">Connected</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface">Widget Settings</h3>
          </div>

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
                  className="flex-1 bg-surface-container-highest border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-on-surface font-mono text-sm"
                />
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Button Style</label>
              <div className="flex gap-2">
                {(['rounded', 'square', 'pill'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => updateSetting('buttonStyle', style)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                      settings.buttonStyle === style
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Card Style</label>
              <div className="flex gap-2">
                {(['shadow', 'border', 'flat'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => updateSetting('cardStyle', style)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                      settings.cardStyle === style
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Display */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5">
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Display</h4>

            <div className="space-y-3">
              <label className="text-sm font-bold text-on-surface ml-1">Species</label>
              {[
                { key: 'showDogs' as const, label: 'Dogs' },
                { key: 'showCats' as const, label: 'Cats' },
                { key: 'showOther' as const, label: 'Other' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(e) => updateSetting(key, e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-primary"
                  />
                  <span className="text-sm text-on-surface">{label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Animals per page</label>
              <select
                value={settings.animalsPerPage}
                onChange={(e) => updateSetting('animalsPerPage', Number(e.target.value))}
                className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all text-on-surface"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Default sort</label>
              <select
                value={settings.sortDefault}
                onChange={(e) => updateSetting('sortDefault', e.target.value)}
                className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all text-on-surface"
              >
                <option value="newest">Newest</option>
                <option value="longest_stay">Longest Stay</option>
                <option value="name_asc">Name A-Z</option>
              </select>
            </div>
          </div>

          {/* Adoption */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5">
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Adoption</h4>
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Adoption URL</label>
              <input
                type="text"
                placeholder="https://new.shelterluv.com/matchme/adopt/"
                value={settings.adoptUrlBase}
                onChange={(e) => updateSetting('adoptUrlBase', e.target.value)}
                className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-on-surface text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface ml-1">Adoption process</label>
              <textarea
                placeholder="Tell adopters about your process..."
                value={settings.adoptionProcessText}
                onChange={(e) => updateSetting('adoptionProcessText', e.target.value)}
                rows={4}
                className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-on-surface text-sm resize-none"
              />
            </div>
          </div>

          <button className="w-full bg-primary-gradient text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
            Save Changes
          </button>
        </div>

        {/* Live Preview */}
        <div className="flex-1 bg-surface-container-low rounded-xl p-8 relative overflow-hidden">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/50 backdrop-blur-sm px-4 py-1.5 rounded-full z-10">
            <span className="text-xs font-bold text-on-surface-variant">Live Preview</span>
          </div>
          <div className="flex items-center justify-center h-full">
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] max-w-sm w-full">
              <div className="aspect-square rounded-xl bg-surface-container-low mb-4 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">image</span>
              </div>
              <h4 className="font-bold text-on-surface">Bella</h4>
              <p className="text-sm text-on-surface-variant">Golden Retriever &bull; 2 Years</p>
              <p className="text-sm text-on-surface-variant/70">Female &bull; Medium</p>
              <button
                className="w-full mt-4 py-2.5 rounded-xl font-bold text-sm text-white active:scale-95 transition-all"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Adopt Me
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
