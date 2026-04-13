import Link from "next/link";
import { Job } from "@/lib/queries";
import { timeAgo, platformColor } from "@/lib/utils";

export function JobCard({ job }: { job: Job }) {
  return (
    <div className="border-b border-gray-100 py-3 px-1 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/jobs/${job.id}`}
            className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
          >
            {job.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{job.company}</span>
            {job.location && (
              <>
                <span className="text-gray-300">|</span>
                <span className="line-clamp-1">{job.location}</span>
              </>
            )}
            {job.source && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${platformColor(job.source)}`}
              >
                {job.source}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs text-gray-400 mt-1">
          {timeAgo(job.scraped_at)}
        </span>
      </div>
    </div>
  );
}
