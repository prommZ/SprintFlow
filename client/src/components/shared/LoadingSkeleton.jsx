export default function LoadingSkeleton({ count = 3, type = 'card' }) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
            <div className="h-4 bg-surface-3 rounded w-3/4" />
            <div className="h-3 bg-surface-3 rounded w-1/2" />
            <div className="h-3 bg-surface-3 rounded w-full" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 bg-surface-3 rounded w-16" />
              <div className="h-6 bg-surface-3 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 animate-pulse">
            <div className="w-5 h-5 bg-surface-3 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-3 rounded w-1/3" />
              <div className="h-3 bg-surface-3 rounded w-1/2" />
            </div>
            <div className="h-6 bg-surface-3 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'stats') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
            <div className="h-3 bg-surface-3 rounded w-1/2 mb-3" />
            <div className="h-8 bg-surface-3 rounded w-1/3 mb-2" />
            <div className="h-2 bg-surface-3 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
