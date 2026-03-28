interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function scrollWidgetIntoView() {
  document.getElementById('pawser-root')?.scrollIntoView({ behavior: 'smooth' });
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    pages.push(i);
  }

  const go = (p: number) => {
    onPageChange(p);
    scrollWidgetIntoView();
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
      <button
        type="button"
        onClick={() => go(1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-30"
      >
        First
      </button>
      <button
        type="button"
        onClick={() => go(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-30"
      >
        Previous
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => go(page)}
          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all active:scale-95 ${
            page === currentPage
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        onClick={() => go(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-30"
      >
        Next
      </button>
      <button
        type="button"
        onClick={() => go(totalPages)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-30"
      >
        Last
      </button>
    </div>
  );
}
