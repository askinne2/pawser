'use client';

import { useRouter } from 'next/navigation';

interface FilterBarProps {
  domain: string;
  currentFilters: {
    species?: string;
    sex?: string;
    size?: string;
    sort?: string;
  };
  filterOptions: {
    species: string[];
    sex: (string | null)[];
    size: (string | null)[];
  };
  primaryColor: string;
}

export default function FilterBar({
  domain,
  currentFilters,
  filterOptions,
  primaryColor,
}: FilterBarProps) {
  const router = useRouter();

  const buildQuery = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...currentFilters, ...updates };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && v !== '') params.set(k, v);
    });
    // Always reset to page 1 when filters change
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const handleFilterChange = (key: string, value: string) => {
    const query = buildQuery({ [key]: value || undefined });
    router.push(`/${domain}/animals${query}`);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      {/* Species Filter */}
      <div>
        <label
          htmlFor="species"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            color: '#374151',
            marginBottom: '0.25rem',
          }}
        >
          Species
        </label>
        <select
          id="species"
          value={currentFilters.species || ''}
          onChange={(e) => handleFilterChange('species', e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white',
            minWidth: '120px',
          }}
        >
          <option value="">All Species</option>
          {filterOptions.species.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}s
            </option>
          ))}
        </select>
      </div>

      {/* Sex Filter */}
      <div>
        <label
          htmlFor="sex"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            color: '#374151',
            marginBottom: '0.25rem',
          }}
        >
          Sex
        </label>
        <select
          id="sex"
          value={currentFilters.sex || ''}
          onChange={(e) => handleFilterChange('sex', e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white',
            minWidth: '100px',
          }}
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

      {/* Size Filter */}
      <div>
        <label
          htmlFor="size"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            color: '#374151',
            marginBottom: '0.25rem',
          }}
        >
          Size
        </label>
        <select
          id="size"
          value={currentFilters.size || ''}
          onChange={(e) => handleFilterChange('size', e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white',
            minWidth: '100px',
          }}
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

      {/* Sort */}
      <div style={{ marginLeft: 'auto' }}>
        <label
          htmlFor="sort"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            color: '#374151',
            marginBottom: '0.25rem',
          }}
        >
          Sort by
        </label>
        <select
          id="sort"
          value={currentFilters.sort || 'createdAt_desc'}
          onChange={(e) => handleFilterChange('sort', e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white',
            minWidth: '150px',
          }}
        >
          <option value="createdAt_desc">Newest First</option>
          <option value="createdAt_asc">Oldest First</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
        </select>
      </div>
    </div>
  );
}
