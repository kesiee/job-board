import { Suspense } from "react";
import Link from "next/link";
import { searchJobs, getCountries, COUNT_CAP } from "@/lib/queries";
import { SearchFilters } from "@/components/search-filters";
import { JobCard } from "@/components/job-card";
import { Pagination } from "@/components/pagination";
import { formatNumber, countryName } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Jobs",
  description: "Search and filter through 1.5 million+ open positions from top companies.",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const source = typeof params.source === "string" ? params.source : undefined;
  const location = typeof params.location === "string" ? params.location : undefined;
  const company = typeof params.company === "string" ? params.company : undefined;
  const country = typeof params.country === "string" ? params.country : undefined;
  const remote = params.remote === "1";
  const sort = typeof params.sort === "string" ? params.sort : undefined;
  const page = typeof params.page === "string" ? parseInt(params.page) : 1;

  const [{ jobs, total, totalPages }, countries] = await Promise.all([
    searchJobs({ q, category, source, location, company, country, remote, sort, page }),
    getCountries(),
  ]);

  const currentParams: Record<string, string> = {};
  if (q) currentParams.q = q;
  if (category) currentParams.category = category;
  if (source) currentParams.source = source;
  if (location) currentParams.location = location;
  if (company) currentParams.company = company;
  if (country) currentParams.country = country;
  if (remote) currentParams.remote = "1";
  if (sort) currentParams.sort = sort;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <p className="text-sm text-gray-500">
          {total >= COUNT_CAP ? `${COUNT_CAP.toLocaleString()}+` : formatNumber(total)} results
          {category && <> in {category}</>}
          {q && <> for &quot;{q}&quot;</>}
          {remote && <> (remote)</>}
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchFilters countries={countries} />
      </Suspense>

      <ActiveFilters currentParams={currentParams} />

      <div className="mt-6">
        {jobs.length === 0 ? (
          <p className="py-12 text-center text-gray-500">
            No jobs found. Try adjusting your search.
          </p>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/jobs"
        searchParams={currentParams}
      />
    </div>
  );
}

const FILTER_LABELS: Record<string, (v: string) => string> = {
  q: (v) => `"${v}"`,
  category: (v) => v,
  source: (v) => v,
  location: (v) => `Location: ${v}`,
  company: (v) => v,
  country: (v) => countryName(v),
  remote: () => "Remote",
};

function ActiveFilters({ currentParams }: { currentParams: Record<string, string> }) {
  const active = Object.entries(currentParams).filter(([k]) => k !== "sort");
  if (active.length === 0) return null;

  const urlWithout = (key: string) => {
    const rest = Object.entries(currentParams).filter(([k]) => k !== key);
    const qs = new URLSearchParams(rest).toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {active.map(([key, value]) => (
        <Link
          key={key}
          href={urlWithout(key)}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800 hover:bg-blue-100"
          title="Remove filter"
        >
          {(FILTER_LABELS[key] || ((v: string) => v))(value)}
          <span aria-hidden className="text-blue-400">×</span>
        </Link>
      ))}
      {active.length > 1 && (
        <Link href="/jobs" className="text-sm text-gray-500 hover:text-gray-700">
          Clear all
        </Link>
      )}
    </div>
  );
}
