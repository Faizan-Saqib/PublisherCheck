import { safeFetch } from './fetcher.js';

export interface RobotsCheckResult {
  found: boolean;
  url: string;
  statusCode: number;
  rawText: string;
  allowsCrawling: boolean;
  sitemapsDeclared: string[];
  disallowedPaths: string[];
}

export async function checkRobotsTxt(baseUrl: URL): Promise<RobotsCheckResult> {
  const robotsUrl = new URL('/robots.txt', baseUrl.origin).href;
  const fetchRes = await safeFetch(robotsUrl, { timeoutMs: 5000, acceptType: 'text/plain' });

  if (!fetchRes.ok || fetchRes.statusCode !== 200 || !fetchRes.text.trim()) {
    return {
      found: false,
      url: robotsUrl,
      statusCode: fetchRes.statusCode,
      rawText: '',
      allowsCrawling: true, // Default to allowed if no robots.txt
      sitemapsDeclared: [],
      disallowedPaths: [],
    };
  }

  const lines = fetchRes.text.split('\n');
  const sitemaps: string[] = [];
  const disallowed: string[] = [];
  let isTargetAgent = false;
  let hasWildcardDisallowAll = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const [directive, ...valParts] = line.split(':');
    if (!directive || valParts.length === 0) continue;

    const d = directive.trim().toLowerCase();
    const val = valParts.join(':').trim();

    if (d === 'user-agent') {
      const agent = val.toLowerCase();
      isTargetAgent = agent === '*' || agent.includes('publishercheck') || agent.includes('bot');
    } else if (d === 'sitemap') {
      if (val.startsWith('http://') || val.startsWith('https://')) {
        sitemaps.push(val);
      }
    } else if (isTargetAgent) {
      if (d === 'disallow') {
        if (val === '/' || val === '/*') {
          hasWildcardDisallowAll = true;
        }
        if (val) {
          disallowed.push(val);
        }
      }
    }
  }

  return {
    found: true,
    url: robotsUrl,
    statusCode: fetchRes.statusCode,
    rawText: fetchRes.text.slice(0, 2000),
    allowsCrawling: !hasWildcardDisallowAll,
    sitemapsDeclared: Array.from(new Set(sitemaps)),
    disallowedPaths: disallowed,
  };
}
