import { useState } from 'react';

interface FilterDrawerProps {
  species: string;
  onSpeciesChange: (species: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  onClose: () => void;
}

export function FilterDrawer({
  species,
  onSpeciesChange,
  sort,
  onSortChange,
  onClose,
}: FilterDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full bg-surface-container-lowest rounded-t-2xl p-6 pb-10 space-y-6 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface">Filters</h3>
          <button onClick={onClose} className="text-on-surface-variant">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Species</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'dog', label: 'Dogs' },
              { value: 'cat', label: 'Cats' },
              { value: 'other', label: 'Other' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => onSpeciesChange(option.value)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  species === option.value
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Sort By</label>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-3 text-on-surface text-sm"
          >
            <option value="newest">Newest</option>
            <option value="longest_stay">Longest Stay</option>
            <option value="name_asc">Name A-Z</option>
          </select>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold active:scale-95 transition-all"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
