import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

let ftsInitialized = false;

export async function ensureFTS() {
  if (ftsInitialized) return;
  await db.batch([
    // FTS5 virtual table indexing title, company, location
    `CREATE VIRTUAL TABLE IF NOT EXISTS jobs_fts USING fts5(
      title, company, location,
      content='jobs', content_rowid='id',
      tokenize='unicode61 remove_diacritics 2'
    )`,

    // Triggers to keep FTS in sync when scraper inserts/updates/deletes
    `CREATE TRIGGER IF NOT EXISTS jobs_fts_insert AFTER INSERT ON jobs BEGIN
      INSERT INTO jobs_fts(rowid, title, company, location)
      VALUES (new.id, new.title, new.company, new.location);
    END`,

    `CREATE TRIGGER IF NOT EXISTS jobs_fts_delete AFTER DELETE ON jobs BEGIN
      INSERT INTO jobs_fts(jobs_fts, rowid, title, company, location)
      VALUES ('delete', old.id, old.title, old.company, old.location);
    END`,

    `CREATE TRIGGER IF NOT EXISTS jobs_fts_update AFTER UPDATE ON jobs BEGIN
      INSERT INTO jobs_fts(jobs_fts, rowid, title, company, location)
      VALUES ('delete', old.id, old.title, old.company, old.location);
      INSERT INTO jobs_fts(rowid, title, company, location)
      VALUES (new.id, new.title, new.company, new.location);
    END`,
  ]);
  ftsInitialized = true;
}

// One-time: backfill FTS index from existing jobs
let backfillChecked = false;

export async function ensureFTSBackfill() {
  if (backfillChecked) return;
  await ensureFTS();
  // Check if FTS is empty but jobs exist
  const [ftsCount, jobsCount] = await Promise.all([
    db.execute("SELECT COUNT(*) as c FROM jobs_fts"),
    db.execute("SELECT COUNT(*) as c FROM jobs"),
  ]);
  const fts = Number(ftsCount.rows[0].c);
  const jobs = Number(jobsCount.rows[0].c);
  if (jobs > 0 && fts === 0) {
    await db.execute(
      "INSERT INTO jobs_fts(rowid, title, company, location) SELECT id, title, company, location FROM jobs"
    );
  }
  backfillChecked = true;
}

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
