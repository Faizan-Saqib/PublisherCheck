import { XMLParser } from 'fast-xml-parser';
import { safeFetch } from './fetcher.js';

export interface SitemapEntry {
  url: string;
  lastmod?: string;
}

export interface SitemapDiscoveryResult {
  found: boolean;
  sitemapUrl?: string;
  isIndex: boolean;
  entries: SitemapEntry[];
  type: 'standard' | 'index' | 'none';
  error?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  trimValues: true,
});

export async function parseSitemapXml(xmlText: string, targetOrigin: string): Promise<{ isIndex: boolean; childSitemaps: string[]; entries: SitemapEntry[] }> {
  try {
    const parsed = parser.parse(xmlText);
    const childSitemaps: string[] = [];
    const entries: SitemapEntry[] = [];

    // Check if Sitemap Index
    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
        ? parsed.sitemapindex.sitemap
        : [parsed.sitemapindex.sitemap];

      for (const sm of sitemaps) {
        if (sm && sm.loc && typeof sm.loc === 'string') {
          childSitemaps.push(sm.loc.trim());
        }
      }
      return { isIndex: true, childSitemaps, entries: [] };
    }

    // Check if Urlset
    if (parsed.urlset && parsed.urlset.url) {
      const urls = Array.isArray(parsed.urlset.url)
        ? parsed.urlset.url
        : [parsed.urlset.url];

      for (const u of urls) {
        if (u && u.loc && typeof u.loc === 'string') {
          const loc = u.loc.trim();
          try {
            const parsedLoc = new URL(loc);
            // Only keep URLs on the same origin or domain
            if (parsedLoc.origin === targetOrigin || parsedLoc.hostname.endsWith(new URL(targetOrigin).hostname)) {
              entries.push({
                url: loc,
                lastmod: typeof u.lastmod === 'string' ? u.lastmod.trim() : undefined,
              });
            }
          } catch {
            // ignore invalid URL
          }
        }
      }
      return { isIndex: false, childSitemaps: [], entries };
    }

    return { isIndex: false, childSitemaps: [], entries: [] };
  } catch (err: any) {
    return { isIndex: false, childSitemaps: [], entries: [] };
  }
}

export async function discoverSitemap(
  baseUrl: URL,
  declaredSitemaps: string[] = []
): Promise<SitemapDiscoveryResult> {
  const candidateUrls: string[] = [...declaredSitemaps];

  // Standard locations to check if not declared or as fallbacks
  const standardPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/wp-sitemap.xml',
    '/sitemap-posts.xml',
    '/post-sitemap.xml',
    '/news-sitemap.xml',
  ];

  for (const path of standardPaths) {
    const full = new URL(path, baseUrl.origin).href;
    if (!candidateUrls.includes(full)) {
      candidateUrls.push(full);
    }
  }

  for (const sitemapUrl of candidateUrls) {
    const fetchRes = await safeFetch(sitemapUrl, { timeoutMs: 6000, acceptType: 'application/xml,text/xml' });
    if (fetchRes.ok && fetchRes.statusCode === 200 && fetchRes.text.includes('<')) {
      const parseResult = await parseSitemapXml(fetchRes.text, baseUrl.origin);

      if (parseResult.isIndex && parseResult.childSitemaps.length > 0) {
        // Prioritize post / article / blog / news sitemaps and ignore tag/category/author sitemaps
        const isPostSitemap = (sm: string) => {
          const l = sm.toLowerCase();
          return (l.includes('post') || l.includes('article') || l.includes('blog') || l.includes('news')) &&
            !l.includes('category') && !l.includes('tag') && !l.includes('author') && !l.includes('page-');
        };

        const postSitemaps = parseResult.childSitemaps.filter(isPostSitemap);
        const selectedChildren = postSitemaps.length > 0
          ? postSitemaps.slice(-3) // Often the latest year/month is at the end or top
          : parseResult.childSitemaps.slice(0, 2);

        const allChildEntries: SitemapEntry[] = [];
        for (const childUrl of selectedChildren) {
          try {
            const childFetch = await safeFetch(childUrl, { timeoutMs: 6000, acceptType: 'application/xml,text/xml' });
            if (childFetch.ok && childFetch.statusCode === 200 && childFetch.text.includes('<')) {
              const childParsed = await parseSitemapXml(childFetch.text, baseUrl.origin);
              if (childParsed.entries.length > 0) {
                allChildEntries.push(...childParsed.entries);
              }
            }
          } catch {
            // continue with other children
          }
        }

        if (allChildEntries.length > 0) {
          return {
            found: true,
            sitemapUrl,
            isIndex: true,
            type: 'index',
            entries: allChildEntries,
          };
        }

        return {
          found: true,
          sitemapUrl,
          isIndex: true,
          type: 'index',
          entries: [],
        };
      } else if (parseResult.entries.length > 0) {
        return {
          found: true,
          sitemapUrl,
          isIndex: false,
          type: 'standard',
          entries: parseResult.entries,
        };
      }
    }
  }

  return {
    found: false,
    isIndex: false,
    type: 'none',
    entries: [],
  };
}
