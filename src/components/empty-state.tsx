export function EmptyState({
  title,
  body
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="empty-state" role="status">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}
