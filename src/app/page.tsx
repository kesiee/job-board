import Link from "next/link";
import { getStats } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

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

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl font-bold text-gray-900">
            {formatNumber(stats.totalJobs)}
          </p>
          <p className="mt-1 text-sm text-gray-500">Total Jobs</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl font-bold text-gray-900">
            {formatNumber(stats.totalCompanies)}
          </p>
          <p className="mt-1 text-sm text-gray-500">Companies</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl font-bold text-green-600">
            +{formatNumber(stats.todayJobs)}
          </p>
          <p className="mt-1 text-sm text-gray-500">Added Today</p>
        </div>
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
