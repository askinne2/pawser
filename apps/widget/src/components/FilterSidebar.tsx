interface FilterSidebarProps {
  species: string;
  onSpeciesChange: (species: string) => void;
  sex: string;
  onSexChange: (sex: string) => void;
  size: string;
  onSizeChange: (size: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  onClearAll: () => void;
}

function countBadge(n: number) {
  if (n <= 0) return null;
  return (
    <span className="ml-2 inline-flex min-w-[1.25rem] h-5 px-1 items-center justify-center rounded-full bg-primary text-on-primary text-[10px] font-black">
      {n}
    </span>
  );
}

export function FilterSidebar({
  species,
  onSpeciesChange,
  sex,
  onSexChange,
  size,
  onSizeChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  onClearAll,
}: FilterSidebarProps) {
  const speciesActive = species !== 'all' ? 1 : 0;
  const sexActive = sex !== 'all' ? 1 : 0;
  const sizeActive = size !== 'all' ? 1 : 0;
  const anyActive = speciesActive + sexActive + sizeActive > 0 || !!search.trim();

  return (
    <aside className="w-[260px] shrink-0 space-y-6 bg-surface-container-low rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Filters</span>
        {anyActive ? (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-bold text-primary hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div>
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
          Search
        </label>
        <input
          type="search"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-surface-container-lowest border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none transition-all text-on-surface text-sm shadow-sm"
        />
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm">
        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 flex items-center">
          Species
          {countBadge(speciesActive)}
        </div>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'All Animals' },
            { value: 'dog', label: 'Dogs' },
            { value: 'cat', label: 'Cats' },
            { value: 'other', label: 'Other' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSpeciesChange(option.value)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                species === option.value
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm">
        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 flex items-center">
          Sex
          {countBadge(sexActive)}
        </div>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSexChange(option.value)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                sex === option.value
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm">
        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 flex items-center">
          Size
          {countBadge(sizeActive)}
        </div>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
            { value: 'xlarge', label: 'X-Large' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSizeChange(option.value)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                size === option.value
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
          Sort By
        </label>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-3 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="newest">Newest</option>
          <option value="longest_stay">Longest Stay</option>
          <option value="name_asc">Name A-Z</option>
        </select>
      </div>
    </aside>
  );
}
