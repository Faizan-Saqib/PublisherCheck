export type RiskLevel =
  | 'NO MAJOR CAUTION SIGNALS'
  | 'REVIEW RECOMMENDED'
  | 'STRONG CAUTION SIGNALS'
  | 'INSUFFICIENT DATA'
  | 'LOW RISK SIGNALS'
  | 'SOME RISK SIGNALS'
  | 'SEVERAL RISK SIGNALS';

export type CheckSignalState = 'VERIFIED' | 'SIGNAL' | 'NOT_CHECKED';

export type SignalStatus = 'VERIFIED_POSITIVE' | 'SIGNAL_NEUTRAL' | 'SIGNAL_CAUTION' | 'SIGNAL_WARNING' | 'NOT_CHECKED';

export interface EvidenceItem {
  id: string;
  type: 'url' | 'phrase' | 'domain' | 'stat' | 'note';
  title: string;
  detail?: string;
  url?: string;
  count?: number;
}

export interface PublishingCheckResult {
  status: 'active' | 'slow' | 'inactive' | 'not_checked';
  signalStatus: SignalStatus;
  signalState: CheckSignalState;
  headline: string;
  latestPostDate: string | null;
  postsLast30Days?: number;
  postsLast90Days?: number;
  totalArticlesSampled: number;
  sampledArticlesWithDates: number;
  totalArticlesOnSite: number | null;
  totalArticlesOnSiteSource?: string | null;
  explanation: string;
  evidence: EvidenceItem[];
}

export type LinkTargetCategory = 'editorial_ref' | 'commercial' | 'affiliate' | 'social' | 'platform' | 'general';

export interface DomainLinkCount {
  domain: string;
  count: number;
  isCommonPlatform: boolean;
  articlesCount: number;
  category?: LinkTargetCategory;
}

export interface LinkClassificationBreakdown {
  editorialCitationCount: number;
  affiliateMonetizedCount: number;
  commercialBrandCount: number;
  commercialOrAffiliateCount: number;
  socialOrCommunityCount: number;
  platformOrTechCount: number;
  generalExternalCount: number;
  keywordAnchorCount: number;
  brandOrDomainAnchorCount: number;
  genericAnchorCount: number;
  emptyOrImageAnchorCount: number;
  classifiedDetails?: {
    editorialDomains: string[];
    commercialDomains: string[];
    affiliateDomains?: string[];
    affiliateTaggedCount: number;
    commercialAnchorSamples: string[];
  };
}

export interface PageOutboundStats {
  url: string;
  title: string;
  externalLinksCount: number;
  internalLinksCount: number;
  topExternalDomains: string[];
}

export interface RelAttributeAuditBreakdown {
  follow: number;
  nofollow: number;
  sponsored: number;
  ugc: number;
  unknown: number;
  rawRelTokenCounts?: {
    nofollowTokenCount: number;
    sponsoredTokenCount: number;
    ugcTokenCount: number;
    followTokenCount: number;
    unknownTokensFound: string[];
  };
}

export type LinkRelType = 'FOLLOW' | 'NOFOLLOW' | 'SPONSORED' | 'UGC' | 'UNKNOWN';

export interface OutboundLinksResult {
  status: 'normal' | 'moderate' | 'high' | 'not_checked';
  signalStatus: SignalStatus;
  signalState: CheckSignalState;
  headline: string;
  totalArticlesSampled: number;
  totalArticlePagesSampled?: number;
  totalExternalLinks: number;
  totalInternalLinks: number;
  avgExternalPerArticle: number;
  maxExternalOnSingleArticle: number;
  followedLinksCount: number;
  nofollowLinksCount: number;
  sponsoredLinksCount: number;
  ugcLinksCount: number;
  unknownRelLinksCount: number;
  relAudit?: RelAttributeAuditBreakdown;
  topExternalDomains: DomainLinkCount[];
  pagesWithHighestExternalLinks: PageOutboundStats[];
  linkClassification?: LinkClassificationBreakdown;
  explanation: string;
  evidence: EvidenceItem[];
}

export interface DetectedCategory {
  name: string;
  url?: string;
  source: 'navigation' | 'menu' | 'archive' | 'taxonomy' | 'sitemap';
}

export interface TopicShare {
  topic: string;
  count: number;
  percentage: number;
  sampleUrls?: string[];
}

export interface TopicFocusResult {
  headline?: string;
  explanation?: string;
  dominantTopic?: string;
  topicShares?: TopicShare[];
  observedTopics?: TopicShare[];
  distinctTopicCount?: number;
  patternDescription?: string;
  isUncertain?: boolean;
  sampleSize?: number;
  breadth?: 'focused' | 'moderate' | 'broad';
  isTaxonomyBased?: boolean;
}

export interface ListedCategoriesResult {
  status: 'detected' | 'not_detected' | 'not_checked';
  signalStatus: SignalStatus;
  signalState: CheckSignalState;
  headline: string;
  categories: DetectedCategory[];
  count: number;
  sourcesFound: string[];
  topicFocus?: TopicFocusResult;
  explanation: string;
  evidence: EvidenceItem[];
}

export interface GuestPostSignalsResult {
  status: 'found' | 'not_detected' | 'not_checked';
  signalStatus: SignalStatus;
  signalState: CheckSignalState;
  headline: string;
  contributionPagesFound: {
    title: string;
    url: string;
    matchType: 'url_slug' | 'page_title' | 'anchor_text' | 'body_phrase';
    matchedPhrase: string;
    commercialTermsDetected?: string[];
  }[];
  commercialTermsFound?: string[];
  hasCommercialTerms?: boolean;
  explanation: string;
  evidence: EvidenceItem[];
}

export interface EditorialTransparencyResult {
  status: 'good' | 'partial' | 'minimal' | 'not_checked';
  signalStatus: SignalStatus;
  signalState: CheckSignalState;
  headline: string;
  aboutPage: { found: boolean; url?: string; title?: string };
  contactPage: { found: boolean; url?: string; title?: string };
  authorProfiles: { found: boolean; sampleAuthors: string[]; count: number };
  editorialPolicy: { found: boolean; url?: string; title?: string };
  privacyPolicy: { found: boolean; url?: string; title?: string };
  termsOfService: { found: boolean; url?: string; title?: string };
  explanation: string;
  evidence: EvidenceItem[];
}

export interface ContentAuthorSignalsResult {
  status: 'transparent' | 'mixed' | 'opaque' | 'not_checked';
  signalStatus: SignalStatus;
  signalState: CheckSignalState;
  headline: string;
  authorNamesFoundCount: number;
  articlesWithAuthorCount: number;
  articlesWithDatesCount: number;
  articlesWithUpdatedDatesCount: number;
  genericAuthorDetected: boolean; // e.g. "admin", "editor", "webmaster"
  topAuthors: { name: string; count: number }[];
  explanation: string;
  evidence: EvidenceItem[];
}

export interface TechnicalChecksResult {
  status: 'good' | 'caution' | 'warning' | 'not_checked';
  signalStatus: SignalStatus;
  signalState: CheckSignalState;
  headline: string;
  isHttps: boolean;
  httpToHttpsRedirect: boolean | 'not_applicable' | 'failed';
  redirectCount: number;
  redirectChain: string[];
  robotsTxtFound: boolean;
  robotsTxtUrl?: string;
  robotsAllowsCrawling: boolean;
  sitemapFound: boolean;
  sitemapUrl?: string;
  sitemapType?: 'standard' | 'index' | 'rss_feed' | 'none';
  canonicalTagsRatio: number; // 0 to 1
  noindexDetectedCount: number;
  statusCode: number;
  responseSpeedMs: number;
  explanation: string;
  evidence: EvidenceItem[];
}

export interface SampledPageSummary {
  url: string;
  title: string;
  publishDate: string | null;
  author: string | null;
  externalLinksCount: number;
  internalLinksCount: number;
  hasSponsoredLinks: boolean;
  wordCount?: number;
  articleConfidence?: number;
  isVerifiedArticle?: boolean;
}

export interface SignalCounts {
  verified: number;
  signal: number;
  notChecked: number;
  total: number;
}

export interface PublisherCheckReport {
  id: string;
  targetUrl: string;
  normalizedDomain: string;
  analyzedAt: string; // ISO timestamp
  isCached: boolean;
  cachedAt?: string;
  isDemoData?: boolean;
  
  // Overall Summary & Counts
  overallRiskLevel: RiskLevel;
  signalCounts: SignalCounts;
  checksCompletedCount: number;
  checksTotalCount: number;
  summaryVerdict: string;
  
  // Completed Core Modules
  publishing: PublishingCheckResult;
  outboundLinks: OutboundLinksResult;
  technicalChecks: TechnicalChecksResult;
  guestPostSignals: GuestPostSignalsResult;
  editorialTransparency: EditorialTransparencyResult;
  contentAuthors: ContentAuthorSignalsResult;
  categories?: ListedCategoriesResult;
  contentRedFlags?: never;
  
  // Crawl Metadata
  sampledPages: SampledPageSummary[];
  totalPagesDiscovered: number;
  crawlDurationMs: number;
  crawlerNotes?: string[];
  validationNotes?: string[];
  validationPassApplied?: boolean;
}

export interface CheckUrlRequest {
  url: string;
  forceRefresh?: boolean;
}

export interface CheckUrlResponse {
  success: boolean;
  report?: PublisherCheckReport;
  error?: string;
  code?: string;
}
