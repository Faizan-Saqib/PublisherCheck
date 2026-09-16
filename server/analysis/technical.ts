import { CrawlSessionResult } from '../crawler/discovery.js';
import { TechnicalChecksResult, EvidenceItem } from '../../src/types.js';
import { safeFetch } from '../crawler/fetcher.js';

export async function analyzeTechnicalHealth(crawl: CrawlSessionResult): Promise<TechnicalChecksResult> {
  const isHttps = crawl.baseUrl.protocol === 'https:';
  let httpToHttpsRedirect: boolean | 'not_applicable' | 'failed' = 'not_applicable';

  if (isHttps) {
    // Check if http://domain redirects to https://
    try {
      const httpUrl = `http://${crawl.baseUrl.hostname}/`;
      const probe = await safeFetch(httpUrl, { timeoutMs: 4000, maxRedirects: 3 });
      if (probe.ok && probe.finalUrl.startsWith('https://')) {
        httpToHttpsRedirect = true;
      } else if (probe.statusCode >= 300 && probe.statusCode < 400) {
        httpToHttpsRedirect = true;
      } else {
        httpToHttpsRedirect = false;
      }
    } catch {
      httpToHttpsRedirect = 'failed';
    }
  }

  const articles = crawl.sampledArticles;
  let canonicalCount = 0;
  let noindexCount = 0;

  for (const article of articles) {
    if (article.canonicalUrl) canonicalCount++;
    if (article.isNoindex) noindexCount++;
  }

  const totalArticles = articles.length;
  const canonicalRatio = totalArticles > 0 ? parseFloat((canonicalCount / totalArticles).toFixed(2)) : 1;

  const robotsTxtFound = crawl.robots.found;
  const robotsAllowsCrawling = crawl.robots.allowsCrawling;
  const sitemapFound = crawl.sitemap.found || crawl.feed.found;

  let status: 'good' | 'caution' | 'warning' = 'good';
  let signalStatus: 'VERIFIED_POSITIVE' | 'SIGNAL_NEUTRAL' | 'SIGNAL_CAUTION' | 'SIGNAL_WARNING' = 'VERIFIED_POSITIVE';
  let signalState: 'VERIFIED' | 'SIGNAL' | 'NOT_CHECKED' = 'VERIFIED';
  let headline = '';
  let explanation = '';

  const warnings: string[] = [];
  if (!isHttps) warnings.push('Site does not default to HTTPS');
  if (crawl.homepage.isNoindex) warnings.push('Homepage contains noindex directive');
  if (totalArticles > 0 && noindexCount >= Math.max(3, Math.ceil(totalArticles * 0.7))) {
    warnings.push(`${noindexCount} of ${totalArticles} sampled pages marked noindex`);
  }

  if (warnings.length > 0) {
    status = 'warning';
    signalStatus = 'SIGNAL_WARNING';
    signalState = 'SIGNAL';
    headline = `Technical restrictions detected (${warnings.join(', ')})`;
    explanation = 'Accessibility signals indicate crawler blocking or security configuration issues.';
  } else {
    status = 'good';
    signalStatus = 'VERIFIED_POSITIVE';
    signalState = 'VERIFIED';
    headline = 'Core technical accessibility & HTTPS verified';
    explanation = 'HTTPS security and public accessibility verified.';
  }

  const evidence: EvidenceItem[] = [
    {
      id: 'tech-https',
      type: 'stat',
      title: `HTTPS Security: ${isHttps ? 'Verified' : 'Not secure (HTTP)'}`,
      detail: httpToHttpsRedirect === true ? 'HTTP to HTTPS redirect verified' : (isHttps ? 'Secure HTTPS connection active' : 'Site does not default to HTTPS'),
    },
  ];

  if (noindexCount > 0) {
    evidence.push({
      id: 'tech-noindex',
      type: 'note',
      title: `Notice: ${noindexCount} pages marked with "noindex"`,
      detail: 'Pages marked noindex instruct crawlers not to index the specific URL.',
    });
  }

  return {
    status,
    signalStatus,
    signalState,
    headline,
    isHttps,
    httpToHttpsRedirect,
    redirectCount: 0,
    redirectChain: [],
    robotsTxtFound,
    robotsTxtUrl: crawl.robots.url,
    robotsAllowsCrawling,
    sitemapFound,
    sitemapUrl: crawl.sitemap.sitemapUrl || crawl.feed.feedUrl,
    sitemapType: crawl.sitemap.type === 'index' ? 'index' : crawl.sitemap.type === 'standard' ? 'standard' : (crawl.feed.found ? 'rss_feed' : 'none'),
    canonicalTagsRatio: canonicalRatio,
    noindexDetectedCount: noindexCount,
    statusCode: crawl.homepage.statusCode,
    responseSpeedMs: crawl.homepage.durationMs,
    explanation,
    evidence,
  };
}
