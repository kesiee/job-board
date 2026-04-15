import { pool } from "@/lib/db";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://jobhunt.vercel.app";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/jobs`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/companies`, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/stats`, changeFrequency: "daily", priority: 0.5 },
  ];

  const companies = await pool.query(
    "SELECT company FROM jobs GROUP BY company ORDER BY COUNT(*) DESC LIMIT 500"
  );

  const companyPages: MetadataRoute.Sitemap = companies.rows.map((row) => ({
    url: `${baseUrl}/jobs?company=${encodeURIComponent(row.company as string)}`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...companyPages];
}
