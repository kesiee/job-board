import { redirect } from "next/navigation";
import { getAnalytics } from "@/lib/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const secret = typeof params.secret === "string" ? params.secret : "";

  if (secret !== process.env.ADMIN_SECRET) {
    redirect("/");
  }

  const days = typeof params.days === "string" ? parseInt(params.days) : 30;
  const data = await getAnalytics(days);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">
            Visitor analytics and search insights
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((d) => (
            <a
              key={d}
              href={`/admin?secret=${secret}&days=${d}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                d === days
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      {/* Overview cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card label="Page Views" value={data.totalViews} period={`${days}d`} />
        <Card
          label="Searches"
          value={data.searchesByDay.reduce((s, d) => s + d.count, 0)}
          period={`${days}d`}
        />
        <Card
          label="Unique Queries"
          value={data.topSearches.length}
          period={`${days}d`}
        />
      </div>

      {/* Views by day */}
      <Section title="Page Views by Day">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium text-right">Views</th>
              <th className="pb-2 font-medium pl-4">Chart</th>
            </tr>
          </thead>
          <tbody>
            {data.viewsByDay.map((d) => {
              const max = Math.max(...data.viewsByDay.map((v) => v.count), 1);
              return (
                <tr key={d.day} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-700">{d.day}</td>
                  <td className="py-1.5 text-right font-medium">{d.count}</td>
                  <td className="py-1.5 pl-4">
                    <div
                      className="h-4 rounded bg-blue-200"
                      style={{ width: `${(d.count / max) * 100}%` }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      {/* Top pages */}
      <Section title="Top Pages">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Path</th>
              <th className="pb-2 font-medium text-right">Views</th>
            </tr>
          </thead>
          <tbody>
            {data.topPages.map((p) => (
              <tr key={p.path} className="border-b border-gray-50">
                <td className="py-1.5 font-mono text-gray-700">{p.path}</td>
                <td className="py-1.5 text-right font-medium">{p.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Top searches */}
      <Section title="Top Search Queries">
        {data.topSearches.length === 0 ? (
          <p className="text-gray-400 text-sm">No searches yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.topSearches.map((s) => (
              <span
                key={s.query}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm"
              >
                <span className="text-gray-800">{s.query}</span>
                <span className="rounded-full bg-blue-200 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                  {s.count}
                </span>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Platform filters */}
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <Section title="Top Platform Filters">
          {data.topSourceFilters.map((s) => (
            <div key={s.source_filter} className="flex justify-between py-1 text-sm">
              <span className="text-gray-700">{s.source_filter}</span>
              <span className="font-medium">{s.count}</span>
            </div>
          ))}
        </Section>

        <Section title="Top Location Filters">
          {data.topLocationFilters.map((s) => (
            <div key={s.location_filter} className="flex justify-between py-1 text-sm">
              <span className="text-gray-700">{s.location_filter}</span>
              <span className="font-medium">{s.count}</span>
            </div>
          ))}
        </Section>
      </div>

      {/* Recent searches */}
      <Section title="Recent Searches (last 50)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Query</th>
                <th className="pb-2 font-medium">Platform</th>
                <th className="pb-2 font-medium">Location</th>
                <th className="pb-2 font-medium">Company</th>
                <th className="pb-2 font-medium text-right">Results</th>
                <th className="pb-2 font-medium text-right">When</th>
              </tr>
            </thead>
            <tbody>
              {data.recentSearches.map((s, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-700">
                    {s.query || <span className="text-gray-300">-</span>}
                  </td>
                  <td className="py-1.5 text-gray-500">
                    {s.source_filter || "-"}
                  </td>
                  <td className="py-1.5 text-gray-500">
                    {s.location_filter || "-"}
                  </td>
                  <td className="py-1.5 text-gray-500">
                    {s.company_filter || "-"}
                  </td>
                  <td className="py-1.5 text-right font-medium">
                    {s.results_count}
                  </td>
                  <td className="py-1.5 text-right text-gray-400 text-xs">
                    {s.created_at}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Card({
  label,
  value,
  period,
}: {
  label: string;
  value: number;
  period: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">
        {label} <span className="text-gray-400">({period})</span>
      </p>
      <p className="mt-1 text-3xl font-bold text-gray-900">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {children}
      </div>
    </div>
  );
}
