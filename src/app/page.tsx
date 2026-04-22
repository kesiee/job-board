import Link from "next/link";
import { getStats } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

export const revalidate = 300;

const categories = [
  { label: "Sales", icon: "🤝", count: "41K+" },
  { label: "Software Engineering", icon: "💻", count: "27K+" },
  { label: "IT / Support", icon: "🖥️", count: "22K+" },
  { label: "Design / UX", icon: "🎨", count: "22K+" },
  { label: "Healthcare", icon: "🏥", count: "20K+" },
  { label: "Marketing", icon: "📈", count: "17K+" },
  { label: "Product & Program", icon: "📋", count: "15K+" },
  { label: "Retail / Store", icon: "🏪", count: "10K+" },
  { label: "Finance", icon: "💰", count: "10K+" },
  { label: "Data & Analytics", icon: "📊", count: "9K+" },
  { label: "HR / Recruiting", icon: "👥", count: "6K+" },
  { label: "QA / Testing", icon: "🧪", count: "6K+" },
  { label: "DevOps / Cloud", icon: "⚙️", count: "6K+" },
  { label: "Customer Success", icon: "🎧", count: "5K+" },
  { label: "Food & Hospitality", icon: "🍽️", count: "5K+" },
  { label: "AI / Machine Learning", icon: "🤖", count: "4K+" },
  { label: "Warehouse / Logistics", icon: "📦", count: "3K+" },
  { label: "Cybersecurity", icon: "🔒", count: "3K+" },
  { label: "Mobile Dev", icon: "📱", count: "2K+" },
  { label: "Operations", icon: "🏢", count: "2K+" },
];

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
        <p className="mt-2 text-sm text-gray-400">
          {formatNumber(stats.totalJobs)} jobs across{" "}
          {formatNumber(stats.totalCompanies)} companies
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

      <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((cat) => (
          <Link
            key={cat.label}
            href={`/jobs?category=${encodeURIComponent(cat.label)}`}
            className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="text-2xl">{cat.icon}</span>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {cat.label}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">{cat.count} jobs</p>
          </Link>
        ))}
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
