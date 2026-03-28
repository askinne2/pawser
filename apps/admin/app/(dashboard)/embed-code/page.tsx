'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '../context/org-context';

interface WidgetSettings {
  orgSlug: string;
  primaryColor: string;
  adoptUrlBase: string;
  animalsPerPage: number;
  defaultSpecies: string;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-[#0d1117] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-[11px] font-mono text-white/40">HTML</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] font-bold text-white/50 hover:text-white/80 transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm text-green-300 font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function EmbedCodePage() {
  const { orgId } = useOrg();
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/proxy/organizations/${orgId}/settings/widget`);
      const json = await res.json();
      if (json.success) setSettings(json.data);
    } catch (err) {
      console.error('Failed to fetch widget settings', err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const embedCode = settings
    ? `<script>
  window.pawserSettings = {
    apiUrl: "https://api.getpawser.io",
    orgSlug: "${settings.orgSlug}",
    primaryColor: "${settings.primaryColor}",${settings.adoptUrlBase ? '\n    adoptUrlBase: "' + settings.adoptUrlBase + '",' : ''}
    animalsPerPage: ${settings.animalsPerPage},
    defaultSpecies: "${settings.defaultSpecies}"
  };
</script>
<script src="https://cdn.getpawser.io/widget.js" defer></script>
<div id="pawser-root"></div>`
    : '';

  if (loading) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div className="h-10 w-64 bg-surface-container-low rounded-xl animate-pulse" />
        <div className="h-48 bg-surface-container-low rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-on-surface">Add Pawser to your website</h1>
        <p className="text-on-surface-variant mt-1">
          Copy this snippet and paste it before the{' '}
          <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded text-sm">
            &lt;/body&gt;
          </code>{' '}
          tag on any page where you want the adoption widget to appear.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold shrink-0">1</div>
          <h3 className="text-lg font-bold text-on-surface">Copy this snippet</h3>
        </div>
        <CodeBlock code={embedCode} />
        <p className="text-sm text-on-surface-variant pl-11">
          Your organization slug and brand color are pre-filled.{' '}
          {!settings?.adoptUrlBase && (
            <span className="text-amber-600 font-medium">
              Set your Adoption URL in{' '}
              <a href="/widget-builder" className="underline hover:text-amber-700">Widget Builder</a>{' '}
              to enable adopt links.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold shrink-0">2</div>
          <h3 className="text-lg font-bold text-on-surface">Where to paste it</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] ml-11">
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Paste the snippet just before{' '}
            <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">&lt;/body&gt;</code>{' '}
            on any page. The widget mounts automatically on the{' '}
            <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">#pawser-root</code>{' '}
            element and fetches your live animals from the Pawser API. No backend required on your site.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold shrink-0">3</div>
          <h3 className="text-lg font-bold text-on-surface">Verify it is working</h3>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] ml-11 space-y-4">
          <p className="text-on-surface-variant text-sm">
            After pasting, reload your page. You should see the adoption widget with your available animals.
            If animals are not showing, make sure your ShelterLuv integration is connected and your first sync has completed.
          </p>
          <div className="flex gap-3">
            <a href="/integration" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:bg-surface-container-high px-4 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-[18px]">sync</span>
              Check integration
            </a>
            <a href="/widget-builder" className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high px-4 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Customize widget
            </a>
          </div>
        </div>
      </div>

      {settings && (
        <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-5">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Current configuration</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-on-surface-variant">Org slug</span>
              <p className="font-mono font-bold text-on-surface">{settings.orgSlug}</p>
            </div>
            <div>
              <span className="text-on-surface-variant">Brand color</span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: settings.primaryColor }} />
                <p className="font-mono font-bold text-on-surface">{settings.primaryColor}</p>
              </div>
            </div>
            <div>
              <span className="text-on-surface-variant">Animals per page</span>
              <p className="font-bold text-on-surface">{settings.animalsPerPage}</p>
            </div>
            <div>
              <span className="text-on-surface-variant">Default species</span>
              <p className="font-bold text-on-surface capitalize">{settings.defaultSpecies}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
