'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

export interface CodeSnippetProps {
  code: string;
  className?: string;
}

export function CodeSnippet({ code, className }: CodeSnippetProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'bg-surface-container-high rounded-xl p-5 font-mono text-sm relative',
        className
      )}
    >
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 text-on-surface-variant hover:text-primary transition-colors text-xs font-bold flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-sm">
          {copied ? 'check' : 'content_copy'}
        </span>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="text-on-surface overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}
