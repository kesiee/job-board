import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

// The `requests` table must be created by a DB admin (the app user has no DDL
// privileges):
//   CREATE TABLE requests (
//     id SERIAL PRIMARY KEY,
//     type TEXT NOT NULL,
//     detail TEXT NOT NULL,
//     email TEXT,
//     created_at TIMESTAMPTZ DEFAULT NOW()
//   );
//   GRANT INSERT ON requests TO jobboard;
//   GRANT USAGE ON SEQUENCE requests_id_seq TO jobboard;

export async function POST(req: Request) {
  try {
    const { type, detail, email } = await req.json();

    if (!type || !detail || detail.length < 3) {
      return NextResponse.json({ error: "Type and detail are required" }, { status: 400 });
    }

    if (detail.length > 2000) {
      return NextResponse.json({ error: "Detail too long" }, { status: 400 });
    }

    await pool.query(
      "INSERT INTO requests (type, detail, email) VALUES ($1, $2, $3)",
      [type, detail.slice(0, 2000), email || null]
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
