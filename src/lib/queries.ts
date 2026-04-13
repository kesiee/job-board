import { db, ensureAnalyticsTables } from "./db";

export interface Job {
  id: number;
  title: string;
  company: string;
  url: string;
  description: string | null;
  location: string | null;
  source: string | null;
  ats_slug: string | null;
  date_posted: string | null;
  scraped_at: string | null;
}

export interface SearchParams {
  q?: string;
  source?: string;
  location?: string;
  company?: string;
  sort?: string;
  page?: number;
}

const PAGE_SIZE = 30;

export async function searchJobs(params: SearchParams) {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (params.q) {
    conditions.push("(title LIKE ? OR company LIKE ?)");
    args.push(`%${params.q}%`, `%${params.q}%`);
  }
  if (params.source) {
    conditions.push("source = ?");
    args.push(params.source);
  }
  if (params.location) {
    conditions.push("location LIKE ?");
    args.push(`%${params.location}%`);
  }
  if (params.company) {
    conditions.push("company LIKE ?");
    args.push(`%${params.company}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy =
    params.sort === "company" ? "company ASC, scraped_at DESC" : "scraped_at DESC";
  const page = Math.max(1, params.page || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [countResult, jobsResult] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as total FROM jobs ${where}`, args }),
    db.execute({
      sql: `SELECT id, title, company, url, location, source, date_posted, scraped_at FROM jobs ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      args: [...args, PAGE_SIZE, offset],
    }),
  ]);

  const total = Number(countResult.rows[0].total);

  // Log search if there were filters
  if (params.q || params.source || params.location || params.company) {
    logSearch(params, total).catch(() => {});
  }

  return {
    jobs: jobsResult.rows as unknown as Job[],
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

export async function getJob(id: number) {
  const result = await db.execute({
    sql: "SELECT * FROM jobs WHERE id = ?",
    args: [id],
  });
  return (result.rows[0] as unknown as Job) || null;
}

export async function getStats() {
  const [totalJobs, platformStats, todayJobs, totalCompanies] = await Promise.all([
    db.execute("SELECT COUNT(*) as count FROM jobs"),
    db.execute(
      "SELECT source, COUNT(*) as count FROM jobs GROUP BY source ORDER BY count DESC"
    ),
    db.execute(
      "SELECT COUNT(*) as count FROM jobs WHERE date(scraped_at) = date('now')"
    ),
    db.execute("SELECT COUNT(DISTINCT company) as count FROM jobs"),
  ]);

  return {
    totalJobs: Number(totalJobs.rows[0].count),
    platforms: platformStats.rows as unknown as { source: string; count: number }[],
    todayJobs: Number(todayJobs.rows[0].count),
    totalCompanies: Number(totalCompanies.rows[0].count),
  };
}

export async function getSources() {
  const result = await db.execute(
    "SELECT DISTINCT source FROM jobs WHERE source IS NOT NULL ORDER BY source"
  );
  return result.rows.map((r) => r.source as string);
}

export async function getCompanies(letter?: string) {
  const where = letter
    ? "WHERE UPPER(SUBSTR(company, 1, 1)) = ?"
    : "";
  const args = letter ? [letter.toUpperCase()] : [];

  const result = await db.execute({
    sql: `SELECT company, COUNT(*) as job_count FROM jobs ${where} GROUP BY company ORDER BY company ASC LIMIT 500`,
    args,
  });

  return result.rows as unknown as { company: string; job_count: number }[];
}

export async function logPageView(path: string, referrer?: string, userAgent?: string) {
  try {
    await ensureAnalyticsTables();
    await db.execute({
      sql: "INSERT INTO page_views (path, referrer, user_agent) VALUES (?, ?, ?)",
      args: [path, referrer || null, userAgent || null],
    });
  } catch {
    // silently fail - analytics should never break the app
  }
}

async function logSearch(params: SearchParams, resultsCount: number) {
  try {
    await ensureAnalyticsTables();
    await db.execute({
      sql: "INSERT INTO search_logs (query, source_filter, location_filter, company_filter, results_count) VALUES (?, ?, ?, ?, ?)",
      args: [
        params.q || null,
        params.source || null,
        params.location || null,
        params.company || null,
        resultsCount,
      ],
    });
  } catch {
    // silently fail
  }
}

export async function getAnalytics(days: number = 30) {
  await ensureAnalyticsTables();

  const [
    totalViews,
    viewsByDay,
    topPages,
    topSearches,
    searchesByDay,
    topSourceFilters,
    topLocationFilters,
    recentSearches,
  ] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as count FROM page_views WHERE created_at >= datetime('now', ?)`,
      args: [`-${days} days`],
    }),
    db.execute({
      sql: `SELECT date(created_at) as day, COUNT(*) as count FROM page_views WHERE created_at >= datetime('now', ?) GROUP BY day ORDER BY day DESC`,
      args: [`-${days} days`],
    }),
    db.execute({
      sql: `SELECT path, COUNT(*) as count FROM page_views WHERE created_at >= datetime('now', ?) GROUP BY path ORDER BY count DESC LIMIT 20`,
      args: [`-${days} days`],
    }),
    db.execute({
      sql: `SELECT query, COUNT(*) as count FROM search_logs WHERE query IS NOT NULL AND created_at >= datetime('now', ?) GROUP BY query ORDER BY count DESC LIMIT 30`,
      args: [`-${days} days`],
    }),
    db.execute({
      sql: `SELECT date(created_at) as day, COUNT(*) as count FROM search_logs WHERE created_at >= datetime('now', ?) GROUP BY day ORDER BY day DESC`,
      args: [`-${days} days`],
    }),
    db.execute({
      sql: `SELECT source_filter, COUNT(*) as count FROM search_logs WHERE source_filter IS NOT NULL AND created_at >= datetime('now', ?) GROUP BY source_filter ORDER BY count DESC LIMIT 10`,
      args: [`-${days} days`],
    }),
    db.execute({
      sql: `SELECT location_filter, COUNT(*) as count FROM search_logs WHERE location_filter IS NOT NULL AND created_at >= datetime('now', ?) GROUP BY location_filter ORDER BY count DESC LIMIT 10`,
      args: [`-${days} days`],
    }),
    db.execute({
      sql: `SELECT query, source_filter, location_filter, company_filter, results_count, created_at FROM search_logs ORDER BY created_at DESC LIMIT 50`,
      args: [],
    }),
  ]);

  return {
    totalViews: Number(totalViews.rows[0].count),
    viewsByDay: viewsByDay.rows as unknown as { day: string; count: number }[],
    topPages: topPages.rows as unknown as { path: string; count: number }[],
    topSearches: topSearches.rows as unknown as { query: string; count: number }[],
    searchesByDay: searchesByDay.rows as unknown as { day: string; count: number }[],
    topSourceFilters: topSourceFilters.rows as unknown as { source_filter: string; count: number }[],
    topLocationFilters: topLocationFilters.rows as unknown as { location_filter: string; count: number }[],
    recentSearches: recentSearches.rows as unknown as {
      query: string | null;
      source_filter: string | null;
      location_filter: string | null;
      company_filter: string | null;
      results_count: number;
      created_at: string;
    }[],
  };
}
