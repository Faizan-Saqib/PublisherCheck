import { CrawlSessionResult } from '../crawler/discovery.js';
import { PublishingCheckResult, EvidenceItem } from '../../src/types.js';

export function analyzePublishingActivity(crawl: CrawlSessionResult): PublishingCheckResult {
  const totalArticlesSampled = crawl.sampledArticles.length;

  // Determine if a reliable site-wide total article count is publicly observable
  // IMPORTANT: Only set if reliably verifiable from an exhaustive source (e.g. complete dedicated sitemap or archive).
  // Never estimate from the sampled articles.
  let totalArticlesOnSite: number | null = null;
  let totalArticlesOnSiteSource: string | null = null;

  if (
    crawl.sitemap &&
    crawl.sitemap.found &&
    !crawl.sitemap.isIndex &&
    crawl.sitemap.entries &&
    crawl.sitemap.entries.length > 0 &&
    crawl.sitemap.type === 'standard'
  ) {
    const sitemapUrlLower = (crawl.sitemap.sitemapUrl || '').toLowerCase();
    const isPostSitemap = sitemapUrlLower.includes('post') || sitemapUrlLower.includes('article') || sitemapUrlLower.includes('blog');
    if (isPostSitemap || crawl.sitemap.entries.length > totalArticlesSampled) {
      totalArticlesOnSite = crawl.sitemap.entries.length;
      totalArticlesOnSiteSource = crawl.sitemap.sitemapUrl || 'Standard Sitemap';
    }
  }

  if (totalArticlesSampled === 0) {
    return {
      status: 'not_checked',
      signalStatus: 'NOT_CHECKED',
      signalState: 'NOT_CHECKED',
      headline: 'Publishing activity: Not checked',
      latestPostDate: null,
      totalArticlesSampled: 0,
      sampledArticlesWithDates: 0,
      totalArticlesOnSite,
      totalArticlesOnSiteSource,
      explanation: 'No accessible sample pages could be fetched or inspected to evaluate publication timestamps.',
      evidence: [
        {
          id: 'pub-not-checked',
          type: 'note',
          title: 'Check Incomplete',
          detail: 'No accessible article pages were available to inspect for publication timestamps.',
        },
      ],
    };
  }

  // Centralized date extraction from the exact same sampled articles
  const parsedDates: { date: Date; raw: string; url: string; title: string }[] = [];

  for (const article of crawl.sampledArticles) {
    if (article.publishedDate) {
      const parsed = new Date(article.publishedDate);
      if (!isNaN(parsed.getTime())) {
        parsedDates.push({
          date: parsed,
          raw: article.publishedDate,
          url: article.url,
          title: article.title || article.url,
        });
      }
    }
  }

  // Sort descending (most recent first)
  parsedDates.sort((a, b) => b.date.getTime() - a.date.getTime());

  const sampledArticlesWithDates = parsedDates.length;

  if (sampledArticlesWithDates === 0) {
    return {
      status: 'inactive',
      signalStatus: 'SIGNAL_NEUTRAL',
      signalState: 'VERIFIED',
      headline: 'Publication dates not detected in sampled markup',
      latestPostDate: null,
      totalArticlesSampled,
      sampledArticlesWithDates: 0,
      totalArticlesOnSite,
      totalArticlesOnSiteSource,
      explanation: `PublisherCheck analyzed the latest ${totalArticlesSampled} accessible article pages from this website. No explicit publication dates were identified across ${totalArticlesSampled} sampled articles.`,
      evidence: [
        {
          id: 'pub-no-dates',
          type: 'note',
          title: 'Publication Dates Not Detected',
          detail: `0 of ${totalArticlesSampled} sampled pages exposed explicit publication timestamps across HTML time tags, metadata, or JSON-LD.`,
        },
      ],
    };
  }

  const latestPostDate = parsedDates[0].date.toISOString().split('T')[0];

  const evidence: EvidenceItem[] = parsedDates.map((d, i) => ({
    id: `pub-date-${i}`,
    type: 'url',
    title: d.title || d.url,
    url: d.url,
    detail: `Published on ${d.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} (${d.raw})`,
  }));

  return {
    status: 'active',
    signalStatus: 'VERIFIED_POSITIVE',
    signalState: 'VERIFIED',
    headline: `Publication dates identified on ${sampledArticlesWithDates} of ${totalArticlesSampled} sampled articles`,
    latestPostDate,
    totalArticlesSampled,
    sampledArticlesWithDates,
    totalArticlesOnSite,
    totalArticlesOnSiteSource,
    explanation: `PublisherCheck analyzed the latest ${totalArticlesSampled} accessible article pages from this website. Publication dates were identified for ${sampledArticlesWithDates} of ${totalArticlesSampled} sampled articles.`,
    evidence,
  };
}

