import { db, ensureAnalyticsTables, ensureFTSBackfill } from "./db";
import { cached } from "./cache";

export interface Job {
  id: number;
  title: string;
  company: string;
  url: string;
  location: string | null;
  source: string | null;
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
  await ensureFTSBackfill();

  const page = Math.max(1, params.page || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const useFTS = !!params.q;

  if (useFTS) {
    // FTS5 search with relevance ranking
    // Escape FTS special characters and build query
    const ftsQuery = params.q!
      .replace(/['"(){}[\]*:^~!@#$%&\\]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term}"*`)
      .join(" ");

    if (!ftsQuery) {
      return { jobs: [], total: 0, page, totalPages: 0 };
    }

    const filterConditions: string[] = [];
    const filterArgs: (string | number)[] = [];

    if (params.source) {
      filterConditions.push("j.source = ?");
      filterArgs.push(params.source);
    }
    if (params.location) {
      filterConditions.push("j.location LIKE ?");
      filterArgs.push(`%${params.location}%`);
    }
    if (params.company) {
      filterConditions.push("j.company LIKE ?");
      filterArgs.push(`%${params.company}%`);
    }

    const extraWhere =
      filterConditions.length > 0 ? `AND ${filterConditions.join(" AND ")}` : "";

    // Sort: relevance (rank) by default for FTS, unless user picks company
    const orderBy =
      params.sort === "company"
        ? "j.company ASC, j.scraped_at DESC"
        : "fts.rank, j.scraped_at DESC";

    const [countResult, jobsResult] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) as total FROM jobs_fts fts JOIN jobs j ON j.id = fts.rowid WHERE jobs_fts MATCH ? ${extraWhere}`,
        args: [ftsQuery, ...filterArgs],
      }),
      db.execute({
        sql: `SELECT j.id, j.title, j.company, j.url, j.location, j.source, j.date_posted, j.scraped_at
              FROM jobs_fts fts
              JOIN jobs j ON j.id = fts.rowid
              WHERE jobs_fts MATCH ? ${extraWhere}
              ORDER BY ${orderBy}
              LIMIT ? OFFSET ?`,
        args: [ftsQuery, ...filterArgs, PAGE_SIZE, offset],
      }),
    ]);

    const total = Number(countResult.rows[0].total);
    logSearch(params, total).catch(() => {});

    return {
      jobs: jobsResult.rows as unknown as Job[],
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  // No text query — use regular SQL for filters only
  const conditions: string[] = [];
  const args: (string | number)[] = [];

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

  const [countResult, jobsResult] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as total FROM jobs ${where}`, args }),
    db.execute({
      sql: `SELECT id, title, company, url, location, source, date_posted, scraped_at FROM jobs ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      args: [...args, PAGE_SIZE, offset],
    }),
  ]);

  const total = Number(countResult.rows[0].total);

  if (params.source || params.location || params.company) {
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

export function getStats() {
  return cached("stats", 300, async () => {
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
  });
}

export function getSources() {
  return cached("sources", 600, async () => {
    const result = await db.execute(
      "SELECT DISTINCT source FROM jobs WHERE source IS NOT NULL ORDER BY source"
    );
    return result.rows.map((r) => r.source as string);
  });
}

export async function getCompanies(letter?: string) {
  const where = letter ? "WHERE UPPER(SUBSTR(company, 1, 1)) = ?" : "";
  const args = letter ? [letter.toUpperCase()] : [];

  const result = await db.execute({
    sql: `SELECT company, COUNT(*) as job_count FROM jobs ${where} GROUP BY company ORDER BY company ASC LIMIT 500`,
    args,
  });

  return result.rows as unknown as { company: string; job_count: number }[];
}

interface PageViewData {
  visitorId: string;
  path: string;
  referrer: string | null;
  userAgent: string;
  ipHash: string;
  country: string | null;
  city: string | null;
  device: string;
}

export async function logPageView(data: PageViewData) {
  try {
    await ensureAnalyticsTables();

    // Single INSERT — compute is_unique via subquery instead of separate SELECT
    await db.execute({
      sql: `INSERT INTO page_views (visitor_id, path, referrer, user_agent, ip_hash, country, city, device, is_unique)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?,
              (SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END FROM page_views WHERE visitor_id = ?))`,
      args: [
        data.visitorId,
        data.path,
        data.referrer,
        data.userAgent,
        data.ipHash,
        data.country,
        data.city,
        data.device,
        data.visitorId,
      ],
    });
  } catch {
    // silently fail
  }
}

export async function logSearch(params: SearchParams, resultsCount: number, visitorId?: string) {
  try {
    await ensureAnalyticsTables();
    await db.execute({
      sql: "INSERT INTO search_logs (visitor_id, query, source_filter, location_filter, company_filter, results_count) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        visitorId || "anonymous",
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

  const range = `-${days} days`;

  const [
    totalViews,
    uniqueVisitors,
    returningVisitors,
    viewsByDay,
    uniquesByDay,
    topPages,
    topSearches,
    searchesByDay,
    topSourceFilters,
    topLocationFilters,
    topCompanyFilters,
    recentSearches,
    deviceBreakdown,
    countryBreakdown,
    cityBreakdown,
    referrerBreakdown,
    hourlyBreakdown,
    avgPagesPerVisitor,
  ] = await Promise.all([
    // Total page views
    db.execute({
      sql: `SELECT COUNT(*) as count FROM page_views WHERE created_at >= datetime('now', ?)`,
      args: [range],
    }),
    // Unique visitors
    db.execute({
      sql: `SELECT COUNT(DISTINCT visitor_id) as count FROM page_views WHERE created_at >= datetime('now', ?)`,
      args: [range],
    }),
    // Returning visitors (seen more than once)
    db.execute({
      sql: `SELECT COUNT(*) as count FROM (
        SELECT visitor_id FROM page_views WHERE created_at >= datetime('now', ?)
        GROUP BY visitor_id HAVING COUNT(*) > 1
      )`,
      args: [range],
    }),
    // Views by day
    db.execute({
      sql: `SELECT date(created_at) as day, COUNT(*) as count FROM page_views WHERE created_at >= datetime('now', ?) GROUP BY day ORDER BY day DESC`,
      args: [range],
    }),
    // Unique visitors by day
    db.execute({
      sql: `SELECT date(created_at) as day, COUNT(DISTINCT visitor_id) as count FROM page_views WHERE created_at >= datetime('now', ?) GROUP BY day ORDER BY day DESC`,
      args: [range],
    }),
    // Top pages
    db.execute({
      sql: `SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_id) as unique_visitors FROM page_views WHERE created_at >= datetime('now', ?) GROUP BY path ORDER BY views DESC LIMIT 20`,
      args: [range],
    }),
    // Top searches
    db.execute({
      sql: `SELECT query, COUNT(*) as count, COUNT(DISTINCT visitor_id) as unique_searchers FROM search_logs WHERE query IS NOT NULL AND created_at >= datetime('now', ?) GROUP BY query ORDER BY count DESC LIMIT 30`,
      args: [range],
    }),
    // Searches by day
    db.execute({
      sql: `SELECT date(created_at) as day, COUNT(*) as count FROM search_logs WHERE created_at >= datetime('now', ?) GROUP BY day ORDER BY day DESC`,
      args: [range],
    }),
    // Top platform filters
    db.execute({
      sql: `SELECT source_filter, COUNT(*) as count FROM search_logs WHERE source_filter IS NOT NULL AND created_at >= datetime('now', ?) GROUP BY source_filter ORDER BY count DESC LIMIT 10`,
      args: [range],
    }),
    // Top location filters
    db.execute({
      sql: `SELECT location_filter, COUNT(*) as count FROM search_logs WHERE location_filter IS NOT NULL AND created_at >= datetime('now', ?) GROUP BY location_filter ORDER BY count DESC LIMIT 15`,
      args: [range],
    }),
    // Top company filters
    db.execute({
      sql: `SELECT company_filter, COUNT(*) as count FROM search_logs WHERE company_filter IS NOT NULL AND created_at >= datetime('now', ?) GROUP BY company_filter ORDER BY count DESC LIMIT 15`,
      args: [range],
    }),
    // Recent searches
    db.execute({
      sql: `SELECT query, source_filter, location_filter, company_filter, results_count, created_at FROM search_logs ORDER BY created_at DESC LIMIT 50`,
      args: [],
    }),
    // Device breakdown
    db.execute({
      sql: `SELECT device, COUNT(*) as count, COUNT(DISTINCT visitor_id) as unique_count FROM page_views WHERE created_at >= datetime('now', ?) GROUP BY device ORDER BY count DESC`,
      args: [range],
    }),
    // Country breakdown
    db.execute({
      sql: `SELECT country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as unique_count FROM page_views WHERE country IS NOT NULL AND created_at >= datetime('now', ?) GROUP BY country ORDER BY count DESC LIMIT 20`,
      args: [range],
    }),
    // City breakdown
    db.execute({
      sql: `SELECT city, country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as unique_count FROM page_views WHERE city IS NOT NULL AND created_at >= datetime('now', ?) GROUP BY city, country ORDER BY count DESC LIMIT 20`,
      args: [range],
    }),
    // Referrer breakdown
    db.execute({
      sql: `SELECT referrer, COUNT(*) as count FROM page_views WHERE referrer IS NOT NULL AND referrer != '' AND created_at >= datetime('now', ?) GROUP BY referrer ORDER BY count DESC LIMIT 15`,
      args: [range],
    }),
    // Hourly breakdown (peak hours)
    db.execute({
      sql: `SELECT strftime('%H', created_at) as hour, COUNT(*) as count FROM page_views WHERE created_at >= datetime('now', ?) GROUP BY hour ORDER BY hour`,
      args: [range],
    }),
    // Avg pages per visitor
    db.execute({
      sql: `SELECT ROUND(AVG(page_count), 1) as avg_pages FROM (
        SELECT visitor_id, COUNT(*) as page_count FROM page_views WHERE created_at >= datetime('now', ?) GROUP BY visitor_id
      )`,
      args: [range],
    }),
  ]);

  return {
    totalViews: Number(totalViews.rows[0].count),
    uniqueVisitors: Number(uniqueVisitors.rows[0].count),
    returningVisitors: Number(returningVisitors.rows[0].count),
    avgPagesPerVisitor: Number(avgPagesPerVisitor.rows[0]?.avg_pages || 0),
    viewsByDay: viewsByDay.rows as unknown as { day: string; count: number }[],
    uniquesByDay: uniquesByDay.rows as unknown as { day: string; count: number }[],
    topPages: topPages.rows as unknown as { path: string; views: number; unique_visitors: number }[],
    topSearches: topSearches.rows as unknown as { query: string; count: number; unique_searchers: number }[],
    searchesByDay: searchesByDay.rows as unknown as { day: string; count: number }[],
    topSourceFilters: topSourceFilters.rows as unknown as { source_filter: string; count: number }[],
    topLocationFilters: topLocationFilters.rows as unknown as { location_filter: string; count: number }[],
    topCompanyFilters: topCompanyFilters.rows as unknown as { company_filter: string; count: number }[],
    recentSearches: recentSearches.rows as unknown as {
      query: string | null;
      source_filter: string | null;
      location_filter: string | null;
      company_filter: string | null;
      results_count: number;
      created_at: string;
    }[],
    devices: deviceBreakdown.rows as unknown as { device: string; count: number; unique_count: number }[],
    countries: countryBreakdown.rows as unknown as { country: string; count: number; unique_count: number }[],
    cities: cityBreakdown.rows as unknown as { city: string; country: string; count: number; unique_count: number }[],
    referrers: referrerBreakdown.rows as unknown as { referrer: string; count: number }[],
    hourly: hourlyBreakdown.rows as unknown as { hour: string; count: number }[],
  };
}

export async function clearAnalytics() {
  await ensureAnalyticsTables();
  await db.batch([
    "DELETE FROM page_views",
    "DELETE FROM search_logs",
  ]);
}
