import * as React from 'react';
import { cn } from '../lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon: string;
  className?: string;
}

export function StatCard({ label, value, trend, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
          {label}
        </span>
        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-on-surface">{value}</span>
        {trend && (
          <span className="text-green-600 text-sm font-semibold">{trend}</span>
        )}
      </div>
    </div>
  );
}
