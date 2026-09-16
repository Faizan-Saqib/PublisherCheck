import { normalizeTargetUrl } from './security/ssrf.js';
import { executeCrawl } from './crawler/discovery.js';
import { analyzePublishingActivity } from './analysis/publishing.js';
import { analyzeOutboundLinks } from './analysis/links.js';
import { analyzeGuestPostSignals } from './analysis/contributions.js';
import { analyzeEditorialTransparency } from './analysis/editorial.js';
import { analyzeAuthorSignals } from './analysis/authors.js';
import { analyzeTechnicalHealth } from './analysis/technical.js';
import { analyzeListedCategories } from './analysis/categories.js';
import { calculateReportScoreAndVerdict } from './analysis/scoring.js';
import { reportCache } from './cache.js';
import { FALLBACK_DEMO_REPORT } from './demoData.js';
import { PublisherCheckReport } from '../src/types.js';
import { validateReportConsistency } from '../src/validationPass.js';

export async function analyzeWebsite(rawUrl: string, forceRefresh: boolean = false): Promise<{
  success: boolean;
  report?: PublisherCheckReport;
  error?: string;
  code?: string;
}> {
  // 1. Normalize and validate URL
  const norm = normalizeTargetUrl(rawUrl);
  if (!norm.valid || !norm.url) {
    return {
      success: false,
      error: norm.error || 'Invalid URL supplied',
      code: 'INVALID_URL',
    };
  }

  const targetUrl = norm.url;
  const domain = targetUrl.hostname.replace(/^www\./, '');

  // 2. Cache check
  if (!forceRefresh) {
    const cached = reportCache.get(domain);
    if (cached) {
      return { success: true, report: cached };
    }
  }

  // 3. Special handling for demo site if requested and live site is offline
  const isDemoDomain = domain.includes('thedailyfront.com');

  // 4. Execute Real Crawl
  try {
    const crawlResult = await executeCrawl(targetUrl);

    if (!crawlResult.success || !crawlResult.result) {
      if (isDemoDomain) {
        // As explicitly required: If the live site cannot be crawled, create clearly labelled demo data
        return {
          success: true,
          report: {
            ...FALLBACK_DEMO_REPORT,
            analyzedAt: new Date().toISOString(),
          },
        };
      }

      return {
        success: false,
        error: crawlResult.error || 'Unable to inspect this website automatically.',
        code: 'CRAWL_FAILED',
      };
    }

    const crawl = crawlResult.result;

    // 5. Run Modular Analysis Pipelines (6 Checks)
    const publishing = analyzePublishingActivity(crawl);
    const outboundLinks = analyzeOutboundLinks(crawl);
    const technicalChecks = await analyzeTechnicalHealth(crawl);
    const guestPostSignals = analyzeGuestPostSignals(crawl);
    const contentAuthors = analyzeAuthorSignals(crawl);
    const editorialTransparency = analyzeEditorialTransparency(crawl, contentAuthors);
    const categories = analyzeListedCategories(crawl);

    // 6. Calculate Signal Counts, Risk Assessment, and Report
    const unvalidatedReport = calculateReportScoreAndVerdict({
      crawl,
      publishing,
      outboundLinks,
      technicalChecks,
      guestPostSignals,
      editorialTransparency,
      contentAuthors,
      categories,
      isCached: false,
      isDemoData: false,
    });

    // 7. Internal Validation Pass: verify counts, averages, and status codes for internal consistency
    const report = validateReportConsistency(unvalidatedReport);

    // 8. Store in Cache
    reportCache.set(domain, report);

    return {
      success: true,
      report,
    };
  } catch (err: any) {
    if (isDemoDomain) {
      const demoReport = validateReportConsistency({
        ...FALLBACK_DEMO_REPORT,
        analyzedAt: new Date().toISOString(),
      });
      return {
        success: true,
        report: demoReport,
      };
    }

    return {
      success: false,
      error: `Crawl inspection encountered an unexpected error: ${err?.message || 'Network timeout or unreachable host'}`,
      code: 'INTERNAL_CRAWL_ERROR',
    };
  }
}
