import { getStats } from "@/lib/queries";
import { formatNumber, platformColor } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stats",
  description: "Public statistics about jobs on JobHunt.",
};

export const revalidate = 300;

export default async function StatsPage() {
  const stats = await getStats();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Platform Stats</h1>
      <p className="mt-1 text-sm text-gray-500">
        Real-time breakdown of our job database
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
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

      <h2 className="mt-12 text-lg font-semibold text-gray-900">
        Jobs by Platform
      </h2>
      <div className="mt-4 space-y-3">
        {stats.platforms.map((p) => {
          const pct = Math.round((p.count / stats.totalJobs) * 100);
          return (
            <div key={p.source} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${platformColor(p.source)}`}
                >
                  {p.source || "unknown"}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatNumber(p.count)} ({pct}%)
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
