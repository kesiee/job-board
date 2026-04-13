import Link from "next/link";
import { getCompanies } from "@/lib/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Companies",
  description: "Browse companies hiring on JobHunt, sorted alphabetically.",
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const letter = typeof params.letter === "string" ? params.letter : "A";
  const companies = await getCompanies(letter === "#" ? undefined : letter);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
      <p className="mt-1 text-sm text-gray-500">
        Browse companies by name
      </p>

      <div className="mt-6 flex flex-wrap gap-1">
        {ALPHABET.map((l) => (
          <Link
            key={l}
            href={`/companies?letter=${l}`}
            className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${
              l === letter
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {l}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {companies.map((c) => (
          <Link
            key={c.company}
            href={`/jobs?company=${encodeURIComponent(c.company)}`}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
          >
            <span className="font-medium text-gray-900 truncate">
              {c.company}
            </span>
            <span className="ml-2 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {c.job_count}
            </span>
          </Link>
        ))}
      </div>

      {companies.length === 0 && (
        <p className="py-12 text-center text-gray-500">
          No companies found for this letter.
        </p>
      )}
    </div>
  );
}
