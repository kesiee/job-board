import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

async function migrate() {
  console.log("Running DB migrations...");

  // Stored tsvector column for full-text search
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'fts'
      ) THEN
        ALTER TABLE jobs ADD COLUMN fts tsvector
          GENERATED ALWAYS AS (
            to_tsvector('english', title || ' ' || company || ' ' || COALESCE(location, '') || ' ' || COALESCE(description, ''))
          ) STORED;
      END IF;
    END $$
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_fts_v3 ON jobs USING gin(fts)`);
  await pool.query(`DROP INDEX IF EXISTS idx_jobs_fts`);
  await pool.query(`DROP INDEX IF EXISTS idx_jobs_fts_v2`);

  console.log("Migrations complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
