export function MatchSkeleton() {
  return (
    <div className="glass rounded-2xl px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="skeleton h-4 w-10 rounded" />
        <div className="h-9 w-px bg-[var(--border)]" />
        <div className="flex flex-1 items-center gap-2">
          <div className="skeleton h-8 w-8 rounded-full" />
          <div className="skeleton h-3 flex-1 rounded" />
          <div className="skeleton h-5 w-10 rounded" />
          <div className="skeleton h-3 flex-1 rounded" />
          <div className="skeleton h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="skeleton mb-1 h-10 w-full rounded-xl" />
      {Array.from({ length: count }).map((_, i) => (
        <MatchSkeleton key={i} />
      ))}
    </div>
  );
}
