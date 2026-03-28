import { useEffect, useRef, useState } from 'react';

export interface FilterApplyPayload {
  species: string;
  sex: string;
  size: string;
  search: string;
  sort: string;
}

interface FilterDrawerProps {
  species: string;
  sex: string;
  size: string;
  search: string;
  sort: string;
  onApply: (payload: FilterApplyPayload) => void;
  onClose: () => void;
}

export function FilterDrawer({
  species,
  sex,
  size,
  search,
  sort,
  onApply,
  onClose,
}: FilterDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [visible, setVisible] = useState(false);
  const [draftSpecies, setDraftSpecies] = useState(species);
  const [draftSex, setDraftSex] = useState(sex);
  const [draftSize, setDraftSize] = useState(size);
  const [draftSearch, setDraftSearch] = useState(search);
  const [draftSort, setDraftSort] = useState(sort);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setDraftSpecies(species);
    setDraftSex(sex);
    setDraftSize(size);
    setDraftSearch(search);
    setDraftSort(sort);
  }, [species, sex, size, search, sort]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const list = [...focusables];
    list[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };

    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, []);

  const closeWithMotion = () => {
    setVisible(false);
    window.setTimeout(() => onClose(), 280);
  };

  const activeDraftCount =
    (draftSpecies !== 'all' ? 1 : 0) +
    (draftSex !== 'all' ? 1 : 0) +
    (draftSize !== 'all' ? 1 : 0) +
    (draftSearch.trim() ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="pawser-filter-drawer-title">
      <div
        role="presentation"
        className={`absolute inset-0 transition-opacity duration-300 ease-out backdrop-blur-sm bg-black/30 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closeWithMotion}
      />
      <div
        ref={panelRef}
        className={`relative z-10 w-full max-w-lg bg-surface-container-lowest rounded-t-2xl shadow-sm max-h-[85vh] flex flex-col transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          const endY = e.changedTouches[0].clientY;
          if (endY - touchStartY.current > 72) {
            closeWithMotion();
          }
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <span className="h-1 w-10 rounded-full bg-surface-container-highest" aria-hidden />
        </div>
        <div className="flex items-center justify-between px-6 pb-2">
          <h3 id="pawser-filter-drawer-title" className="text-lg font-bold text-on-surface">
            Filters
          </h3>
          <button type="button" onClick={closeWithMotion} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Search</label>
            <input
              type="search"
              placeholder="Search by name..."
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-3 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
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
                  type="button"
                  onClick={() => setDraftSpecies(option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    draftSpecies === option.value
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
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Sex</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDraftSex(option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    draftSex === option.value ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Size</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'small', label: 'S' },
                { value: 'medium', label: 'M' },
                { value: 'large', label: 'L' },
                { value: 'xlarge', label: 'XL' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDraftSize(option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    draftSize === option.value ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
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
              value={draftSort}
              onChange={(e) => setDraftSort(e.target.value)}
              className="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-3 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="longest_stay">Longest Stay</option>
              <option value="name_asc">Name A-Z</option>
            </select>
          </div>
        </div>

        <div className="border-t border-surface-container-high px-6 py-4 bg-surface-container-lowest">
          <button
            type="button"
            onClick={() =>
              onApply({
                species: draftSpecies,
                sex: draftSex,
                size: draftSize,
                search: draftSearch,
                sort: draftSort,
              })
            }
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold shadow-sm active:scale-[0.99] transition-transform"
          >
            Apply Filters ({activeDraftCount})
          </button>
        </div>
      </div>
    </div>
  );
}
