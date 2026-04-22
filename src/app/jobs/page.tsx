import { Suspense } from "react";
import { searchJobs, getSources } from "@/lib/queries";
import { SearchFilters } from "@/components/search-filters";
import { JobCard } from "@/components/job-card";
import { Pagination } from "@/components/pagination";
import { formatNumber } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Jobs",
  description: "Search and filter through 200,000+ open positions from top companies.",
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
  const sort = typeof params.sort === "string" ? params.sort : undefined;
  const page = typeof params.page === "string" ? parseInt(params.page) : 1;

  const [{ jobs, total, totalPages }, sources] = await Promise.all([
    searchJobs({ q, category, source, location, company, sort, page }),
    getSources(),
  ]);

  const currentParams: Record<string, string> = {};
  if (q) currentParams.q = q;
  if (category) currentParams.category = category;
  if (source) currentParams.source = source;
  if (location) currentParams.location = location;
  if (company) currentParams.company = company;
  if (sort) currentParams.sort = sort;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <p className="text-sm text-gray-500">
          {formatNumber(total)} results
          {category && <> in {category}</>}
          {q && <> for &quot;{q}&quot;</>}
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchFilters sources={sources} />
      </Suspense>

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
