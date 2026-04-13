import Link from "next/link";
import { getStats } from "@/lib/queries";
import { formatNumber, platformColor } from "@/lib/utils";

export const revalidate = 300;

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          JobHunt
        </h1>
        <p className="mt-3 text-xl text-gray-500">
          Every open role. One search.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          {formatNumber(stats.totalJobs)} jobs across{" "}
          {formatNumber(stats.totalCompanies)} companies
        </p>
      </div>

      <form action="/jobs" className="mt-10">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            placeholder="Search job titles, companies..."
            className="flex-1 rounded-xl border border-gray-300 bg-white px-5 py-3.5 text-base text-gray-900 shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            Search
          </button>
        </div>
      </form>

      <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {stats.platforms.map((p) => (
          <Link
            key={p.source}
            href={`/jobs?source=${p.source}`}
            className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
          >
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${platformColor(p.source)}`}
            >
              {p.source}
            </span>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatNumber(p.count)}
            </p>
            <p className="text-xs text-gray-500">jobs</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 flex justify-center gap-4">
        <Link
          href="/jobs"
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Browse All Jobs
        </Link>
        <Link
          href="/companies"
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Browse Companies
        </Link>
      </div>
    </div>
  );
}
