import { pool } from "./db";

const WORD_THRESHOLD = 100;

function wordCount(text: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractText(html: string): string {
  // Remove script, style, nav, header, footer tags and their content
  let text = html.replace(/<(script|style|nav|header|footer|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

export function needsDescription(description: string | null): boolean {
  return wordCount(description) < WORD_THRESHOLD;
}

export async function fetchAndSaveDescription(
  jobId: number,
  url: string
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JobHuntBot/1.0; +https://jobhunt.app)",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const html = await res.text();
    const text = extractText(html);

    if (wordCount(text) < WORD_THRESHOLD) return null;

    // Trim to a reasonable length (first ~5000 words)
    const trimmed = text.split(/\s+/).slice(0, 5000).join(" ");

    // Save back to DB so we don't fetch again
    await pool.query("UPDATE jobs SET description = $1 WHERE id = $2", [
      trimmed,
      jobId,
    ]);

    return trimmed;
  } catch {
    return null;
  }
}
