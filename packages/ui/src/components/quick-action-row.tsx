'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

export interface QuickActionRowProps {
  icon: string;
  label: string;
  onClick?: () => void;
  className?: string;
}

export function QuickActionRow({
  icon,
  label,
  onClick,
  className,
}: QuickActionRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-4 rounded-xl bg-surface-container-low',
        'hover:bg-surface-container-high transition-colors group w-full',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        <span className="font-bold text-sm">{label}</span>
      </div>
      <span className="material-symbols-outlined text-outline group-hover:translate-x-1 transition-transform">
        chevron_right
      </span>
    </button>
  );
}
