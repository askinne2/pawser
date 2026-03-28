import { PageHeader } from '@pawser/ui';

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader title="Settings" subtitle="Manage your organization settings" />
      <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <p className="text-on-surface-variant">Organization settings coming soon.</p>
      </div>
    </div>
  );
}
