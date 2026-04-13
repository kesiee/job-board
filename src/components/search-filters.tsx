"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

export function SearchFilters({ sources }: { sources: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset to page 1 on filter change
      startTransition(() => {
        router.push(`/jobs?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Search jobs or companies..."
          defaultValue={searchParams.get("q") || ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams("q", (e.target as HTMLInputElement).value);
            }
          }}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        )}
      </div>

      <select
        defaultValue={searchParams.get("source") || ""}
        onChange={(e) => updateParams("source", e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
      >
        <option value="">All platforms</option>
        {sources.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Location..."
        defaultValue={searchParams.get("location") || ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            updateParams("location", (e.target as HTMLInputElement).value);
          }
        }}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none sm:w-40"
      />

      <input
        type="text"
        placeholder="Company..."
        defaultValue={searchParams.get("company") || ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            updateParams("company", (e.target as HTMLInputElement).value);
          }
        }}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none sm:w-40"
      />

      <select
        defaultValue={searchParams.get("sort") || "newest"}
        onChange={(e) => updateParams("sort", e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
      >
        <option value="newest">Newest first</option>
        <option value="company">Company A-Z</option>
      </select>
    </div>
  );
}
