export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-40 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="h-11 animate-pulse rounded-lg bg-gray-100" />
      <div className="mt-3 flex gap-3">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div className="mt-6 divide-y divide-gray-100">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="py-3 px-1">
            <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
