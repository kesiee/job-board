import { pool } from "./db";
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
  last_seen_at: string | null;
  is_remote: boolean | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  seniority: string | null;
  employment_type: string | null;
  department: string | null;
  workplace_type: string | null;
  location_display: string | null;
  posted_at: string | null;
  category: string | null;
}

export interface SearchParams {
  q?: string;
  category?: string;
  source?: string;
  location?: string;
  company?: string;
  country?: string;
  remote?: boolean;
  sort?: string;
  page?: number;
}

const PAGE_SIZE = 30;

const CARD_COLUMNS =
  "id, title, company, url, location, source, date_posted, scraped_at, is_remote, salary_min, salary_max, salary_currency";

function buildFilters(
  params: SearchParams,
  conditions: string[],
  args: (string | number | boolean)[],
  startIdx: number
): number {
  let paramIdx = startIdx;
  if (params.category) {
    conditions.push(`category = $${paramIdx++}`);
    args.push(params.category);
  }
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
  if (params.country) {
    conditions.push(`location_country = $${paramIdx++}`);
    args.push(params.country);
  }
  if (params.remote) {
    conditions.push(`is_remote = true`);
  }
  return paramIdx;
}

export async function searchJobs(params: SearchParams) {
  const page = Math.max(1, params.page || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const cacheKey = `search:${JSON.stringify(params)}`;
  const result = await cached(cacheKey, 60, async () => {
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
        `description_tsv @@ to_tsquery('english', $1)`
      ];
      const args: (string | number | boolean)[] = [tsQuery + ":*"];
      const paramIdx = buildFilters(params, conditions, args, 2);

      const where = `WHERE ${conditions.join(" AND ")}`;
      const orderBy =
        params.sort === "company"
          ? "company ASC, scraped_at DESC"
          : `CASE
               WHEN title ILIKE '%' || $${paramIdx} || '%' THEN 0
               ELSE 1
             END, scraped_at DESC`;

      // For ORDER BY, add raw search term for title ILIKE ranking
      const rawTerm = params.q.replace(/['"(){}[\]*:^~!@#$%&\\]/g, " ").trim();
      const jobsArgs = [...args, rawTerm, PAGE_SIZE, offset];
      const limitIdx = paramIdx + 1;
      const offsetIdx = paramIdx + 2;

      const [countResult, jobsResult] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total FROM jobs ${where}`, args),
        pool.query(
          `SELECT ${CARD_COLUMNS}
           FROM jobs ${where}
           ORDER BY ${orderBy}
           LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
          jobsArgs
        ),
      ]);

      const total = Number(countResult.rows[0].total);

      return {
        jobs: jobsResult.rows as Job[],
        total,
        page,
        totalPages: Math.ceil(total / PAGE_SIZE),
      };
    }

    // No text query — regular SQL with filters
    const conditions: string[] = [];
    const args: (string | number | boolean)[] = [];
    let paramIdx = buildFilters(params, conditions, args, 1);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy =
      params.sort === "company" ? "company ASC, scraped_at DESC" : "scraped_at DESC";

    const [countResult, jobsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM jobs ${where}`, args),
      pool.query(
        `SELECT ${CARD_COLUMNS}
         FROM jobs ${where}
         ORDER BY ${orderBy}
         LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        [...args, PAGE_SIZE, offset]
      ),
    ]);

    const total = Number(countResult.rows[0].total);

    return {
      jobs: jobsResult.rows as Job[],
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  });

  // Log outside the cache so repeat searches within the TTL are still counted
  if (params.q || params.source || params.location || params.company) {
    logSearch(params, result.total);
  }

  return result;
}

export async function getJob(id: number) {
  if (!Number.isInteger(id)) return null;
  const result = await pool.query(
    `SELECT id, title, company, url, description, location, source, ats_slug,
            date_posted, scraped_at, last_seen_at, is_remote,
            salary_min, salary_max, salary_currency,
            seniority, employment_type, department, workplace_type,
            location_display, posted_at, category
     FROM jobs WHERE id = $1`,
    [id]
  );
  return (result.rows[0] as Job) || null;
}

export async function getRelatedJobs(job: Job) {
  const result = await pool.query(
    `(SELECT ${CARD_COLUMNS} FROM jobs
      WHERE company = $1 AND id != $2
      ORDER BY scraped_at DESC LIMIT 5)
     UNION ALL
     (SELECT ${CARD_COLUMNS} FROM jobs
      WHERE category = $3 AND category IS NOT NULL AND company != $1 AND id != $2
      ORDER BY scraped_at DESC LIMIT 5)`,
    [job.company, job.id, job.category]
  );
  const rows = result.rows as Job[];
  return {
    sameCompany: rows.filter((j) => j.company === job.company),
    sameCategory: rows.filter((j) => j.company !== job.company),
  };
}

export function getStats() {
  return cached("stats", 300, async () => {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM jobs) as total_jobs,
        (SELECT COUNT(DISTINCT company) FROM jobs) as total_companies,
        (SELECT COUNT(*) FROM jobs WHERE scraped_at::date = CURRENT_DATE) as today_jobs,
        (SELECT COUNT(*) FROM jobs WHERE scraped_at::date = CURRENT_DATE - 1) as yesterday_jobs
    `);

    return {
      totalJobs: Number(result.rows[0].total_jobs),
      totalCompanies: Number(result.rows[0].total_companies),
      todayJobs: Number(result.rows[0].today_jobs),
      yesterdayJobs: Number(result.rows[0].yesterday_jobs),
    };
  });
}

export function getInsights() {
  return cached("insights", 300, async () => {
    // Sequential on purpose: five parallel full-table aggregates contend on the
    // small DB instance and can trip its 10s statement_timeout
    const daily = await pool.query(
      `SELECT scraped_at::date::text as day, COUNT(*) as count
       FROM jobs WHERE scraped_at >= NOW() - INTERVAL '14 days'
       GROUP BY scraped_at::date ORDER BY scraped_at::date DESC`
    );
    const remote = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE is_remote) as remote,
              COUNT(*) FILTER (WHERE salary_min IS NOT NULL OR salary_max IS NOT NULL) as with_salary
       FROM jobs`
    );
    const topCompanies = await pool.query(
      `SELECT company, COUNT(*) as count FROM jobs
       GROUP BY company ORDER BY count DESC LIMIT 15`
    );
    const sources = await pool.query(
      `SELECT source, COUNT(*) as count FROM jobs
       WHERE source IS NOT NULL GROUP BY source ORDER BY count DESC`
    );
    const salaries = await pool.query(
      `SELECT category,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_min) as median_min,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_max) as median_max,
              COUNT(*) as sample
       FROM jobs
       WHERE salary_min IS NOT NULL AND salary_currency = 'USD' AND category IS NOT NULL
       GROUP BY category HAVING COUNT(*) >= 100 ORDER BY median_min DESC`
    );

    return {
      addedByDay: daily.rows as { day: string; count: number }[],
      remoteJobs: Number(remote.rows[0].remote),
      withSalary: Number(remote.rows[0].with_salary),
      topCompanies: topCompanies.rows as { company: string; count: number }[],
      sources: sources.rows as { source: string; count: number }[],
      salaryByCategory: salaries.rows as {
        category: string;
        median_min: number;
        median_max: number;
        sample: number;
      }[],
    };
  });
}

export function getCategoryStats() {
  return cached("category-stats", 300, async () => {
    const result = await pool.query(
      "SELECT category, COUNT(*) as count FROM jobs WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC"
    );
    return result.rows as { category: string; count: number }[];
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

export function getCountries() {
  return cached("countries", 3600, async () => {
    const result = await pool.query(
      `SELECT location_country as country, COUNT(*) as count
       FROM jobs WHERE location_country IS NOT NULL
       GROUP BY location_country ORDER BY count DESC LIMIT 40`
    );
    return result.rows as { country: string; count: number }[];
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
  pool
    .query(
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
    .catch(() => {});
}

export function logSearch(params: SearchParams, resultsCount: number, visitorId?: string) {
  // Fire and forget
  pool
    .query(
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
    .catch(() => {});
}

export async function getAnalytics(days: number = 30) {
  // Consolidated into 4 queries using CTEs instead of 17 parallel queries
  const [pvStats, pvDaily, searchStats, searchRecent, zeroResults, viewedContent, appliedJobs] = await Promise.all([
    // Page view aggregates in one query
    pool.query(
      `WITH filtered AS (
        SELECT * FROM page_views
        WHERE created_at >= NOW() - $1::interval AND path NOT LIKE '/apply/%'
      )
      SELECT
        (SELECT COUNT(*) FROM filtered) as total_views,
        (SELECT COUNT(DISTINCT visitor_id) FROM filtered) as unique_visitors,
        (SELECT COUNT(*) FROM (SELECT visitor_id FROM filtered GROUP BY visitor_id HAVING COUNT(*) > 1) r) as returning_visitors,
        (SELECT COUNT(*) FROM (SELECT visitor_id FROM filtered GROUP BY visitor_id HAVING COUNT(*) = 1) b) as bounced,
        (SELECT ROUND(AVG(c)::numeric, 1) FROM (SELECT COUNT(*) as c FROM filtered GROUP BY visitor_id) a) as avg_pages,
        (SELECT COUNT(*) FROM filtered WHERE path ~ '^/jobs/[0-9]+$') as job_views,
        (SELECT COUNT(*) FROM page_views
         WHERE created_at >= NOW() - $1::interval AND path LIKE '/apply/%') as apply_clicks`,
      [`${days} days`]
    ),
    // Daily breakdown + top pages + devices + countries + cities + referrers + hourly — one big query
    pool.query(
      `WITH filtered AS (
        SELECT * FROM page_views
        WHERE created_at >= NOW() - $1::interval AND path NOT LIKE '/apply/%'
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
        SELECT substring(referrer from '^(?:https?://)?(?:www\\.)?([^/]+)') as referrer, COUNT(*) as count
        FROM filtered WHERE referrer IS NOT NULL AND referrer != ''
        GROUP BY 1 ORDER BY count DESC LIMIT 15
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
    // Zero-result searches — demand the site can't serve
    pool.query(
      `SELECT query, COUNT(*) as count
       FROM search_logs
       WHERE created_at >= NOW() - $1::interval AND results_count = 0 AND query IS NOT NULL
       GROUP BY query ORDER BY count DESC LIMIT 20`,
      [`${days} days`]
    ),
    // Most viewed jobs and companies (from /jobs/:id page views joined to jobs)
    pool.query(
      `WITH job_views AS (
        SELECT substring(path from '[0-9]+')::int as job_id, COUNT(*) as views
        FROM page_views
        WHERE created_at >= NOW() - $1::interval AND path ~ '^/jobs/[0-9]+$'
        GROUP BY 1
      )
      SELECT json_build_object(
        'jobs', (
          SELECT COALESCE(json_agg(t), '[]') FROM (
            SELECT v.job_id, v.views, j.title, j.company
            FROM job_views v LEFT JOIN jobs j ON j.id = v.job_id
            ORDER BY v.views DESC LIMIT 15
          ) t
        ),
        'companies', (
          SELECT COALESCE(json_agg(t), '[]') FROM (
            SELECT j.company, SUM(v.views)::int as views, COUNT(*)::int as jobs_viewed
            FROM job_views v JOIN jobs j ON j.id = v.job_id
            GROUP BY j.company ORDER BY SUM(v.views) DESC LIMIT 15
          ) t
        )
      ) as data`,
      [`${days} days`]
    ),
    // Top applied jobs (apply clicks logged as /apply/:id page_views rows)
    pool.query(
      `WITH clicks AS (
        SELECT substring(path from '[0-9]+')::int as job_id, COUNT(*) as clicks
        FROM page_views
        WHERE created_at >= NOW() - $1::interval AND path ~ '^/apply/[0-9]+$'
        GROUP BY 1
      )
      SELECT c.job_id, c.clicks, j.title, j.company
      FROM clicks c LEFT JOIN jobs j ON j.id = c.job_id
      ORDER BY c.clicks DESC LIMIT 15`,
      [`${days} days`]
    ),
  ]);

  const pv = pvDaily.rows[0].data;
  const sr = searchStats.rows[0].data;
  const viewed = viewedContent.rows[0].data;

  return {
    totalViews: Number(pvStats.rows[0].total_views),
    uniqueVisitors: Number(pvStats.rows[0].unique_visitors),
    returningVisitors: Number(pvStats.rows[0].returning_visitors),
    bouncedVisitors: Number(pvStats.rows[0].bounced),
    avgPagesPerVisitor: Number(pvStats.rows[0].avg_pages || 0),
    jobViews: Number(pvStats.rows[0].job_views),
    applyClicks: Number(pvStats.rows[0].apply_clicks),
    topAppliedJobs: appliedJobs.rows as {
      job_id: number;
      clicks: number;
      title: string | null;
      company: string | null;
    }[],
    zeroResultSearches: zeroResults.rows as { query: string; count: number }[],
    topViewedJobs: viewed.jobs as {
      job_id: number;
      views: number;
      title: string | null;
      company: string | null;
    }[],
    topViewedCompanies: viewed.companies as {
      company: string;
      views: number;
      jobs_viewed: number;
    }[],
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
