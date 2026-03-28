'use client';

import { PageHeader, CodeSnippet } from '@pawser/ui';

export default function EmbedCodePage() {
  const orgSlug = 'your-shelter';
  const primaryColor = '#00113f';
  const adoptUrlBase = 'https://new.shelterluv.com/matchme/adopt/';

  const embedCode = `<script>
  window.pawserSettings = {
    apiUrl: "https://api.getpawser.io",
    orgSlug: "${orgSlug}",
    primaryColor: "${primaryColor}",
    adoptUrlBase: "${adoptUrlBase}"
  };
</script>
<script src="https://cdn.getpawser.io/widget.js" defer></script>
<div id="pawser-root"></div>`;

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title="Add Pawser to your website"
        subtitle="Copy this code and paste it before </body> on your website."
      />

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold">1</div>
            <h3 className="text-lg font-bold text-on-surface">Copy this script tag</h3>
          </div>
          <CodeSnippet code={embedCode} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold">2</div>
            <h3 className="text-lg font-bold text-on-surface">Where to paste it</h3>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <p className="text-on-surface-variant">
              Paste the code snippet just before the closing <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">&lt;/body&gt;</code> tag on any page where you want the adoption widget to appear. The widget will automatically mount and display your available animals.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold">3</div>
            <h3 className="text-lg font-bold text-on-surface">Test your installation</h3>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <p className="text-on-surface-variant mb-4">
              Open your website and look for the Pawser adoption widget. It should display your available animals with filters and search.
            </p>
            <button className="text-primary px-6 py-3 rounded-xl font-bold hover:bg-surface-container-highest transition-all flex items-center gap-2 active:scale-95">
              Visit your site
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
