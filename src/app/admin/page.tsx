import { redirect } from "next/navigation";
import { getAnalytics, clearAnalytics } from "@/lib/queries";
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

  // Handle clear action
  if (params.action === "clear") {
    await clearAnalytics();
    redirect(`/admin?secret=${secret}`);
  }

  const days = typeof params.days === "string" ? parseInt(params.days) : 30;
  const data = await getAnalytics(days);
  const totalSearches = data.searchesByDay.reduce((s, d) => s + d.count, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">
            Visitor analytics &amp; search insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
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
          <a
            href={`/admin?secret=${secret}&action=clear`}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Clear All
          </a>
        </div>
      </div>

      {/* Overview cards */}
      <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card label="Page Views" value={data.totalViews} />
        <Card label="Unique Visitors" value={data.uniqueVisitors} highlight />
        <Card label="Returning Visitors" value={data.returningVisitors} />
        <Card label="Avg Pages/Visit" value={data.avgPagesPerVisitor} decimal />
        <Card label="Total Searches" value={totalSearches} />
      </div>

      {/* Traffic chart: views + uniques by day */}
      <Section title="Traffic">
        <div className="space-y-1">
          <div className="flex gap-4 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-blue-300" /> Views
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-blue-600" /> Unique visitors
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium w-28">Date</th>
                <th className="pb-2 font-medium text-right w-16">Views</th>
                <th className="pb-2 font-medium text-right w-16">Uniques</th>
                <th className="pb-2 font-medium pl-4">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {data.viewsByDay.map((d) => {
                const max = Math.max(...data.viewsByDay.map((v) => v.count), 1);
                const uniqueDay = data.uniquesByDay.find((u) => u.day === d.day);
                const uniqueCount = uniqueDay?.count || 0;
                return (
                  <tr key={d.day} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-700">{d.day}</td>
                    <td className="py-1.5 text-right font-medium">{d.count}</td>
                    <td className="py-1.5 text-right font-medium text-blue-600">{uniqueCount}</td>
                    <td className="py-1.5 pl-4">
                      <div className="relative h-4">
                        <div
                          className="absolute inset-y-0 left-0 rounded bg-blue-200"
                          style={{ width: `${(d.count / max) * 100}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded bg-blue-500"
                          style={{ width: `${(uniqueCount / max) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Device + Location row */}
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <Section title="Devices">
          {data.devices.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {data.devices.map((d) => (
                <div key={d.device} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-gray-700">{d.device}</span>
                  <div className="text-sm">
                    <span className="font-medium">{d.count}</span>
                    <span className="ml-1 text-gray-400">({d.unique_count} unique)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Countries">
          {data.countries.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {data.countries.map((c) => (
                <div key={c.country} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{c.country}</span>
                  <div className="text-sm">
                    <span className="font-medium">{c.count}</span>
                    <span className="ml-1 text-gray-400">({c.unique_count} unique)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Cities">
          {data.cities.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {data.cities.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {decodeURIComponent(c.city)}{c.country ? `, ${c.country}` : ""}
                  </span>
                  <div className="text-sm">
                    <span className="font-medium">{c.count}</span>
                    <span className="ml-1 text-gray-400">({c.unique_count} unique)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Peak hours */}
      <Section title="Traffic by Hour (UTC)">
        {data.hourly.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex items-end gap-1 h-32">
            {Array.from({ length: 24 }, (_, h) => {
              const hour = h.toString().padStart(2, "0");
              const entry = data.hourly.find((e) => e.hour === hour);
              const count = entry?.count || 0;
              const max = Math.max(...data.hourly.map((e) => e.count), 1);
              return (
                <div key={h} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-blue-400 min-h-[2px]"
                    style={{ height: `${(count / max) * 100}%` }}
                    title={`${hour}:00 — ${count} views`}
                  />
                  <span className="text-[10px] text-gray-400">{h % 6 === 0 ? `${hour}` : ""}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Top pages + referrers */}
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <Section title="Top Pages">
          {data.topPages.length === 0 ? (
            <Empty />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Path</th>
                  <th className="pb-2 font-medium text-right">Views</th>
                  <th className="pb-2 font-medium text-right">Uniques</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.map((p) => (
                  <tr key={p.path} className="border-b border-gray-50">
                    <td className="py-1.5 font-mono text-xs text-gray-700 truncate max-w-[200px]">
                      {p.path}
                    </td>
                    <td className="py-1.5 text-right font-medium">{p.views}</td>
                    <td className="py-1.5 text-right text-blue-600">{p.unique_visitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Referrers">
          {data.referrers.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {data.referrers.map((r) => (
                <div key={r.referrer} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-700 truncate max-w-[250px]">
                    {r.referrer}
                  </span>
                  <span className="text-sm font-medium shrink-0">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Search analytics */}
      <Section title="Top Search Queries">
        {data.topSearches.length === 0 ? (
          <Empty label="No searches yet" />
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
                <span className="text-xs text-gray-400">
                  ({s.unique_searchers} ppl)
                </span>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Filter breakdowns */}
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <Section title="Platform Filters">
          {data.topSourceFilters.length === 0 ? (
            <Empty />
          ) : (
            data.topSourceFilters.map((s) => (
              <div key={s.source_filter} className="flex justify-between py-1 text-sm">
                <span className="text-gray-700">{s.source_filter}</span>
                <span className="font-medium">{s.count}</span>
              </div>
            ))
          )}
        </Section>

        <Section title="Location Filters">
          {data.topLocationFilters.length === 0 ? (
            <Empty />
          ) : (
            data.topLocationFilters.map((s) => (
              <div key={s.location_filter} className="flex justify-between py-1 text-sm">
                <span className="text-gray-700">{s.location_filter}</span>
                <span className="font-medium">{s.count}</span>
              </div>
            ))
          )}
        </Section>

        <Section title="Company Filters">
          {data.topCompanyFilters.length === 0 ? (
            <Empty />
          ) : (
            data.topCompanyFilters.map((s) => (
              <div key={s.company_filter} className="flex justify-between py-1 text-sm">
                <span className="text-gray-700">{s.company_filter}</span>
                <span className="font-medium">{s.count}</span>
              </div>
            ))
          )}
        </Section>
      </div>

      {/* Recent searches */}
      <Section title="Recent Searches (last 50)">
        {data.recentSearches.length === 0 ? (
          <Empty label="No searches yet" />
        ) : (
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
                    <td className="py-1.5 text-gray-500">{s.source_filter || "-"}</td>
                    <td className="py-1.5 text-gray-500">{s.location_filter || "-"}</td>
                    <td className="py-1.5 text-gray-500">{s.company_filter || "-"}</td>
                    <td className="py-1.5 text-right font-medium">{s.results_count}</td>
                    <td className="py-1.5 text-right text-gray-400 text-xs whitespace-nowrap">
                      {s.created_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Card({
  label,
  value,
  highlight,
  decimal,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  decimal?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-bold ${highlight ? "text-blue-600" : "text-gray-900"}`}>
        {decimal ? value : value.toLocaleString()}
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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Empty({ label = "No data yet" }: { label?: string }) {
  return <p className="text-sm text-gray-400">{label}</p>;
}
