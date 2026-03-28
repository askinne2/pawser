'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterSidebarProps {
  domain: string;
  filterOptions: {
    species: string[];
    sex: (string | null)[];
    size: (string | null)[];
    breeds: string[];
    colors: string[];
  };
  facets: {
    species: Record<string, number>;
    goodWithDogs: number;
    goodWithCats: number;
    goodWithKids: number;
    specialNeeds: number;
  };
  primaryColor: string;
  totalCount: number;
}

export default function FilterSidebar({
  domain,
  filterOptions,
  facets,
  primaryColor,
  totalCount,
}: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get current filter values from URL
  const currentFilters = {
    species: searchParams.get('species') || '',
    sex: searchParams.get('sex') || '',
    size: searchParams.get('size') || '',
    breed: searchParams.get('breed') || '',
    color: searchParams.get('color') || '',
    goodWithDogs: searchParams.get('goodWithDogs') === 'true',
    goodWithCats: searchParams.get('goodWithCats') === 'true',
    goodWithKids: searchParams.get('goodWithKids') === 'true',
    specialNeeds: searchParams.get('specialNeeds') === 'true',
    sort: searchParams.get('sort') || 'createdAt_desc',
    q: searchParams.get('q') || '',
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== currentFilters.q) {
        handleFilterChange('q', searchQuery || undefined);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build query string from filters
  const buildQuery = (updates: Record<string, string | boolean | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...currentFilters, ...updates };

    Object.entries(merged).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== false) {
        params.set(key, String(value));
      }
    });

    // Remove page when filters change
    params.delete('page');
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const handleFilterChange = (key: string, value: string | boolean | undefined) => {
    const query = buildQuery({ [key]: value });
    router.push(`/${domain}/animals${query}`);
  };

  const handleClearAll = () => {
    setSearchQuery('');
    router.push(`/${domain}/animals`);
  };

  // Count active filters
  const activeFilterCount = [
    currentFilters.species,
    currentFilters.sex,
    currentFilters.size,
    currentFilters.breed,
    currentFilters.color,
    currentFilters.goodWithDogs,
    currentFilters.goodWithCats,
    currentFilters.goodWithKids,
    currentFilters.specialNeeds,
    currentFilters.q,
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Species */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Species</label>
        <div className="space-y-2">
          {filterOptions.species.map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentFilters.species === s}
                onChange={(e) => handleFilterChange('species', e.target.checked ? s : undefined)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                style={{ accentColor: primaryColor }}
              />
              <span className="text-sm text-slate-700">
                {s.charAt(0).toUpperCase() + s.slice(1)}s
              </span>
              <span className="text-xs text-slate-400 ml-auto">({facets.species[s] || 0})</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sex */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Sex</label>
        <select
          value={currentFilters.sex}
          onChange={(e) => handleFilterChange('sex', e.target.value || undefined)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm bg-white"
        >
          <option value="">Any</option>
          {filterOptions.sex
            .filter((s): s is string => s !== null)
            .map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
        </select>
      </div>

      {/* Size */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Size</label>
        <select
          value={currentFilters.size}
          onChange={(e) => handleFilterChange('size', e.target.value || undefined)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm bg-white"
        >
          <option value="">Any</option>
          {filterOptions.size
            .filter((s): s is string => s !== null)
            .map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
        </select>
      </div>

      {/* Breed (if available) */}
      {filterOptions.breeds.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Breed</label>
          <select
            value={currentFilters.breed}
            onChange={(e) => handleFilterChange('breed', e.target.value || undefined)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm bg-white"
          >
            <option value="">Any</option>
            {filterOptions.breeds.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Good With */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Good With</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentFilters.goodWithDogs}
              onChange={(e) => handleFilterChange('goodWithDogs', e.target.checked || undefined)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              style={{ accentColor: primaryColor }}
            />
            <span className="text-sm text-slate-700">🐕 Dogs</span>
            <span className="text-xs text-slate-400 ml-auto">({facets.goodWithDogs})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentFilters.goodWithCats}
              onChange={(e) => handleFilterChange('goodWithCats', e.target.checked || undefined)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              style={{ accentColor: primaryColor }}
            />
            <span className="text-sm text-slate-700">🐱 Cats</span>
            <span className="text-xs text-slate-400 ml-auto">({facets.goodWithCats})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentFilters.goodWithKids}
              onChange={(e) => handleFilterChange('goodWithKids', e.target.checked || undefined)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              style={{ accentColor: primaryColor }}
            />
            <span className="text-sm text-slate-700">👶 Kids</span>
            <span className="text-xs text-slate-400 ml-auto">({facets.goodWithKids})</span>
          </label>
        </div>
      </div>

      {/* Special Needs */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={currentFilters.specialNeeds}
            onChange={(e) => handleFilterChange('specialNeeds', e.target.checked || undefined)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            style={{ accentColor: primaryColor }}
          />
          <span className="text-sm text-slate-700">❤️ Special Needs</span>
          <span className="text-xs text-slate-400 ml-auto">({facets.specialNeeds})</span>
        </label>
      </div>

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <button
          onClick={handleClearAll}
          className="w-full py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Clear All Filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <div className="sticky top-24 bg-white rounded-xl border border-slate-200 p-5 shadow-sm max-h-[calc(100vh-120px)] overflow-y-auto">
          <h2 className="font-semibold text-slate-900 mb-4">Filters</h2>
          <FilterContent />
        </div>
      </div>

      {/* Mobile Filter Bar */}
      <div className="lg:hidden mb-4">
        <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm"
            style={{ backgroundColor: primaryColor, color: 'white' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          <select
            value={currentFilters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm bg-white"
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </select>
        </div>

        {/* Active filter badges */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {currentFilters.species && (
              <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full flex items-center gap-1">
                {currentFilters.species}
                <button onClick={() => handleFilterChange('species', undefined)}>×</button>
              </span>
            )}
            {currentFilters.q && (
              <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full flex items-center gap-1">
                "{currentFilters.q}"
                <button onClick={() => { setSearchQuery(''); handleFilterChange('q', undefined); }}>×</button>
              </span>
            )}
            {currentFilters.goodWithKids && (
              <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full flex items-center gap-1">
                Kid Friendly
                <button onClick={() => handleFilterChange('goodWithKids', undefined)}>×</button>
              </span>
            )}
            <button
              onClick={handleClearAll}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Mobile Filter Drawer */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Filters</h2>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Filter Content */}
            <div className="p-4">
              <FilterContent />
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-3 rounded-lg text-white font-semibold"
                style={{ backgroundColor: primaryColor }}
              >
                Show {totalCount} Result{totalCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
