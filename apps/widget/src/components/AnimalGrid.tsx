import { useState } from 'react';
import { useAnimals } from '../hooks/useAnimals';
import { AnimalCard } from './AnimalCard';
import { FilterSidebar } from './FilterSidebar';
import { FilterDrawer } from './FilterDrawer';
import { Pagination } from './Pagination';
import { SkeletonCard } from './SkeletonCard';
import { EmptyState } from './EmptyState';
import type { PawserAnimal, PawserSettings } from '../types';

interface AnimalGridProps {
  settings: PawserSettings;
  onAnimalClick: (animal: PawserAnimal) => void;
}

export function AnimalGrid({ settings, onAnimalClick }: AnimalGridProps) {
  const [page, setPage] = useState(1);
  const [species, setSpecies] = useState(settings.defaultSpecies || 'all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pageSize = settings.animalsPerPage || 24;

  const { animals, total, loading, error } = useAnimals({
    apiUrl: settings.apiUrl,
    orgSlug: settings.orgSlug,
    page,
    pageSize,
    species: species !== 'all' ? species : undefined,
    search: search || undefined,
    sort,
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex gap-8">
      {/* Desktop Filter Sidebar */}
      <div className="hidden lg:block">
        <FilterSidebar
          species={species}
          onSpeciesChange={(v) => { setSpecies(v); setPage(1); }}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          sort={sort}
          onSortChange={(v) => { setSort(v); setPage(1); }}
        />
      </div>

      <div className="flex-1">
        {/* Mobile filter button */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
        </div>

        {error && (
          <div className="bg-error-container text-error p-4 rounded-xl mb-4 text-sm font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : animals.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {animals.map((animal) => (
                <AnimalCard key={animal.id} animal={animal} onClick={onAnimalClick} />
              ))}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              primaryColor={settings.primaryColor}
            />
          </>
        )}
      </div>

      {drawerOpen && (
        <FilterDrawer
          species={species}
          onSpeciesChange={(v) => { setSpecies(v); setPage(1); }}
          sort={sort}
          onSortChange={(v) => { setSort(v); setPage(1); }}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
