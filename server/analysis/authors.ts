import { CrawlSessionResult } from '../crawler/discovery.js';
import { ContentAuthorSignalsResult, EvidenceItem } from '../../src/types.js';

const GENERIC_AUTHOR_NAMES = new Set([
  'admin',
  'administrator',
  'editor',
  'author',
  'staff',
  'webmaster',
  'team',
  'guest',
  'contributor',
  'root',
]);

export function analyzeAuthorSignals(crawl: CrawlSessionResult): ContentAuthorSignalsResult {
  const articles = crawl.sampledArticles;
  const totalArticles = articles.length;

  if (totalArticles === 0) {
    return {
      status: 'not_checked',
      signalStatus: 'NOT_CHECKED',
      signalState: 'NOT_CHECKED',
      headline: 'Author & content signals: Not checked',
      authorNamesFoundCount: 0,
      articlesWithAuthorCount: 0,
      articlesWithDatesCount: 0,
      articlesWithUpdatedDatesCount: 0,
      genericAuthorDetected: false,
      topAuthors: [],
      explanation: 'No sample articles available for author signal inspection.',
      evidence: [],
    };
  }

  const authorFrequency: Record<string, number> = {};
  let articlesWithAuthorCount = 0;
  let articlesWithDatesCount = 0;
  let articlesWithUpdatedDatesCount = 0;
  let genericAuthorDetected = false;

  for (const article of articles) {
    if (article.publishedDate) {
      articlesWithDatesCount++;
    }
    if (article.updatedDate) {
      articlesWithUpdatedDatesCount++;
    }
    if (article.author) {
      articlesWithAuthorCount++;
      const norm = article.author.trim();
      authorFrequency[norm] = (authorFrequency[norm] || 0) + 1;

      if (GENERIC_AUTHOR_NAMES.has(norm.toLowerCase())) {
        genericAuthorDetected = true;
      }
    }
  }

  const topAuthors = Object.entries(authorFrequency)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const distinctAuthors = topAuthors.length;
  const authorRatio = totalArticles > 0 ? articlesWithAuthorCount / totalArticles : 0;
  const datesRatio = totalArticles > 0 ? articlesWithDatesCount / totalArticles : 0;

  let status: 'transparent' | 'mixed' | 'opaque' = 'transparent';
  let signalStatus: 'VERIFIED_POSITIVE' | 'SIGNAL_NEUTRAL' | 'SIGNAL_CAUTION' = 'VERIFIED_POSITIVE';
  let signalState: 'VERIFIED' | 'SIGNAL' | 'NOT_CHECKED' = 'VERIFIED';
  let headline = '';
  let explanation = '';

  if (authorRatio >= 0.7 && !genericAuthorDetected && distinctAuthors >= 1) {
    status = 'transparent';
    signalStatus = 'VERIFIED_POSITIVE';
    signalState = 'VERIFIED';
    headline = 'Author attribution detected in sampled page markup';
    const dateAttributionNote = articlesWithDatesCount > 0
      ? ` and timestamp attribution (${articlesWithDatesCount}/${totalArticles} pages with publication dates)`
      : '';
    explanation = `Sampled pages display author attribution markup${dateAttributionNote}.`;
  } else if (genericAuthorDetected && topAuthors.some(a => GENERIC_AUTHOR_NAMES.has(a.name.toLowerCase()) && a.count >= 3)) {
    status = 'opaque';
    signalStatus = 'SIGNAL_CAUTION';
    signalState = 'SIGNAL';
    headline = 'Generic author attribution observed ("admin" / generic profile)';
    explanation = 'Multiple articles are attributed to generic accounts rather than individual author profiles.';
  } else if (articlesWithAuthorCount === 0) {
    status = 'opaque';
    signalStatus = 'SIGNAL_NEUTRAL';
    signalState = 'VERIFIED';
    headline = 'No author bylines detected in sampled page markup';
    explanation = 'No author bylines were identified in standard HTML markup across sampled pages. Absence in markup is observable evidence and does not conclusively prove anonymous authorship, as custom CMS themes often omit author tags.';
  } else {
    status = 'mixed';
    signalStatus = 'SIGNAL_NEUTRAL';
    signalState = 'VERIFIED';
    headline = 'Author attribution detected in sampled page markup';
    explanation = 'Author attribution was identified in standard HTML markup across sampled pages. Limited markup across other pages is observable evidence rather than an indicator of risk.';
  }

  const evidence: EvidenceItem[] = [
    {
      id: 'auth-stats',
      type: 'stat',
      title: articlesWithAuthorCount > 0
        ? 'Author attribution detected in sampled page markup'
        : 'No author bylines detected in standard markup',
      detail: articlesWithAuthorCount > 0
        ? 'Author attribution metadata observed in sampled page markup.'
        : 'No author tags exposed in standard markup across sampled pages.',
    },
    {
      id: 'auth-dates',
      type: 'stat',
      title: `${articlesWithDatesCount} / ${totalArticles} articles show publication dates`,
      detail: `${articlesWithUpdatedDatesCount} articles additionally show updated timestamp metadata.`,
    },
  ];

  return {
    status,
    signalStatus,
    signalState,
    headline,
    authorNamesFoundCount: distinctAuthors,
    articlesWithAuthorCount,
    articlesWithDatesCount,
    articlesWithUpdatedDatesCount,
    genericAuthorDetected,
    topAuthors: topAuthors.slice(0, 5),
    explanation,
    evidence,
  };
}
