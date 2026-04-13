import { NextRequest, NextResponse } from "next/server";
import { logPageView } from "@/lib/queries";

export const runtime = "edge";

const BOT_PATTERNS = [
  /vercel/i,
  /bot/i,
  /crawler/i,
  /spider/i,
  /headless/i,
  /lighthouse/i,
  /pingdom/i,
  /uptimerobot/i,
  /synthetics/i,
  /monitor/i,
  /check/i,
  /curl/i,
  /wget/i,
  /python/i,
  /go-http/i,
  /node-fetch/i,
];

function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.some((p) => p.test(userAgent));
}

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get("user-agent") || "";

    // Skip bots, health checks, and prefetches
    if (isBot(userAgent)) {
      return NextResponse.json({ ok: true, skipped: "bot" });
    }

    const { path, referrer, visitorId } = await request.json();

    if (!path || !visitorId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Geo data from Vercel headers
    const country = request.headers.get("x-vercel-ip-country") || null;
    const city = request.headers.get("x-vercel-ip-city") || null;

    // Hash IP for privacy (don't store raw IP)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashString(ip);

    // Device type from user agent
    const device = /mobile|android|iphone/i.test(userAgent)
      ? "mobile"
      : /tablet|ipad/i.test(userAgent)
        ? "tablet"
        : "desktop";

    await logPageView({
      visitorId,
      path,
      referrer: referrer || null,
      userAgent,
      ipHash,
      country,
      city,
      device,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
