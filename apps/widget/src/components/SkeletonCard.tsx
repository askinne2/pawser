export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-surface-container-lowest rounded-xl shadow-sm p-3">
      <div className="aspect-square rounded-xl bg-surface-container mb-3" />
      <div className="h-4 bg-surface-container rounded w-2/3 mb-2" />
      <div className="h-3 bg-surface-container rounded w-1/2 mb-3" />
      <div className="h-10 bg-surface-container rounded-xl" />
    </div>
  );
}
