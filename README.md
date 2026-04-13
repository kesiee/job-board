# JobHunt — Every open role. One search.

A free, public job board aggregating 200,000+ positions from 16,500+ companies across 8 ATS platforms. Built with Next.js 15 and powered by Turso.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Turso](https://img.shields.io/badge/Database-Turso-00C8FF)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)

## Features

- **Search & Filter** — Full-text search on job titles and companies, filter by platform, location, and company
- **8 ATS Platforms** — Greenhouse, Lever, SmartRecruiters, Workable, Rippling, Gem, Ashby, Workday
- **Fast** — Server components for all data fetching, no client-side API calls for listings
- **Shareable URLs** — All search filters and pagination stored in URL params
- **SEO Optimized** — Dynamic OG tags per job, auto-generated sitemap for top companies
- **Mobile Responsive** — Clean, minimal design that works on any device
- **Public Stats** — Real-time breakdown of jobs by platform, daily additions, company count
- **Admin Dashboard** — Private analytics with page views, search insights, and visitor trends

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with search bar and platform stats |
| `/jobs` | Job listings with search, filters, and pagination (30/page) |
| `/jobs/[id]` | Individual job detail with Apply link |
| `/companies` | Browse companies alphabetically |
| `/stats` | Public stats — jobs per platform, daily additions, totals |
| `/admin?secret=...` | Private admin dashboard with visitor and search analytics |

## Tech Stack

- **Framework** — Next.js 15 (App Router, Server Components)
- **Database** — Turso (libSQL)
- **Styling** — Tailwind CSS
- **Deployment** — Vercel
- **Analytics** — Custom page view and search tracking via Turso

## Getting Started

```bash
# Clone the repo
git clone https://github.com/shashankkesiee/job-board.git
cd job-board

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Turso credentials

# Run development server
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `ADMIN_SECRET` | Secret key for accessing `/admin` dashboard |

## Database Schema

The database is populated by an external scraper that syncs jobs every few hours.

```sql
CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    description TEXT,
    location TEXT,
    source TEXT,
    ats_slug TEXT,
    date_posted TEXT,
    scraped_at TEXT,
    raw_json TEXT
);
```

## Deploy on Vercel

Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `ADMIN_SECRET` in your Vercel project environment variables.

## License

MIT
