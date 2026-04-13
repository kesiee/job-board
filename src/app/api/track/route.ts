import { NextRequest, NextResponse } from "next/server";
import { logPageView } from "@/lib/queries";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { path, referrer } = await request.json();
    const userAgent = request.headers.get("user-agent") || undefined;
    await logPageView(path, referrer, userAgent);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
