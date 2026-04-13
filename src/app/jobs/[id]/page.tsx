import { getJob } from "@/lib/queries";
import { notFound } from "next/navigation";
import { timeAgo, platformColor } from "@/lib/utils";
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

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(parseInt(id));
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Back to jobs
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="mt-1 text-lg text-gray-600">{job.company}</p>
          </div>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Apply &rarr;
          </a>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {job.location && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {job.location}
            </span>
          )}
          {job.source && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${platformColor(job.source)}`}
            >
              {job.source}
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
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View original listing &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
