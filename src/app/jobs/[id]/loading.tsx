export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="h-7 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-5 w-1/3 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
        </div>
        <div className="mt-4 flex gap-3">
          <div className="h-7 w-28 animate-pulse rounded-full bg-gray-100" />
          <div className="h-7 w-20 animate-pulse rounded-full bg-gray-100" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="mt-6 space-y-2 border-t border-gray-100 pt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
