"use client";

import { useRouter } from "next/navigation";

export function BackToJobs() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
    >
      &larr; Back to jobs
    </button>
  );
}
