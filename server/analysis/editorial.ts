import { CrawlSessionResult } from '../crawler/discovery.js';
import { EditorialTransparencyResult, ContentAuthorSignalsResult, EvidenceItem } from '../../src/types.js';

export function analyzeEditorialTransparency(
  crawl: CrawlSessionResult,
  authorSignals?: ContentAuthorSignalsResult
): EditorialTransparencyResult {
  const utility = crawl.utilityPages;
  const totalArticles = crawl.sampledArticles.length;

  const aboutPage = {
    found: !!utility.about,
    url: utility.about?.url,
    title: utility.about?.title,
  };

  const contactPage = {
    found: !!utility.contact,
    url: utility.contact?.url,
    title: utility.contact?.title,
  };

  const editorialPolicy = {
    found: !!utility.team,
    url: utility.team?.url,
    title: utility.team?.title,
  };

  const privacyPolicy = {
    found: !!utility.privacy,
    url: utility.privacy?.url,
    title: utility.privacy?.title,
  };

  const termsOfService = {
    found: !!utility.terms,
    url: utility.terms?.url,
    title: utility.terms?.title,
  };

  // Harmonize with authorSignals for consistent single source of truth
  const articlesWithAuthorCount = authorSignals
    ? authorSignals.articlesWithAuthorCount
    : crawl.sampledArticles.filter(a => a.author).length;
  const authorNamesFoundCount = authorSignals
    ? authorSignals.authorNamesFoundCount
    : new Set(crawl.sampledArticles.filter(a => a.author).map(a => a.author)).size;
  const sampleAuthors = authorSignals
    ? authorSignals.topAuthors.map(a => a.name).slice(0, 5)
    : Array.from(new Set(crawl.sampledArticles.filter(a => a.author).map(a => a.author!))).slice(0, 5);

  const authorProfiles = {
    found: articlesWithAuthorCount > 0,
    sampleAuthors,
    count: authorNamesFoundCount,
  };

  // 2 site-level transparency pages (About, Contact)
  let foundScore = 0;
  if (aboutPage.found) foundScore++;
  if (contactPage.found) foundScore++;

  const verifiedList: string[] = [];
  if (aboutPage.found) verifiedList.push('About');
  if (contactPage.found) verifiedList.push('Contact');

  const missingList: string[] = [];
  if (!aboutPage.found) missingList.push('About');
  if (!contactPage.found) missingList.push('Contact');

  let status: 'good' | 'partial' | 'minimal' = 'good';
  let signalStatus: 'VERIFIED_POSITIVE' | 'SIGNAL_NEUTRAL' | 'SIGNAL_CAUTION' = 'VERIFIED_POSITIVE';
  let signalState: 'VERIFIED' | 'SIGNAL' | 'NOT_CHECKED' = 'VERIFIED';
  let headline = '';
  let explanation = '';

  if (foundScore === 2) {
    status = 'good';
    signalStatus = 'VERIFIED_POSITIVE';
    signalState = 'VERIFIED';
    headline = '2 of 2 publisher transparency pages verified';
    explanation = `Both standard publisher transparency pages were detected and verified in public navigation: ${verifiedList.join(', ')}.`;
  } else if (foundScore === 1) {
    status = 'partial';
    signalStatus = 'SIGNAL_NEUTRAL';
    signalState = 'VERIFIED';
    headline = '1 of 2 publisher transparency pages verified';
    explanation = `Verified publisher transparency page: ${verifiedList.join(', ')}. Not detected in sampled public navigation: ${missingList.join(', ')}.`;
  } else {
    status = 'minimal';
    signalStatus = 'SIGNAL_CAUTION';
    signalState = 'SIGNAL';
    headline = '0 of 2 publisher transparency pages verified';
    explanation = 'Neither standard publisher transparency page (About, Contact) was detected in sampled public navigation.';
  }

  const evidence: EvidenceItem[] = [
    {
      id: 'ed-about',
      type: 'stat',
      title: `About page: ${aboutPage.found ? 'Found' : 'Not found in sampled public pages'}`,
      detail: aboutPage.found ? (aboutPage.url || 'Detected in public navigation') : 'Not detected in sampled public navigation.',
      url: aboutPage.url,
    },
    {
      id: 'ed-contact',
      type: 'stat',
      title: `Contact page: ${contactPage.found ? 'Found' : 'Not found in sampled public pages'}`,
      detail: contactPage.found ? (contactPage.url || 'Detected in public navigation') : 'Not detected in sampled public navigation.',
      url: contactPage.url,
    },
  ];

  return {
    status,
    signalStatus,
    signalState,
    headline,
    aboutPage,
    contactPage,
    authorProfiles,
    editorialPolicy,
    privacyPolicy,
    termsOfService,
    explanation,
    evidence,
  };
}
