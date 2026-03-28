export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-xl bg-surface-container-low mb-3" />
      <div className="h-4 bg-surface-container-low rounded w-2/3 mb-2" />
      <div className="h-3 bg-surface-container-low rounded w-1/2" />
    </div>
  );
}
