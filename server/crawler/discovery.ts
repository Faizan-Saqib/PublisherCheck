import * as cheerio from 'cheerio';
import { safeFetch, FetchResult } from './fetcher.js';
import { checkRobotsTxt, RobotsCheckResult } from './robots.js';
import { discoverSitemap, SitemapDiscoveryResult } from './sitemap.js';
import { discoverFeeds, FeedDiscoveryResult } from './feed.js';
import { evaluatePageAsArticle, parseAndFormatDate, cleanAuthorName, detectPublicationDate, parseJsonLdScripts } from './articleDetector.js';

export interface CrawledPageData {
  url: string;
  statusCode: number;
  title: string;
  metaDescription: string;
  html: string;
  $: cheerio.CheerioAPI;
  durationMs: number;
  canonicalUrl?: string;
  isNoindex: boolean;
  publishedDate?: string;
  updatedDate?: string;
  author?: string;
  authorUrl?: string;
  pageType: 'article' | 'homepage' | 'utility' | 'unknown';
  isVerifiedArticle?: boolean;
  articleConfidence?: number;
  wordCount?: number;
  paragraphCount?: number;
  schemaType?: string;
  detectionReasons?: string[];
}

export interface CrawlSessionResult {
  targetUrl: string;
  baseUrl: URL;
  finalHomepageUrl: string;
  homepage: CrawledPageData;
  robots: RobotsCheckResult;
  sitemap: SitemapDiscoveryResult;
  feed: FeedDiscoveryResult;
  sampledArticles: CrawledPageData[];
  utilityPages: Record<string, CrawledPageData | null>; // about, contact, contribute, privacy, terms, team
  totalDiscoveredArticlesCount: number;
  durationMs: number;
  notes: string[];
}

// Utility to limit concurrent promises
async function asyncPool<T, R>(limit: number, array: T[], iteratorFn: (item: T) => Promise<R>): Promise<R[]> {
  const ret: Promise<R>[] = [];
  const executing: Set<Promise<any>> = new Set();

  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(ret);
}

function extractMetadata(html: string, pageUrl: string, pageType: 'article' | 'homepage' | 'utility' | 'unknown'): CrawledPageData {
  const $ = cheerio.load(html);

  if (pageType === 'article') {
    const evaluation = evaluatePageAsArticle(html, pageUrl, $);

    return {
      url: pageUrl,
      statusCode: 200,
      title: evaluation.title,
      metaDescription: evaluation.metaDescription,
      html,
      $,
      durationMs: 0,
      canonicalUrl: evaluation.canonicalUrl,
      isNoindex: evaluation.isNoindex,
      publishedDate: evaluation.publishedDate,
      updatedDate: evaluation.updatedDate,
      author: evaluation.author,
      authorUrl: evaluation.authorUrl,
      pageType: 'article',
      isVerifiedArticle: evaluation.isArticle,
      articleConfidence: evaluation.confidenceScore,
      wordCount: evaluation.wordCount,
      paragraphCount: evaluation.paragraphCount,
      schemaType: evaluation.schemaType,
      detectionReasons: evaluation.detectionReasons,
    };
  }

  const title = $('title').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().trim() || '';

  const metaDescription = $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() || '';

  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim();

  const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';
  const isNoindex = robotsMeta.includes('noindex');

  // Author extraction for non-article
  const rawAuthor = $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('[rel="author"]').first().text() ||
    $('.author-name, .byline, .author, .entry-author').first().text();
  const author = cleanAuthorName(rawAuthor);

  // Published Date extraction using centralized detection pipeline
  const jsonLd = parseJsonLdScripts(html);
  const publishedDate = detectPublicationDate($, jsonLd, { isArticleSchema: false }, pageUrl);

  const rawModDate = $('meta[property="article:modified_time"]').attr('content') ||
    $('meta[property="og:updated_time"]').attr('content');
  const updatedDate = parseAndFormatDate(rawModDate);

  return {
    url: pageUrl,
    statusCode: 200,
    title,
    metaDescription,
    html,
    $,
    durationMs: 0,
    canonicalUrl,
    isNoindex,
    publishedDate,
    updatedDate,
    author,
    pageType,
  };
}

const STATIC_ASSET_EXTENSIONS = /\.(jpe?g|png|gif|svg|webp|ico|pdf|zip|gz|tar|css|js|json|xml|rss|atom|mp3|mp4|m4a|avi|mov|docx?|xlsx?|pptx?)$/i;

const UTILITY_EXCLUSION_REGEX = /\/(tag|tags|category|categories|page|topics|search|cart|checkout|my-account|account|login|signin|signup|register|feed|rss|xmlrpc|wp-admin|wp-json|wp-content|wp-includes|cdn-cgi|author|authors|archives?|privacy|terms|contact|about|disclaimer)\/?(\?.*)?$/i;

function isPlausibleArticleUrl(candidateUrl: string, baseUrl: URL): boolean {
  try {
    const parsed = new URL(candidateUrl, baseUrl.origin);
    if (parsed.origin !== baseUrl.origin) return false;

    const path = parsed.pathname.toLowerCase();
    if (path === '/' || path === '' || path.length < 4) return false;

    if (STATIC_ASSET_EXTENSIONS.test(path)) return false;
    if (UTILITY_EXCLUSION_REGEX.test(path)) return false;

    // Discard search or action queries
    if (parsed.search && /[?&](action|replytocom|share|preview|format|filter)=/i.test(parsed.search)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function executeCrawl(normalizedUrl: URL): Promise<{ success: boolean; result?: CrawlSessionResult; error?: string }> {
  const startTime = Date.now();
  const notes: string[] = [];

  // 1. Fetch Homepage
  const homepageFetch = await safeFetch(normalizedUrl.href, { timeoutMs: 9000 });
  if (!homepageFetch.ok) {
    return {
      success: false,
      error: `Could not reach website homepage (${normalizedUrl.origin}): ${homepageFetch.error || 'HTTP ' + homepageFetch.statusCode}`,
    };
  }

  const finalHomepageUrl = homepageFetch.finalUrl;
  const baseUrl = new URL(finalHomepageUrl);
  const homepage = extractMetadata(homepageFetch.text, finalHomepageUrl, 'homepage');
  homepage.durationMs = homepageFetch.durationMs;

  // Extract feed links from homepage <head>
  const feedLinksFromHead: string[] = [];
  homepage.$('link[type*="rss"], link[type*="atom"]').each((_, el) => {
    const href = homepage.$(el).attr('href');
    if (href) {
      try {
        feedLinksFromHead.push(new URL(href, baseUrl.origin).href);
      } catch {
        // ignore
      }
    }
  });

  // 2. Concurrently check robots.txt, sitemaps, and feeds
  const [robots, feed] = await Promise.all([
    checkRobotsTxt(baseUrl),
    discoverFeeds(baseUrl, feedLinksFromHead),
  ]);

  const sitemap = await discoverSitemap(baseUrl, robots.sitemapsDeclared);

  if (!robots.allowsCrawling) {
    notes.push('robots.txt disallows automated crawling under current rules.');
  }

  // 3. Candidate Article Discovery
  const articleCandidates: { url: string; lastmod?: string; title?: string; priority: number }[] = [];
  const seenUrls = new Set<string>([finalHomepageUrl, normalizedUrl.href]);

  // Add sitemap entries
  if (sitemap.entries.length > 0) {
    for (const entry of sitemap.entries) {
      const clean = entry.url.split('#')[0];
      if (!seenUrls.has(clean) && isPlausibleArticleUrl(clean, baseUrl)) {
        try {
          const parsed = new URL(clean);
          if (parsed.origin === baseUrl.origin) {
            seenUrls.add(clean);
            let priority = 10;
            if (entry.lastmod) {
              priority = 50;
              const d = new Date(entry.lastmod).getTime();
              if (!isNaN(d)) {
                priority += Math.min(50, Math.floor((d - 1577836800000) / (86400000 * 30)));
              }
            }
            articleCandidates.push({ url: clean, lastmod: entry.lastmod, priority });
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // Add feed entries
  if (feed.entries.length > 0) {
    for (const entry of feed.entries) {
      const clean = entry.url.split('#')[0];
      if (!seenUrls.has(clean) && isPlausibleArticleUrl(clean, baseUrl)) {
        try {
          const parsed = new URL(clean);
          if (parsed.origin === baseUrl.origin) {
            seenUrls.add(clean);
            let priority = 40;
            if (entry.pubDate) {
              priority = 60;
              const d = new Date(entry.pubDate).getTime();
              if (!isNaN(d)) {
                priority += Math.min(40, Math.floor((d - 1577836800000) / (86400000 * 30)));
              }
            }
            articleCandidates.push({ url: clean, lastmod: entry.pubDate, title: entry.title, priority });
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // Fallback: extract links from homepage HTML if not enough candidates found
  const utilityLinksFound: Record<string, string> = {};

  homepage.$('a[href]').each((_, el) => {
    const href = homepage.$(el).attr('href');
    const text = homepage.$(el).text().trim().toLowerCase();
    if (!href) return;

    let resolved: string;
    try {
      resolved = new URL(href, baseUrl.origin).href.split('#')[0];
    } catch {
      return;
    }

    if (!resolved.startsWith(baseUrl.origin)) return;

    const lowerPath = new URL(resolved).pathname.toLowerCase();

    // Check for utility pages
    if ((lowerPath.includes('about') || text.includes('about')) && !utilityLinksFound.about) {
      utilityLinksFound.about = resolved;
    } else if ((lowerPath.includes('contact') || text.includes('contact')) && !utilityLinksFound.contact) {
      utilityLinksFound.contact = resolved;
    } else if (
      (lowerPath.includes('write-for-us') || lowerPath.includes('guest-post') || lowerPath.includes('contribute') || lowerPath.includes('advertise') ||
       text.includes('write for us') || text.includes('guest post') || text.includes('contribute') || text.includes('advertise')) &&
      !utilityLinksFound.contribute
    ) {
      utilityLinksFound.contribute = resolved;
    } else if (lowerPath.includes('privacy') && !utilityLinksFound.privacy) {
      utilityLinksFound.privacy = resolved;
    } else if ((lowerPath.includes('terms') || lowerPath.includes('tos')) && !utilityLinksFound.terms) {
      utilityLinksFound.terms = resolved;
    } else if ((lowerPath.includes('team') || lowerPath.includes('editorial') || lowerPath.includes('authors')) && !utilityLinksFound.team) {
      utilityLinksFound.team = resolved;
    }

    // Article heuristics from homepage
    const isLikelyArticle = isPlausibleArticleUrl(resolved, baseUrl) && (
      /\/\d{4}\/\d{2}\//.test(lowerPath) ||
      lowerPath.includes('/blog/') ||
      lowerPath.includes('/news/') ||
      lowerPath.includes('/article/') ||
      lowerPath.includes('/post/') ||
      (lowerPath.split('/').filter(Boolean).length >= 1 && lowerPath.includes('-') && lowerPath.length > 15)
    );

    if (isLikelyArticle && !seenUrls.has(resolved)) {
      seenUrls.add(resolved);
      articleCandidates.push({ url: resolved, title: text, priority: 20 });
    }
  });

  const totalDiscoveredArticlesCount = articleCandidates.length;

  // Sort candidates by priority (freshest / timestamped first)
  articleCandidates.sort((a, b) => b.priority - a.priority);

  // Sample up to 10 articles (sampling ceiling for consistent evidence & fast predictable runtime)
  const sampledCandidates = articleCandidates.slice(0, 10);

  // 4. Crawl Sampled Articles with Controlled Concurrency (max 3 concurrent)
  const rawSampled: CrawledPageData[] = [];
  await asyncPool(3, sampledCandidates, async candidate => {
    try {
      const fetchRes = await safeFetch(candidate.url, { timeoutMs: 8000 });
      if (fetchRes.ok && fetchRes.statusCode === 200 && fetchRes.text.length > 400) {
        const page = extractMetadata(fetchRes.text, candidate.url, 'article');
        page.durationMs = fetchRes.durationMs;
        if (!page.publishedDate && candidate.lastmod) {
          page.publishedDate = candidate.lastmod;
        }
        if (!page.title && candidate.title) {
          page.title = candidate.title;
        }
        rawSampled.push(page);
      }
    } catch {
      // ignore crawl failures gracefully
    }
  });

  // Filter out clear non-articles (e.g. category/archive/listing pages that scored < 35)
  let verifiedArticles = rawSampled.filter(p => (p.articleConfidence ?? 50) >= 35 || p.isVerifiedArticle);
  if (verifiedArticles.length === 0 && rawSampled.length > 0) {
    // Fallback if all scored low
    verifiedArticles = rawSampled.slice(0, 10);
  }
  const sampledArticles = verifiedArticles.slice(0, 10);

  // 5. Crawl Utility Pages (About, Contact, Write for Us, etc.)
  const utilityPages: Record<string, CrawledPageData | null> = {
    about: null,
    contact: null,
    contribute: null,
    privacy: null,
    terms: null,
    team: null,
  };

  // Default path guesses if not already found in navigation
  const defaultUtilityPaths: Record<string, string[]> = {
    about: ['/about', '/about-us', '/about-me'],
    contact: ['/contact', '/contact-us'],
    contribute: ['/write-for-us', '/write-for-us/', '/contribute', '/guest-post', '/submit-article', '/advertise'],
    privacy: ['/privacy-policy', '/privacy'],
    terms: ['/terms-of-service', '/terms-and-conditions', '/terms'],
    team: ['/editorial-team', '/editorial-policy', '/team', '/authors'],
  };

  const utilityFetchTargets: { key: string; url: string }[] = [];

  for (const [key, knownUrl] of Object.entries(utilityLinksFound)) {
    utilityFetchTargets.push({ key, url: knownUrl });
  }

  for (const [key, paths] of Object.entries(defaultUtilityPaths)) {
    if (!utilityLinksFound[key]) {
      utilityFetchTargets.push({ key, url: new URL(paths[0], baseUrl.origin).href });
    }
  }

  await asyncPool(3, utilityFetchTargets, async target => {
    if (utilityPages[target.key]) return; // already got one for this key
    try {
      const fetchRes = await safeFetch(target.url, { timeoutMs: 6000 });
      if (fetchRes.ok && fetchRes.statusCode === 200 && fetchRes.text.length > 400) {
        const page = extractMetadata(fetchRes.text, target.url, 'utility');
        page.durationMs = fetchRes.durationMs;
        utilityPages[target.key] = page;
      }
    } catch {
      // ignore
    }
  });

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    result: {
      targetUrl: normalizedUrl.href,
      baseUrl,
      finalHomepageUrl,
      homepage,
      robots,
      sitemap,
      feed,
      sampledArticles,
      utilityPages,
      totalDiscoveredArticlesCount,
      durationMs,
      notes,
    },
  };
}
