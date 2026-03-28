interface FilterSidebarProps {
  species: string;
  onSpeciesChange: (species: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
}

export function FilterSidebar({
  species,
  onSpeciesChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: FilterSidebarProps) {
  return (
    <aside className="w-[260px] shrink-0 space-y-6">
      <div>
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
          Search
        </label>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-on-surface text-sm"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
          Species
        </label>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'All Animals' },
            { value: 'dog', label: 'Dogs' },
            { value: 'cat', label: 'Cats' },
            { value: 'other', label: 'Other' },
          ].map((option) => (
            <button
              key={option.value}
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

      <div>
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
          Sort By
        </label>
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
    </aside>
  );
}
