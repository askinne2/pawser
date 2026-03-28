'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

export interface SyncStatusCardProps {
  lastSynced?: string;
  isLive?: boolean;
  onSyncNow?: () => void;
  className?: string;
}

export function SyncStatusCard({
  lastSynced,
  isLive = true,
  onSyncNow,
  className,
}: SyncStatusCardProps) {
  return (
    <div
      className={cn(
        'bg-surface-container-high p-6 rounded-xl flex flex-col justify-between',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              isLive
                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                : 'bg-amber-500'
            )}
          />
          <span className="text-sm font-bold text-on-surface">
            {isLive ? 'System Live' : 'Offline'}
          </span>
        </div>
        {lastSynced && (
          <span className="text-[10px] font-semibold text-on-surface-variant">
            {lastSynced}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-on-surface-variant mb-4">
          Inventory synchronized.
        </p>
        <button
          onClick={onSyncNow}
          className="w-full py-2 bg-surface-container-lowest rounded-xl text-sm font-bold text-primary shadow-sm hover:bg-white transition-all active:scale-95"
        >
          Sync now
        </button>
      </div>
    </div>
  );
}
