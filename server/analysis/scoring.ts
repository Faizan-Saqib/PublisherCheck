import {
  PublisherCheckReport,
  RiskLevel,
  PublishingCheckResult,
  OutboundLinksResult,
  GuestPostSignalsResult,
  EditorialTransparencyResult,
  ContentAuthorSignalsResult,
  TechnicalChecksResult,
  ListedCategoriesResult,
  SampledPageSummary,
} from '../../src/types.js';
import { CrawlSessionResult } from '../crawler/discovery.js';

export function calculateReportScoreAndVerdict(params: {
  crawl: CrawlSessionResult;
  publishing: PublishingCheckResult;
  outboundLinks: OutboundLinksResult;
  technicalChecks: TechnicalChecksResult;
  guestPostSignals: GuestPostSignalsResult;
  editorialTransparency: EditorialTransparencyResult;
  contentAuthors: ContentAuthorSignalsResult;
  categories?: ListedCategoriesResult;
  isCached: boolean;
  cachedAt?: string;
  isDemoData?: boolean;
}): PublisherCheckReport {
  const {
    crawl,
    publishing,
    outboundLinks,
    technicalChecks,
    guestPostSignals,
    editorialTransparency,
    contentAuthors,
    categories,
    isCached,
    cachedAt,
    isDemoData,
  } = params;

  // Core Checks in V1
  const checkItems: Array<{ name: string; state: 'VERIFIED' | 'SIGNAL' | 'NOT_CHECKED' }> = [
    { name: 'Publishing Cadence', state: publishing.signalState },
    { name: 'Outbound Links', state: outboundLinks.signalState },
    { name: 'Technical Checks', state: technicalChecks.signalState },
    { name: 'Guest Post Guidelines', state: guestPostSignals.signalState },
    { name: 'Publisher Transparency', state: editorialTransparency.signalState },
    { name: 'Author Attribution', state: contentAuthors.signalState },
  ];

  const verified = checkItems.filter(c => c.state === 'VERIFIED').length;
  const signal = checkItems.filter(c => c.state === 'SIGNAL').length;
  const notChecked = checkItems.filter(c => c.state === 'NOT_CHECKED').length;
  const total = checkItems.length; // Dynamically calculated (6)

  const signalCounts = {
    verified,
    signal,
    notChecked,
    total,
  };

  const checksCompletedCount = verified + signal;
  const checksTotalCount = total;

  // Active risk signals strictly include only verified caution signals, NOT_CHECKED never creates risk
  const activeCautionChecks = checkItems.filter(c => c.state === 'SIGNAL').map(c => c.name);

  // Overall Risk Level & Transparent Summary Verdict
  let overallRiskLevel: RiskLevel;
  let summaryVerdict: string;

  if (notChecked >= 5 || crawl.sampledArticles.length === 0) {
    overallRiskLevel = 'INSUFFICIENT DATA';
    summaryVerdict = 'Limited data was verifiable from public pages during the scan. Insufficient accessible pages to complete evaluation.';
  } else if (guestPostSignals.hasCommercialTerms || signal >= 3) {
    overallRiskLevel = 'STRONG CAUTION SIGNALS';
    const mentioned = activeCautionChecks.slice(0, 3).join(', ');
    summaryVerdict = `Strong explicit evidence or multiple caution signals were observed (${mentioned}). Thorough manual due diligence is recommended before proceeding.`;
  } else if (signal >= 1) {
    overallRiskLevel = 'REVIEW RECOMMENDED';
    const mentioned = activeCautionChecks.join(', ');
    summaryVerdict = `Caution signals were observed in ${mentioned}. Human due diligence review is recommended before proceeding.`;
  } else {
    overallRiskLevel = 'NO MAJOR CAUTION SIGNALS';
    summaryVerdict = 'All verified checks reflect standard public publisher signals. No major caution signals or explicit commercial terms were detected in sampled pages.';
  }

  // Prepare Sampled Pages Summary (Strictly no commercial markers or inferred topics)
  const sampledPages: SampledPageSummary[] = crawl.sampledArticles.map(article => {
    const hasSponsoredLinks = article.$('a[rel*="sponsored"]').length > 0;

    let extCount = 0;
    let intCount = 0;
    const targetHost = crawl.baseUrl.hostname.replace(/^www\./, '');

    article.$('a[href]').each((_, el) => {
      const href = article.$(el).attr('href') || '';
      if (href.startsWith('#') || href.startsWith('javascript:')) return;
      try {
        const u = new URL(href, crawl.baseUrl.origin);
        if (u.hostname.replace(/^www\./, '') === targetHost) {
          intCount++;
        } else {
          extCount++;
        }
      } catch {
        // ignore invalid urls
      }
    });

    return {
      url: article.url,
      title: article.title || article.url,
      publishDate: article.publishedDate || null,
      author: article.author || null,
      externalLinksCount: extCount,
      internalLinksCount: intCount,
      hasSponsoredLinks,
      wordCount: article.wordCount,
      articleConfidence: article.articleConfidence,
      isVerifiedArticle: article.isVerifiedArticle ?? true,
    };
  });

  return {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    targetUrl: crawl.targetUrl,
    normalizedDomain: crawl.baseUrl.hostname.replace(/^www\./, ''),
    analyzedAt: new Date().toISOString(),
    isCached,
    cachedAt,
    isDemoData: !!isDemoData,
    overallRiskLevel,
    signalCounts,
    checksCompletedCount,
    checksTotalCount,
    summaryVerdict,
    publishing,
    outboundLinks,
    technicalChecks,
    guestPostSignals,
    editorialTransparency,
    contentAuthors,
    categories,
    sampledPages,
    totalPagesDiscovered: crawl.totalDiscoveredArticlesCount,
    crawlDurationMs: crawl.durationMs,
    crawlerNotes: crawl.notes,
  };
}
