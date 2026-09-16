# PublisherCheck 🛡️

**PublisherCheck** is an evidence-first, automated website due-diligence tool designed to help marketers, founders, and SEO professionals evaluate websites before purchasing guest posts, sponsored articles, or backlink placements.

> **Core Philosophy**: This is **NOT** an Ahrefs or Moz clone. We do not pretend to know proprietary third-party metrics like Domain Rating (DR), Domain Authority (DA), estimated organic traffic, or complete backlink profiles. Instead, PublisherCheck inspects the website's own publicly accessible content and technical responses to verify tangible editorial and link patterns.

---

## What PublisherCheck Verifies

The inspection engine operates directly from public pages without requiring any paid SEO APIs:

1. **Publishing Activity & Cadence**: Crawls recent posts, checks timestamps, and reports posts published in the last 30 and 90 days (🟢 Active / 🟡 Slow / 🔴 Inactive / ⚪ Not Checked).
2. **Subject & Niche Consistency**: Categorizes recent articles, measures topic distribution, and identifies whether the site maintains focus or scatters across unrelated niches.
3. **Outbound Link Profiling**: Calculates average and maximum outbound external links per article, dofollow vs nofollow vs sponsored ratios, repeated destination domains, and detects heavy link dumps.
4. **Commercial & Paid-Link Signals**: Scans content and anchors for advertorial disclosures (`"sponsored post"`, `"in collaboration with"`), commercial affiliate tags, and repeated commercial targets.
5. **Guest-Post Openness**: Automatically discovers contributor guidelines (`"write for us"`, `"guest post guidelines"`, `"contribute"`).
6. **Editorial Transparency**: Checks for public About, Contact, Author bylines, Editorial Policy, Privacy Policy, and Terms of Service.
7. **Author Attribution**: Analyzes whether articles have named, accountable contributors or generic placeholder accounts (e.g., `"admin"`, `"editor"`).
8. **Technical Health & Indexability**: Probes HTTPS redirect, `robots.txt` crawler allowances, XML sitemaps, canonical URL coverage, and `noindex` directives.
9. **Content Topic Red Flags**: Screens for repeated occurrences of gambling, casinos, adult content, predatory loan brokers, or gray-market crypto schemes.
10. **Sampled Pages & Raw Evidence Inspector**: Allows inspecting every sampled URL, author, date, and external link count directly.

---

## Signal Legend & Trust Model

Every check in PublisherCheck is classified into one of three unambiguous categories:

- **🟢 VERIFIED**: Directly observed from the website's publicly returned HTML or HTTP headers.
- **🟡 SIGNAL**: Inferred algorithmically from multiple observable pieces of evidence.
- **⚪ NOT CHECKED**: Explicitly disclosed when data cannot be verified without paid closed databases (DR, DA, search rankings, organic traffic).

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Installation & Run

1. Clone or extract the repository:
   ```bash
   cd publishercheck
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be running at `http://localhost:3000`.

4. Build for production:
   ```bash
   npm run build
   npm start
   ```

---

## Deployment Guide

### Why a Backend Server is Required
PublisherCheck **cannot** be deployed as a purely static site (such as GitHub Pages or AWS S3). 

A backend runtime is strictly required for:
- **CORS Bypass**: Web browsers block client-side JavaScript from fetching arbitrary external websites due to Cross-Origin Resource Sharing (CORS) rules.
- **SSRF Protection & Safe Crawling**: To prevent Server-Side Request Forgery, our backend enforces private IP blocklists (e.g., preventing access to `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254` AWS metadata), sets rate-limits (max 3 concurrent connections), enforces redirect hop limits, and caps download payloads at 2.5 MB.
- **In-Memory Caching**: Avoids re-crawling the same domain repeatedly within a 48-hour window.

### Option 1: Docker / Cloud Run / Railway / Render / Fly.io (Recommended)
Because the app is built with Node.js + Express and bundles cleanly into `dist/server.cjs`, you can deploy it directly as a containerized web service or Node.js process:

```bash
# Build command
npm run build

# Start command
npm start
```
Bind port `3000` (or `PORT` environment variable if configured).

### Option 2: Deploying to Vercel

To deploy to Vercel:
1. Ensure your repository root has a `vercel.json` file configuring the server route (or export Express handlers as serverless functions in `api/`).
2. Add a `vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server.ts",
         "use": "@vercel/node"
       },
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": { "distDir": "dist" }
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "server.ts"
       },
       {
         "src": "/(.*)",
         "dest": "/$1"
       }
     ]
   }
   ```
3. Run:
   ```bash
   vercel deploy
   ```
