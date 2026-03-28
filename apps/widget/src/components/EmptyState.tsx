interface EmptyStateProps {
  showClear?: boolean;
  onClear?: () => void;
}

export function EmptyState({ showClear, onClear }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-surface-container-low text-on-surface-variant/50 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <p className="text-2xl font-bold text-on-surface mb-2">No animals found</p>
      <p className="text-on-surface-variant max-w-md mx-auto">
        Try adjusting your filters or check back later.
      </p>
      {showClear && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-sm active:scale-[0.98] transition-transform"
        >
          Clear all filters
        </button>
      ) : null}
    </div>
  );
}
