'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'primary-gradient' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    const variantClasses: Record<string, string> = {
      primary:
        'bg-primary text-on-primary px-6 py-3 rounded-xl font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all',
      'primary-gradient':
        'bg-primary-gradient text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all',
      secondary:
        'bg-surface-container-lowest text-primary border border-primary/10 px-6 py-3 rounded-xl font-bold hover:bg-surface-container transition-all active:scale-95',
      ghost:
        'text-primary px-6 py-3 rounded-xl font-bold hover:bg-surface-container-highest transition-all flex items-center gap-2',
    };

    const sizeClasses: Record<string, string> = {
      sm: 'px-4 py-2 text-sm',
      default: '',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center',
          variantClasses[variant],
          size !== 'default' && sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
