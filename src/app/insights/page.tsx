import { getStats, getCategoryStats, getInsights, getCountries } from "@/lib/queries";
import { formatNumber, countryName } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Hiring trends, top companies, salaries, and market insights from 1.5 million+ open jobs.",
};

export const revalidate = 300;

const CATEGORY_STYLES = [
  "border-blue-100 bg-blue-50 text-blue-900",
  "border-emerald-100 bg-emerald-50 text-emerald-900",
  "border-violet-100 bg-violet-50 text-violet-900",
  "border-amber-100 bg-amber-50 text-amber-900",
  "border-rose-100 bg-rose-50 text-rose-900",
  "border-cyan-100 bg-cyan-50 text-cyan-900",
  "border-indigo-100 bg-indigo-50 text-indigo-900",
  "border-teal-100 bg-teal-50 text-teal-900",
  "border-orange-100 bg-orange-50 text-orange-900",
  "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-900",
  "border-lime-100 bg-lime-50 text-lime-900",
  "border-sky-100 bg-sky-50 text-sky-900",
];

export default async function InsightsPage() {
  // Sequential to keep concurrent load on the small DB instance low (10s
  // statement_timeout); results are cached so this only costs on revalidate
  const stats = await getStats();
  const categories = await getCategoryStats();
  const insights = await getInsights();
  const countries = await getCountries();

  const namedCategories = categories.filter((c) => c.category !== "Other");
  const topCategories = namedCategories.slice(0, 12);
  const moreCategories = namedCategories.slice(12).filter((c) => Number(c.count) >= 1000);
  const maxDaily = Math.max(...insights.addedByDay.map((d) => Number(d.count)), 1);
  const trendAsc = [...insights.addedByDay].reverse();
  const remotePct = ((insights.remoteJobs / stats.totalJobs) * 100).toFixed(1);
  const topCountries = countries.slice(0, 12);
  const maxCountry = Number(topCountries[0]?.count) || 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Job Market Insights</h1>
      <p className="mt-1 text-sm text-gray-500">
        Live trends from our job database, updated every few hours
      </p>

      {/* Overview cards */}
      <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard value={formatNumber(stats.totalJobs)} label="Open Jobs" />
        <StatCard value={formatNumber(stats.totalCompanies)} label="Companies" />
        <StatCard
          value={`+${formatNumber(stats.todayJobs)}`}
          label="Added Today"
          accent="text-green-600"
        />
        <StatCard
          value={`+${formatNumber(stats.yesterdayJobs)}`}
          label="Added Yesterday"
          accent="text-green-600"
        />
      </div>

      {/* 14-day hiring trend */}
      <Section title="Jobs Added — Last 14 Days">
        <div className="flex items-end gap-1.5 sm:gap-2">
          {trendAsc.map((d) => {
            // sqrt scale: rescrape days spike 20x and flatten normal days on a linear scale
            const pct = Math.max(
              (Math.sqrt(Number(d.count)) / Math.sqrt(maxDaily)) * 100,
              3
            );
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-[10px] font-semibold text-gray-600 sm:text-xs">
                  {formatNumber(Number(d.count))}
                </span>
                {/* fixed-height wrapper: percentage bar heights need a sized parent */}
                <div className="flex h-48 w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-green-500 to-emerald-400 transition-colors hover:from-green-600 hover:to-emerald-500"
                    style={{ height: `${pct}%` }}
                    title={`${d.day}: ${Number(d.count).toLocaleString()} jobs`}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{d.day.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Remote + salary coverage */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/jobs?remote=1"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-3xl font-bold text-emerald-600">
            {formatNumber(insights.remoteJobs)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Remote jobs ({remotePct}% of all listings) — browse them &rarr;
          </p>
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-3xl font-bold text-blue-600">
            {formatNumber(insights.withSalary)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Listings with published salary ranges
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {topCategories.map((cat, i) => (
            <Link
              key={cat.category}
              href={`/jobs?category=${encodeURIComponent(cat.category)}`}
              className={`group rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${CATEGORY_STYLES[i % CATEGORY_STYLES.length]}`}
            >
              <p className="text-2xl font-bold">
                {formatNumber(Number(cat.count))}
              </p>
              <p className="mt-1 text-sm font-medium leading-snug">
                {cat.category}
              </p>
            </Link>
          ))}
        </div>
        {moreCategories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {moreCategories.map((cat) => (
              <Link
                key={cat.category}
                href={`/jobs?category=${encodeURIComponent(cat.category)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              >
                {cat.category}
                <span className="text-xs text-gray-400">
                  {formatNumber(Number(cat.count))}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Salary by category */}
      {insights.salaryByCategory.length > 0 && (
        <Section title="Median Salary by Category (USD, where published)">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Median Range</th>
                <th className="pb-2 font-medium text-right">Sample</th>
              </tr>
            </thead>
            <tbody>
              {insights.salaryByCategory.map((s) => (
                <tr key={s.category} className="border-b border-gray-50">
                  <td className="py-2 text-gray-700">{s.category}</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    ${formatNumber(Math.round(Number(s.median_min)))}
                    {s.median_max && Number(s.median_max) > Number(s.median_min)
                      ? ` – $${formatNumber(Math.round(Number(s.median_max)))}`
                      : ""}
                  </td>
                  <td className="py-2 text-right text-gray-400">
                    {formatNumber(Number(s.sample))} jobs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Countries + top companies */}
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <Section title="Jobs by Country" flush>
          <div className="space-y-2.5">
            {topCountries.map((c) => (
              <Link
                key={c.country}
                href={`/jobs?country=${encodeURIComponent(c.country)}`}
                className="block group"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 group-hover:text-blue-600">
                    {countryName(c.country)}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(Number(c.count))}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-indigo-400"
                    style={{ width: `${(Number(c.count) / maxCountry) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </Section>

        <Section title="Top Hiring Companies" flush>
          <div className="space-y-1">
            {insights.topCompanies.map((c, i) => (
              <Link
                key={c.company}
                href={`/jobs?company=${encodeURIComponent(c.company)}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
              >
                <span className="text-gray-700 truncate">
                  <span className="mr-2 text-gray-400">{i + 1}.</span>
                  {c.company}
                </span>
                <span className="ml-2 shrink-0 font-medium text-gray-900">
                  {formatNumber(Number(c.count))}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      </div>

      {/* Sources */}
      <Section title="Jobs by Source Platform">
        <div className="flex flex-wrap gap-2">
          {insights.sources.map((s) => (
            <Link
              key={s.source}
              href={`/jobs?source=${encodeURIComponent(s.source)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"
            >
              <span className="text-gray-800 capitalize">{s.source}</span>
              <span className="text-xs font-medium text-gray-500">
                {formatNumber(Number(s.count))}
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}

function StatCard({
  value,
  label,
  accent = "text-gray-900",
}: {
  value: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function Section({
  title,
  children,
  flush,
}: {
  title: string;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <div className={flush ? "" : "mt-10"}>
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {children}
      </div>
    </div>
  );
}
