'use client';

import { PageHeader, Badge } from '@pawser/ui';

export default function BillingPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader title="Billing" subtitle="Manage your subscription and invoices" />

      <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Current Plan</h3>
            <p className="text-sm text-on-surface-variant mt-1">You are on the Basic plan</p>
          </div>
          <Badge variant="info">Basic</Badge>
        </div>
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Price</span>
            <p className="text-2xl font-black text-on-surface mt-1">$0<span className="text-sm font-normal text-on-surface-variant">/mo</span></p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sync Interval</span>
            <p className="text-2xl font-black text-on-surface mt-1">30m</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Animals</span>
            <p className="text-2xl font-black text-on-surface mt-1">50 max</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button className="bg-primary-gradient text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
            Upgrade to Pro
          </button>
          <button className="text-primary px-6 py-3 rounded-xl font-bold hover:bg-surface-container-highest transition-all active:scale-95">
            Manage billing
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <h3 className="text-lg font-bold text-on-surface mb-6">Invoice History</h3>
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">receipt_long</span>
          <p className="text-sm text-on-surface-variant mt-2">No invoices yet</p>
        </div>
      </div>
    </div>
  );
}
