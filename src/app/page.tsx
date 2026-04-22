import Link from "next/link";
import { getStats } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

export const revalidate = 300;

const categories = [
  { label: "Sales", query: "sales account executive business development", icon: "🤝", count: "41K+" },
  { label: "Software Engineering", query: "software engineer developer full stack backend frontend", icon: "💻", count: "27K+" },
  { label: "IT / Support", query: "IT support helpdesk system admin technician", icon: "🖥️", count: "22K+" },
  { label: "Design / UX", query: "designer ux ui user experience graphic design", icon: "🎨", count: "22K+" },
  { label: "Healthcare", query: "healthcare nurse medical clinical therapist", icon: "🏥", count: "20K+" },
  { label: "Marketing", query: "marketing growth seo content brand social media", icon: "📈", count: "17K+" },
  { label: "Product & Program", query: "product manager program manager project manager", icon: "📋", count: "15K+" },
  { label: "Retail / Store", query: "store manager retail cashier merchandising grocery", icon: "🏪", count: "10K+" },
  { label: "Finance", query: "finance accountant financial analyst accounting", icon: "💰", count: "10K+" },
  { label: "Data & Analytics", query: "data scientist data analyst data engineer analytics", icon: "📊", count: "9K+" },
  { label: "HR / Recruiting", query: "recruiter talent human resources people", icon: "👥", count: "6K+" },
  { label: "QA / Testing", query: "qa quality test engineer automation tester", icon: "🧪", count: "6K+" },
  { label: "DevOps / Cloud", query: "devops sre cloud engineer platform infrastructure", icon: "⚙️", count: "6K+" },
  { label: "Customer Success", query: "customer service customer success account manager", icon: "🎧", count: "5K+" },
  { label: "Food & Hospitality", query: "cook restaurant server bartender hospitality", icon: "🍽️", count: "5K+" },
  { label: "AI / Machine Learning", query: "machine learning ai engineer deep learning nlp", icon: "🤖", count: "4K+" },
  { label: "Warehouse / Logistics", query: "warehouse logistics shipping forklift distribution", icon: "📦", count: "3K+" },
  { label: "Cybersecurity", query: "cybersecurity security engineer infosec penetration", icon: "🔒", count: "3K+" },
  { label: "Mobile Dev", query: "mobile ios android react native flutter", icon: "📱", count: "2K+" },
  { label: "Operations", query: "operations manager general manager department supervisor", icon: "🏢", count: "2K+" },
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
            href={`/jobs?q=${encodeURIComponent(cat.query)}`}
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
