import { getJob, getRelatedJobs } from "@/lib/queries";
import { notFound } from "next/navigation";
import { timeAgo, formatSalary, isStale } from "@/lib/utils";
import { BackToJobs } from "@/components/back-to-jobs";
import { JobCard } from "@/components/job-card";
import { ApplyButton } from "@/components/apply-button";
import Link from "next/link";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(parseInt(id));
  if (!job) return { title: "Job Not Found" };
  return {
    title: `${job.title} at ${job.company}`,
    description: `${job.title} at ${job.company}${job.location ? ` in ${job.location}` : ""}. Apply now on JobHunt.`,
    openGraph: {
      title: `${job.title} at ${job.company}`,
      description: `${job.title} at ${job.company}${job.location ? ` — ${job.location}` : ""}`,
    },
  };
}

function jobPostingJsonLd(job: NonNullable<Awaited<ReturnType<typeof getJob>>>) {
  const datePosted = job.posted_at || job.date_posted || job.scraped_at;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description?.slice(0, 5000) || job.title,
    datePosted,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
    },
    directApply: false,
    url: job.url,
  };
  if (job.location) {
    data.jobLocation = {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.location },
    };
  }
  if (job.is_remote) {
    data.jobLocationType = "TELECOMMUTE";
  }
  if (job.employment_type) {
    data.employmentType = job.employment_type.toUpperCase().replace(/[^A-Z]/g, "_");
  }
  if (job.salary_min || job.salary_max) {
    data.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salary_currency || "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salary_min ?? undefined,
        maxValue: job.salary_max ?? undefined,
        unitText: "YEAR",
      },
    };
  }
  return data;
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(parseInt(id));
  if (!job) notFound();

  const related = await getRelatedJobs(job);
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const possiblyClosed = isStale(job.last_seen_at);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(job)) }}
      />

      <BackToJobs />

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {possiblyClosed && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This listing hasn&apos;t been seen on the company&apos;s careers page
            recently and may be closed.
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="mt-1 text-lg text-gray-600">{job.company}</p>
          </div>
          <ApplyButton
            jobId={job.id}
            url={job.url}
            className="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Apply &rarr;
          </ApplyButton>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {(job.location_display || job.location) && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {job.location_display || job.location}
            </span>
          )}
          {job.is_remote && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              Remote
            </span>
          )}
          {salary && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {salary}
            </span>
          )}
          {job.employment_type && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {job.employment_type}
            </span>
          )}
          {job.seniority && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {job.seniority}
            </span>
          )}
          {job.department && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {job.department}
            </span>
          )}
          {job.date_posted && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              Posted: {job.date_posted}
            </span>
          )}
          <span className="inline-flex items-center text-sm text-gray-400">
            Scraped {timeAgo(job.scraped_at)}
          </span>
        </div>

        {job.description && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Description
            </h2>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {job.description}
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-gray-100 pt-6">
          <ApplyButton
            jobId={job.id}
            url={job.url}
            className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            View full listing &amp; apply &rarr;
          </ApplyButton>
          <p className="mt-2 text-xs text-gray-400">
            Opens the original job posting on the company&apos;s careers page
          </p>
        </div>
      </div>

      {related.sameCompany.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              More at {job.company}
            </h2>
            <Link
              href={`/jobs?company=${encodeURIComponent(job.company)}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-1 shadow-sm">
            {related.sameCompany.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}

      {related.sameCategory.length > 0 && job.category && (
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Similar {job.category} jobs
            </h2>
            <Link
              href={`/jobs?category=${encodeURIComponent(job.category)}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-1 shadow-sm">
            {related.sameCategory.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
