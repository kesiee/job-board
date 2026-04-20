import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let analyticsInitialized = false;

export async function ensureAnalyticsTables() {
  if (analyticsInitialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      ip_hash TEXT,
      country TEXT,
      city TEXT,
      device TEXT,
      is_unique BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_logs (
      id SERIAL PRIMARY KEY,
      visitor_id TEXT NOT NULL DEFAULT 'anonymous',
      query TEXT,
      source_filter TEXT,
      location_filter TEXT,
      company_filter TEXT,
      results_count INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pv_visitor ON page_views(visitor_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pv_created ON page_views(created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sl_created ON search_logs(created_at)`);
  analyticsInitialized = true;
}

