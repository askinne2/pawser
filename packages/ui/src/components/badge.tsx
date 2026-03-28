import * as React from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info';
}

const variantClasses: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-900',
  warning: 'bg-amber-100 text-amber-900',
  error: 'bg-rose-100 text-rose-900',
  info: 'bg-primary-container text-on-primary-container',
};

export function Badge({
  variant = 'info',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
