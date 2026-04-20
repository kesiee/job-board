import { pool, ensureAnalyticsTables } from "./db";
import { cached } from "./cache";

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
  const page = Math.max(1, params.page || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const cacheKey = `search:${JSON.stringify(params)}`;
  return cached(cacheKey, 60, async () => {
    if (params.q) {
      // Postgres full-text search
      const tsQuery = params.q
        .replace(/['"(){}[\]*:^~!@#$%&\\]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .join(" & ");

      if (!tsQuery) {
        return { jobs: [] as Job[], total: 0, page, totalPages: 0 };
      }

      const conditions: string[] = [
        `fts @@ to_tsquery('english', $1)`
      ];
      const args: (string | number)[] = [tsQuery + ":*"];
      let paramIdx = 2;

      if (params.source) {
        conditions.push(`source = $${paramIdx++}`);
        args.push(params.source);
      }
      if (params.location) {
        conditions.push(`location ILIKE $${paramIdx++}`);
        args.push(`%${params.location}%`);
      }
      if (params.company) {
        conditions.push(`company ILIKE $${paramIdx++}`);
        args.push(`%${params.company}%`);
      }

      const where = `WHERE ${conditions.join(" AND ")}`;
      const orderBy =
        params.sort === "company"
          ? "company ASC, scraped_at DESC"
          : `ts_rank(fts, to_tsquery('english', $1)) DESC, scraped_at DESC`;

      const [countResult, jobsResult] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total FROM jobs ${where}`, args),
        pool.query(
          `SELECT id, title, company, url, location, source, date_posted, scraped_at
           FROM jobs ${where}
           ORDER BY ${orderBy}
           LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
          [...args, PAGE_SIZE, offset]
        ),
      ]);

      const total = Number(countResult.rows[0].total);
      logSearch(params, total);

      return {
        jobs: jobsResult.rows as Job[],
        total,
        page,
        totalPages: Math.ceil(total / PAGE_SIZE),
      };
    }

    // No text query — regular SQL with filters
    const conditions: string[] = [];
    const args: (string | number)[] = [];
    let paramIdx = 1;

    if (params.source) {
      conditions.push(`source = $${paramIdx++}`);
      args.push(params.source);
    }
    if (params.location) {
      conditions.push(`location ILIKE $${paramIdx++}`);
      args.push(`%${params.location}%`);
    }
    if (params.company) {
      conditions.push(`company ILIKE $${paramIdx++}`);
      args.push(`%${params.company}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy =
      params.sort === "company" ? "company ASC, scraped_at DESC" : "scraped_at DESC";

    const [countResult, jobsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM jobs ${where}`, args),
      pool.query(
        `SELECT id, title, company, url, location, source, date_posted, scraped_at
         FROM jobs ${where}
         ORDER BY ${orderBy}
         LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        [...args, PAGE_SIZE, offset]
      ),
    ]);

    const total = Number(countResult.rows[0].total);

    if (params.source || params.location || params.company) {
      logSearch(params, total);
    }

    return {
      jobs: jobsResult.rows as Job[],
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  });
}

export async function getJob(id: number) {
  const result = await pool.query("SELECT * FROM jobs WHERE id = $1", [id]);
  return (result.rows[0] as Job) || null;
}

export function getStats() {
  return cached("stats", 300, async () => {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM jobs) as total_jobs,
        (SELECT COUNT(DISTINCT company) FROM jobs) as total_companies,
        (SELECT COUNT(*) FROM jobs WHERE scraped_at::date = CURRENT_DATE) as today_jobs
    `);
    const platformResult = await pool.query(
      "SELECT source, COUNT(*) as count FROM jobs GROUP BY source ORDER BY count DESC"
    );

    return {
      totalJobs: Number(result.rows[0].total_jobs),
      totalCompanies: Number(result.rows[0].total_companies),
      todayJobs: Number(result.rows[0].today_jobs),
      platforms: platformResult.rows as { source: string; count: number }[],
    };
  });
}

export function getSources() {
  return cached("sources", 600, async () => {
    const result = await pool.query(
      "SELECT DISTINCT source FROM jobs WHERE source IS NOT NULL ORDER BY source"
    );
    return result.rows.map((r) => r.source as string);
  });
}

export function getCompanies(letter?: string) {
  const cacheKey = `companies:${letter || "all"}`;
  return cached(cacheKey, 600, async () => {
    if (letter) {
      const result = await pool.query(
        `SELECT company, COUNT(*) as job_count FROM jobs
         WHERE UPPER(LEFT(company, 1)) = $1
         GROUP BY company ORDER BY company ASC LIMIT 500`,
        [letter.toUpperCase()]
      );
      return result.rows as { company: string; job_count: number }[];
    }
    const result = await pool.query(
      `SELECT company, COUNT(*) as job_count FROM jobs
       GROUP BY company ORDER BY company ASC LIMIT 500`
    );
    return result.rows as { company: string; job_count: number }[];
  });
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

export function logPageView(data: PageViewData) {
  // Fire and forget — don't await
  ensureAnalyticsTables()
    .then(() =>
      pool.query(
        `INSERT INTO page_views (visitor_id, path, referrer, user_agent, ip_hash, country, city, device, is_unique)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
           NOT EXISTS(SELECT 1 FROM page_views WHERE visitor_id = $1 LIMIT 1))`,
        [
          data.visitorId,
          data.path,
          data.referrer,
          data.userAgent,
          data.ipHash,
          data.country,
          data.city,
          data.device,
        ]
      )
    )
    .catch(() => {});
}

export function logSearch(params: SearchParams, resultsCount: number, visitorId?: string) {
  // Fire and forget
  ensureAnalyticsTables()
    .then(() =>
      pool.query(
        `INSERT INTO search_logs (visitor_id, query, source_filter, location_filter, company_filter, results_count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          visitorId || "anonymous",
          params.q || null,
          params.source || null,
          params.location || null,
          params.company || null,
          resultsCount,
        ]
      )
    )
    .catch(() => {});
}

export async function getAnalytics(days: number = 30) {
  await ensureAnalyticsTables();

  // Consolidated into 4 queries using CTEs instead of 17 parallel queries
  const [pvStats, pvDaily, searchStats, searchRecent] = await Promise.all([
    // Page view aggregates in one query
    pool.query(
      `WITH filtered AS (
        SELECT * FROM page_views WHERE created_at >= NOW() - $1::interval
      )
      SELECT
        (SELECT COUNT(*) FROM filtered) as total_views,
        (SELECT COUNT(DISTINCT visitor_id) FROM filtered) as unique_visitors,
        (SELECT COUNT(*) FROM (SELECT visitor_id FROM filtered GROUP BY visitor_id HAVING COUNT(*) > 1) r) as returning_visitors,
        (SELECT ROUND(AVG(c)::numeric, 1) FROM (SELECT COUNT(*) as c FROM filtered GROUP BY visitor_id) a) as avg_pages`,
      [`${days} days`]
    ),
    // Daily breakdown + top pages + devices + countries + cities + referrers + hourly — one big query
    pool.query(
      `WITH filtered AS (
        SELECT * FROM page_views WHERE created_at >= NOW() - $1::interval
      ),
      by_day AS (
        SELECT created_at::date::text as day, COUNT(*) as count, COUNT(DISTINCT visitor_id) as uniques
        FROM filtered GROUP BY created_at::date ORDER BY created_at::date DESC
      ),
      top_pages AS (
        SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_id) as unique_visitors
        FROM filtered GROUP BY path ORDER BY views DESC LIMIT 20
      ),
      devices AS (
        SELECT device, COUNT(*) as count, COUNT(DISTINCT visitor_id) as unique_count
        FROM filtered GROUP BY device ORDER BY count DESC
      ),
      countries AS (
        SELECT country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as unique_count
        FROM filtered WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 20
      ),
      cities AS (
        SELECT city, country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as unique_count
        FROM filtered WHERE city IS NOT NULL GROUP BY city, country ORDER BY count DESC LIMIT 20
      ),
      referrers AS (
        SELECT referrer, COUNT(*) as count
        FROM filtered WHERE referrer IS NOT NULL AND referrer != '' GROUP BY referrer ORDER BY count DESC LIMIT 15
      ),
      hourly AS (
        SELECT TO_CHAR(created_at, 'HH24') as hour, COUNT(*) as count
        FROM filtered GROUP BY hour ORDER BY hour
      )
      SELECT json_build_object(
        'by_day', (SELECT COALESCE(json_agg(by_day), '[]') FROM by_day),
        'top_pages', (SELECT COALESCE(json_agg(top_pages), '[]') FROM top_pages),
        'devices', (SELECT COALESCE(json_agg(devices), '[]') FROM devices),
        'countries', (SELECT COALESCE(json_agg(countries), '[]') FROM countries),
        'cities', (SELECT COALESCE(json_agg(cities), '[]') FROM cities),
        'referrers', (SELECT COALESCE(json_agg(referrers), '[]') FROM referrers),
        'hourly', (SELECT COALESCE(json_agg(hourly), '[]') FROM hourly)
      ) as data`,
      [`${days} days`]
    ),
    // Search aggregates
    pool.query(
      `WITH filtered AS (
        SELECT * FROM search_logs WHERE created_at >= NOW() - $1::interval
      ),
      by_day AS (
        SELECT created_at::date::text as day, COUNT(*) as count FROM filtered GROUP BY created_at::date ORDER BY created_at::date DESC
      ),
      top_queries AS (
        SELECT query, COUNT(*) as count, COUNT(DISTINCT visitor_id) as unique_searchers
        FROM filtered WHERE query IS NOT NULL GROUP BY query ORDER BY count DESC LIMIT 30
      ),
      top_sources AS (
        SELECT source_filter, COUNT(*) as count
        FROM filtered WHERE source_filter IS NOT NULL GROUP BY source_filter ORDER BY count DESC LIMIT 10
      ),
      top_locations AS (
        SELECT location_filter, COUNT(*) as count
        FROM filtered WHERE location_filter IS NOT NULL GROUP BY location_filter ORDER BY count DESC LIMIT 15
      ),
      top_companies AS (
        SELECT company_filter, COUNT(*) as count
        FROM filtered WHERE company_filter IS NOT NULL GROUP BY company_filter ORDER BY count DESC LIMIT 15
      )
      SELECT json_build_object(
        'by_day', (SELECT COALESCE(json_agg(by_day), '[]') FROM by_day),
        'top_queries', (SELECT COALESCE(json_agg(top_queries), '[]') FROM top_queries),
        'top_sources', (SELECT COALESCE(json_agg(top_sources), '[]') FROM top_sources),
        'top_locations', (SELECT COALESCE(json_agg(top_locations), '[]') FROM top_locations),
        'top_companies', (SELECT COALESCE(json_agg(top_companies), '[]') FROM top_companies)
      ) as data`,
      [`${days} days`]
    ),
    // Recent searches (no date filter)
    pool.query(
      `SELECT query, source_filter, location_filter, company_filter, results_count, created_at::text
       FROM search_logs ORDER BY created_at DESC LIMIT 50`
    ),
  ]);

  const pv = pvDaily.rows[0].data;
  const sr = searchStats.rows[0].data;

  return {
    totalViews: Number(pvStats.rows[0].total_views),
    uniqueVisitors: Number(pvStats.rows[0].unique_visitors),
    returningVisitors: Number(pvStats.rows[0].returning_visitors),
    avgPagesPerVisitor: Number(pvStats.rows[0].avg_pages || 0),
    viewsByDay: pv.by_day as { day: string; count: number }[],
    uniquesByDay: pv.by_day as { day: string; count: number; uniques: number }[],
    topPages: pv.top_pages as { path: string; views: number; unique_visitors: number }[],
    topSearches: sr.top_queries as { query: string; count: number; unique_searchers: number }[],
    searchesByDay: sr.by_day as { day: string; count: number }[],
    topSourceFilters: sr.top_sources as { source_filter: string; count: number }[],
    topLocationFilters: sr.top_locations as { location_filter: string; count: number }[],
    topCompanyFilters: sr.top_companies as { company_filter: string; count: number }[],
    recentSearches: searchRecent.rows as {
      query: string | null;
      source_filter: string | null;
      location_filter: string | null;
      company_filter: string | null;
      results_count: number;
      created_at: string;
    }[],
    devices: pv.devices as { device: string; count: number; unique_count: number }[],
    countries: pv.countries as { country: string; count: number; unique_count: number }[],
    cities: pv.cities as { city: string; country: string; count: number; unique_count: number }[],
    referrers: pv.referrers as { referrer: string; count: number }[],
    hourly: pv.hourly as { hour: string; count: number }[],
  };
}
