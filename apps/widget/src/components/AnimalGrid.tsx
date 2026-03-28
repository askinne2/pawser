import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const speciesRaw = searchParams.get('species');
  const species =
    speciesRaw === null ? settings.defaultSpecies || 'all' : speciesRaw;
  const sex = searchParams.get('sex') || 'all';
  const size = searchParams.get('size') || 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const pageSize = settings.animalsPerPage || 24;

  const { animals, total, loading, error } = useAnimals({
    apiUrl: settings.apiUrl,
    orgSlug: settings.orgSlug,
    page,
    pageSize,
    species: species !== 'all' ? species : undefined,
    sex,
    size,
    search: search || undefined,
    sort,
  });

  const totalPages = Math.ceil(total / pageSize);

  const setSpecies = (v: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (v === 'all') p.set('species', 'all');
        else if (v === (settings.defaultSpecies || 'all')) p.delete('species');
        else p.set('species', v);
        p.delete('page');
        return p;
      },
      { replace: true }
    );
  };

  const setSex = (v: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (v === 'all') p.delete('sex');
        else p.set('sex', v);
        p.delete('page');
        return p;
      },
      { replace: true }
    );
  };

  const setSize = (v: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (v === 'all') p.delete('size');
        else p.set('size', v);
        p.delete('page');
        return p;
      },
      { replace: true }
    );
  };

  const setPage = (n: number) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (n <= 1) p.delete('page');
        else p.set('page', String(n));
        return p;
      },
      { replace: true }
    );
  };

  const resetListPage = () => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('page');
        return p;
      },
      { replace: true }
    );
  };

  const clearAllFilters = () => {
    setSearchParams({}, { replace: true });
    setSearch('');
    setSort('newest');
  };

  const appliedFilterCount =
    (speciesRaw !== null ? 1 : 0) +
    (sex !== 'all' ? 1 : 0) +
    (size !== 'all' ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const hasExplicitListFilters =
    speciesRaw !== null || sex !== 'all' || size !== 'all' || !!search.trim();

  return (
    <div className="flex gap-8">
      <div className="hidden lg:block">
        <FilterSidebar
          species={species}
          onSpeciesChange={setSpecies}
          sex={sex}
          onSexChange={setSex}
          size={size}
          onSizeChange={setSize}
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            resetListPage();
          }}
          sort={sort}
          onSortChange={(v) => {
            setSort(v);
            resetListPage();
          }}
          onClearAll={clearAllFilters}
        />
      </div>

      <div className="flex-1">
        <div className="lg:hidden mb-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative flex items-center gap-2 bg-surface-container-lowest px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {appliedFilterCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-primary text-on-primary text-[10px] font-black">
                {appliedFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        {error ? (
          <div className="bg-error-container text-error p-4 rounded-xl mb-4 text-sm font-semibold">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: pageSize }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : animals.length === 0 ? (
          <EmptyState showClear={hasExplicitListFilters} onClear={clearAllFilters} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {animals.map((animal) => (
                <AnimalCard key={animal.id} animal={animal} onClick={onAnimalClick} />
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {drawerOpen ? (
        <FilterDrawer
          species={species}
          sex={sex}
          size={size}
          search={search}
          sort={sort}
          onApply={({ species: s, sex: x, size: z, search: q, sort: so }) => {
            setSearchParams(
              (prev) => {
                const p = new URLSearchParams(prev);
                if (s === 'all') p.set('species', 'all');
                else if (s === (settings.defaultSpecies || 'all')) p.delete('species');
                else p.set('species', s);
                if (x === 'all') p.delete('sex');
                else p.set('sex', x);
                if (z === 'all') p.delete('size');
                else p.set('size', z);
                p.delete('page');
                return p;
              },
              { replace: true }
            );
            setSearch(q);
            setSort(so);
            setDrawerOpen(false);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </div>
  );
}
