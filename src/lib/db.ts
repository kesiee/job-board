import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

let analyticsInitialized = false;

export async function ensureAnalyticsTables() {
  if (analyticsInitialized) return;
  await db.batch([
    `CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      ip_hash TEXT,
      country TEXT,
      city TEXT,
      device TEXT,
      is_unique INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS search_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      query TEXT,
      source_filter TEXT,
      location_filter TEXT,
      company_filter TEXT,
      results_count INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pv_visitor ON page_views(visitor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pv_created ON page_views(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_sl_created ON search_logs(created_at)`,
  ]);
  analyticsInitialized = true;
}
