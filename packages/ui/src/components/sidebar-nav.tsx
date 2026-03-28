'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

export interface NavItem {
  label: string;
  icon: string;
  href: string;
  active?: boolean;
}

export interface SidebarNavProps {
  items: NavItem[];
  bottomItems?: NavItem[];
  onNavigate: (href: string) => void;
  className?: string;
}

export function SidebarNav({
  items,
  bottomItems,
  onNavigate,
  className,
}: SidebarNavProps) {
  return (
    <aside
      className={cn(
        'h-screen w-64 bg-surface-container-low flex flex-col py-6 px-4',
        className
      )}
    >
      <div className="px-2 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white">
          <span
            className="material-symbols-outlined text-sm"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            pets
          </span>
        </div>
        <div>
          <h1 className="text-lg font-black text-primary leading-none">Pawser</h1>
          <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-0.5">
            Admin Dashboard
          </p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {items.map((item) => (
          <button
            key={item.href}
            onClick={() => onNavigate(item.href)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold hover:translate-x-1 transition-all cursor-pointer text-left',
              item.active
                ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                : 'text-secondary hover:bg-surface-container-highest hover:text-primary'
            )}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {bottomItems && bottomItems.length > 0 && (
        <div className="flex flex-col gap-1 pt-4">
          {bottomItems.map((item) => (
            <button
              key={item.href}
              onClick={() => onNavigate(item.href)}
              className="flex items-center gap-3 px-4 py-3 text-secondary hover:bg-surface-container-highest hover:text-primary rounded-xl font-semibold hover:translate-x-1 transition-all cursor-pointer text-left"
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
