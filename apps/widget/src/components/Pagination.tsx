interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  primaryColor?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, primaryColor }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-30"
      >
        Previous
      </button>
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all active:scale-95 ${
            page === currentPage
              ? 'text-white'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
          style={page === currentPage ? { backgroundColor: primaryColor || '#00113f' } : undefined}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-30"
      >
        Next
      </button>
    </div>
  );
}
