export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

export function platformColor(source: string | null): string {
  const colors: Record<string, string> = {
    greenhouse: "bg-green-100 text-green-800",
    lever: "bg-blue-100 text-blue-800",
    smartrecruiters: "bg-purple-100 text-purple-800",
    workable: "bg-orange-100 text-orange-800",
    rippling: "bg-pink-100 text-pink-800",
    gem: "bg-cyan-100 text-cyan-800",
    ashby: "bg-yellow-100 text-yellow-800",
    workday: "bg-red-100 text-red-800",
    bigtech: "bg-indigo-100 text-indigo-800",
    tiktok: "bg-slate-100 text-slate-800",
    microsoft: "bg-sky-100 text-sky-800",
    nvidia: "bg-lime-100 text-lime-800",
  };
  return colors[source || ""] || "bg-gray-100 text-gray-800";
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
