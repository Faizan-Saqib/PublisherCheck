import * as cheerio from 'cheerio';
import { CrawlSessionResult } from '../crawler/discovery.js';
import {
  OutboundLinksResult,
  DomainLinkCount,
  PageOutboundStats,
  EvidenceItem,
  LinkClassificationBreakdown,
  LinkTargetCategory,
  LinkRelType,
  RelAttributeAuditBreakdown,
} from '../../src/types.js';

// Standard known link relation types defined by HTML/W3C/WHATWG/IANA specifications
// that represent benign browser/navigation relationships and do not alter crawl follow semantics:
const STANDARD_BENIGN_REL_TOKENS = new Set([
  'noopener',
  'noreferrer',
  'external',
  'opener',
  'author',
  'bookmark',
  'help',
  'license',
  'next',
  'prev',
  'previous',
  'search',
  'tag',
  'alternate',
  'canonical',
  'dns-prefetch',
  'preconnect',
  'prefetch',
  'preload',
  'prerender',
]);

export interface IndividualLinkRelAudit {
  rawRelString: string | null;
  tokens: string[];
  classification: LinkRelType;
  hasNofollowToken: boolean;
  hasSponsoredToken: boolean;
  hasUgcToken: boolean;
  hasFollowToken: boolean;
  unknownTokens: string[];
}

/**
 * Audits an outbound link's rel attribute on an individual link basis.
 * Strictly distinguishes between FOLLOW, NOFOLLOW, SPONSORED, UGC, and UNKNOWN,
 * ensuring total counts are mathematically consistent with raw data and
 * completely excluding unverified inferences.
 */
export function auditIndividualLinkRel(rawRel: string | null | undefined): IndividualLinkRelAudit {
  if (!rawRel || typeof rawRel !== 'string') {
    return {
      rawRelString: null,
      tokens: [],
      classification: 'FOLLOW',
      hasNofollowToken: false,
      hasSponsoredToken: false,
      hasUgcToken: false,
      hasFollowToken: false,
      unknownTokens: [],
    };
  }

  const trimmed = rawRel.trim().toLowerCase();
  if (trimmed.length === 0) {
    return {
      rawRelString: rawRel,
      tokens: [],
      classification: 'FOLLOW',
      hasNofollowToken: false,
      hasSponsoredToken: false,
      hasUgcToken: false,
      hasFollowToken: false,
      unknownTokens: [],
    };
  }

  // Split by whitespace per HTML attribute tokenization rules
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const tokenSet = new Set(tokens);

  const hasNofollowToken = tokenSet.has('nofollow');
  const hasSponsoredToken = tokenSet.has('sponsored');
  const hasUgcToken = tokenSet.has('ugc');
  const hasFollowToken = tokenSet.has('follow');

  // Any tokens outside recognized search directives and standard benign HTML rel types:
  const unknownTokens = tokens.filter(
    t => !STANDARD_BENIGN_REL_TOKENS.has(t) && !['nofollow', 'sponsored', 'ugc', 'follow'].includes(t)
  );

  // Exact mutually exclusive classification without unverified inferences:
  // 1. SPONSORED: Explicitly tagged with 'sponsored'
  // 2. UGC: Explicitly tagged with 'ugc' (and not sponsored)
  // 3. NOFOLLOW: Explicitly tagged with 'nofollow' (and not sponsored or ugc)
  // 4. UNKNOWN: Contains unrecognized/custom/malformed rel tokens (e.g. 'dofollow', 'custom', 'partner')
  //    without recognized search directives. We exclude unverified inferences.
  // 5. FOLLOW: Standard link with no restrictions (benign standard tokens, explicit 'follow', or empty)
  let classification: LinkRelType;
  if (hasSponsoredToken) {
    classification = 'SPONSORED';
  } else if (hasUgcToken) {
    classification = 'UGC';
  } else if (hasNofollowToken) {
    classification = 'NOFOLLOW';
  } else if (unknownTokens.length > 0) {
    classification = 'UNKNOWN';
  } else {
    classification = 'FOLLOW';
  }

  return {
    rawRelString: rawRel,
    tokens,
    classification,
    hasNofollowToken,
    hasSponsoredToken,
    hasUgcToken,
    hasFollowToken,
    unknownTokens,
  };
}

const EDITORIAL_REFERENCE_DOMAINS = new Set([
  'wikipedia.org',
  'en.wikipedia.org',
  'wikimedia.org',
  'britannica.com',
  'archive.org',
  'w3.org',
  'schema.org',
  'doi.org',
  'nih.gov',
  'cdc.gov',
  'who.int',
  'statista.com',
  'pewresearch.org',
  'arxiv.org',
  'nature.com',
  'sciencedirect.com',
  'reuters.com',
  'apnews.com',
  'bbc.com',
  'nytimes.com',
  'wsj.com',
  'theguardian.com',
  'bloomberg.com',
  'washingtonpost.com',
  'ft.com',
  'forbes.com',
  'techcrunch.com',
  'theverge.com',
  'wired.com',
]);

const SOCIAL_DOMAINS = new Set([
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'pinterest.com',
  'tiktok.com',
  'reddit.com',
  'youtube.com',
  'youtu.be',
  'threads.net',
  'bsky.app',
  'mastodon.social',
  't.me',
  'telegram.org',
  'discord.gg',
  'discord.com',
  'whatsapp.com',
  'medium.com',
  'substack.com',
]);

const PLATFORM_TECH_DOMAINS = new Set([
  'google.com',
  'apple.com',
  'microsoft.com',
  'github.com',
  'cloudflare.com',
  'wordpress.org',
  'adobe.com',
  'mozilla.org',
  'docker.com',
  'gitlab.com',
  'npmjs.com',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'gstatic.com',
  'jsdelivr.net',
  'unpkg.com',
  'gravatar.com',
  'vimeo.com',
]);

const AFFILIATE_DOMAINS = new Set([
  'amzn.to',
  'shareasale.com',
  'awin1.com',
  'cj.com',
  'commission-junction.com',
  'impact.com',
  'impactradius.com',
  'clickbank.net',
  'rakuten.com',
  'tradedoubler.com',
  'partnerize.com',
  'skimresources.com',
  'viglink.com',
  'pepperjam.com',
  'flexoffers.com',
  'avantlink.com',
  'linkbux.com',
  'involve.asia',
  'refersion.com',
  'rewardstyle.com',
  'shopstyle.com',
  'magiclinks.com',
  'sovrn.com',
]);

const KNOWN_COMMERCIAL_BRAND_DOMAINS = new Set([
  'amazon.com',
  'ebay.com',
  'walmart.com',
  'target.com',
  'bestbuy.com',
  'shopify.com',
  'salesforce.com',
  'hubspot.com',
  'stripe.com',
  'paypal.com',
  'slack.com',
  'zoom.us',
  'notion.so',
  'figma.com',
  'canva.com',
  'atlassian.com',
  'zendesk.com',
  'intuit.com',
  'booking.com',
  'expedia.com',
  'airbnb.com',
  'tripadvisor.com',
  'uber.com',
  'lyft.com',
]);

const GENERIC_ANCHORS = new Set([
  'click here',
  'read more',
  'learn more',
  'source',
  'link',
  'here',
  'website',
  'visit website',
  'visit site',
  'continue reading',
  'details',
  'this article',
  'page',
  'more info',
]);

const COMMERCIAL_ANCHOR_KEYWORDS = [
  'buy',
  'coupon',
  'discount',
  'promo code',
  'best price',
  'order now',
  'pricing',
  'free trial',
  'deal',
  'bonus',
  'casino',
  'gambling',
  'betting',
  'lawyer',
  'insurance',
  'loans',
  'credit score',
  'vpn service',
  'hosting plan',
];

function classifyDomainAndLink(host: string, parsedUrl: URL, rawRel?: string | null): { category: LinkTargetCategory; isAffiliate: boolean } {
  const clean = host.replace(/^www\./, '').toLowerCase();

  // Government & Academic TLDs -> editorial_ref
  if (clean.endsWith('.edu') || clean.endsWith('.gov') || clean.endsWith('.mil') || clean.endsWith('.ac.uk') || clean.endsWith('.gov.uk')) {
    return { category: 'editorial_ref', isAffiliate: false };
  }

  // Observable affiliate parameters or affiliate networks
  const hasAffiliateParam = /[?&](tag|aff|affiliate|ref|partner|aid|subid|clickid|tracking|campaign_id)=/i.test(parsedUrl.search);
  const isAffiliateNetwork = AFFILIATE_DOMAINS.has(clean) || Array.from(AFFILIATE_DOMAINS).some(d => clean.endsWith('.' + d));

  if (hasAffiliateParam || isAffiliateNetwork) {
    return { category: 'affiliate', isAffiliate: true };
  }

  // Explicit rel="sponsored"
  const lowerRel = (rawRel || '').toLowerCase();
  if (lowerRel.includes('sponsored')) {
    return { category: 'affiliate', isAffiliate: true };
  }

  if (EDITORIAL_REFERENCE_DOMAINS.has(clean)) return { category: 'editorial_ref', isAffiliate: false };
  if (SOCIAL_DOMAINS.has(clean)) return { category: 'social', isAffiliate: false };
  if (PLATFORM_TECH_DOMAINS.has(clean)) return { category: 'platform', isAffiliate: false };
  if (KNOWN_COMMERCIAL_BRAND_DOMAINS.has(clean)) return { category: 'commercial', isAffiliate: false };

  // Conservative fallback: default to general external rather than forcing into commercial
  return { category: 'general', isAffiliate: false };
}

function extractArticleContentEl($: cheerio.CheerioAPI): cheerio.Cheerio<any> {
  const contentSelectors = [
    '[itemprop="articleBody"]',
    'article .entry-content',
    'article .post-content',
    'article .article-content',
    '.entry-content',
    '.post-content',
    '.article-content',
    '.article-body',
    'article',
    'main article',
    'main',
    '#content',
    '.content',
  ];

  let selected: cheerio.Cheerio<any> | null = null;
  for (const sel of contentSelectors) {
    const el = $(sel);
    if (el.length > 0 && el.text().trim().length > 250) {
      selected = el.first();
      break;
    }
  }

  if (!selected) {
    selected = $('body');
  }

  // Clone and strip non-article elements to prevent navigation/footer links from contaminating article link analysis
  const bodyClone = selected.clone();
  bodyClone.find([
    'header', 'nav', 'footer', 'aside', '.sidebar', '.widget', '.widget-area',
    '.comments', '#comments', '.menu', '.social-share', '.share-buttons',
    '.related-posts', '.author-bio', '.author-box', '.ad', '.advertisement'
  ].join(', ')).remove();

  return bodyClone;
}

function isUtilityPage(url: string, title?: string): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  const utilityPatterns = [
    '/about', '/contact', '/privacy', '/terms', '/disclaimer',
    '/cookie', '/write-for-us', '/guest-post', '/advertise',
    '/sitemap', '/legal', '/dmca', '/author/', '/category/', '/tag/'
  ];
  if (utilityPatterns.some(p => lowerUrl.includes(p))) return true;
  if (/^(about|contact|privacy policy|terms of service|terms & conditions|write for us)/i.test(lowerTitle)) return true;
  return false;
}

export function analyzeOutboundLinks(crawl: CrawlSessionResult): OutboundLinksResult {
  const targetHost = crawl.baseUrl.hostname.replace(/^www\./, '').toLowerCase();
  const articles = crawl.sampledArticles;
  const totalArticles = articles.length;

  if (totalArticles === 0) {
    return {
      status: 'not_checked',
      signalStatus: 'NOT_CHECKED',
      signalState: 'NOT_CHECKED',
      headline: 'Outbound-link pattern: Not checked',
      totalArticlesSampled: 0,
      totalArticlePagesSampled: 0,
      totalExternalLinks: 0,
      totalInternalLinks: 0,
      avgExternalPerArticle: 0,
      maxExternalOnSingleArticle: 0,
      followedLinksCount: 0,
      nofollowLinksCount: 0,
      sponsoredLinksCount: 0,
      ugcLinksCount: 0,
      unknownRelLinksCount: 0,
      relAudit: {
        follow: 0,
        nofollow: 0,
        sponsored: 0,
        ugc: 0,
        unknown: 0,
        rawRelTokenCounts: {
          nofollowTokenCount: 0,
          sponsoredTokenCount: 0,
          ugcTokenCount: 0,
          followTokenCount: 0,
          unknownTokensFound: [],
        },
      },
      topExternalDomains: [],
      pagesWithHighestExternalLinks: [],
      explanation: 'No sample pages could be analyzed for outbound links.',
      evidence: [],
    };
  }

  let totalExternal = 0;
  let totalInternal = 0;
  let maxExternalAllPages = 0;
  let followedCount = 0;
  let nofollowCount = 0;
  let sponsoredCount = 0;
  let ugcCount = 0;
  let unknownRelCount = 0;

  // Raw token counts for auditing
  let nofollowTokenCount = 0;
  let sponsoredTokenCount = 0;
  let ugcTokenCount = 0;
  let followTokenCount = 0;
  const unknownTokensFound = new Set<string>();

  // Destination category counts (mutually exclusive)
  let editorialCitationCount = 0;
  let affiliateMonetizedCount = 0;
  let commercialBrandCount = 0;
  let socialOrCommunityCount = 0;
  let platformOrTechCount = 0;
  let generalExternalCount = 0;

  let keywordAnchorCount = 0;
  let brandOrDomainAnchorCount = 0;
  let genericAnchorCount = 0;
  let emptyOrImageAnchorCount = 0;

  const commercialDomainsFound = new Set<string>();
  const affiliateDomainsFound = new Set<string>();
  const editorialDomainsFound = new Set<string>();
  const commercialAnchorSamples = new Set<string>();
  let affiliateTaggedLinksCount = 0;

  const domainFrequency: Record<string, { count: number; articles: Set<string>; category: LinkTargetCategory }> = {};
  const pageStatsList: PageOutboundStats[] = [];

  // Article-only stats tracking (excluding utility pages from article-level calculations)
  let articlePagesCount = 0;
  let articleExtLinksTotal = 0;
  let maxExternalArticle = 0;

  for (const article of articles) {
    const isUtility = isUtilityPage(article.url, article.title);
    const isArticlePage = !isUtility && (article.pageType === 'article' || article.isVerifiedArticle !== false);

    const contentEl = extractArticleContentEl(article.$);
    let articleExtCount = 0;
    let articleIntCount = 0;
    const articleDomains = new Set<string>();

    contentEl.find('a[href]').each((_, el) => {
      const href = article.$(el).attr('href');
      const rawRel = article.$(el).attr('rel');
      const anchorText = article.$(el).text().trim();
      const lowerAnchor = anchorText.toLowerCase();

      if (!href) return;

      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      let parsed: URL;
      try {
        parsed = new URL(href, crawl.baseUrl.origin);
      } catch {
        return;
      }

      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      const isExternal = host !== targetHost && !host.endsWith('.' + targetHost);

      if (isExternal) {
        articleExtCount++;
        totalExternal++;
        articleDomains.add(host);

        // Audit individual link rel attribute
        const relAudit = auditIndividualLinkRel(rawRel);
        if (relAudit.classification === 'SPONSORED') {
          sponsoredCount++;
        } else if (relAudit.classification === 'UGC') {
          ugcCount++;
        } else if (relAudit.classification === 'NOFOLLOW') {
          nofollowCount++;
        } else if (relAudit.classification === 'UNKNOWN') {
          unknownRelCount++;
        } else {
          followedCount++;
        }

        if (relAudit.hasNofollowToken) nofollowTokenCount++;
        if (relAudit.hasSponsoredToken) sponsoredTokenCount++;
        if (relAudit.hasUgcToken) ugcTokenCount++;
        if (relAudit.hasFollowToken) followTokenCount++;
        for (const ut of relAudit.unknownTokens) {
          unknownTokensFound.add(ut);
        }

        // Domain & Link category inspection
        const classified = classifyDomainAndLink(host, parsed, rawRel);
        let category = classified.category;
        if (classified.isAffiliate) {
          affiliateTaggedLinksCount++;
          affiliateDomainsFound.add(host);
        }

        // Anchor text classification
        if (!anchorText || anchorText.length === 0) {
          emptyOrImageAnchorCount++;
        } else if (GENERIC_ANCHORS.has(lowerAnchor)) {
          genericAnchorCount++;
        } else if (
          lowerAnchor.includes('.') ||
          lowerAnchor.startsWith('http') ||
          lowerAnchor.startsWith('www') ||
          host.includes(lowerAnchor.replace(/[^a-z0-9]/g, ''))
        ) {
          brandOrDomainAnchorCount++;
        } else {
          keywordAnchorCount++;
          const isCommercialAnchor = COMMERCIAL_ANCHOR_KEYWORDS.some(kw => lowerAnchor.includes(kw));
          if (isCommercialAnchor && (category === 'general' || category === 'commercial')) {
            category = 'commercial';
            commercialDomainsFound.add(host);
            if (commercialAnchorSamples.size < 5) {
              commercialAnchorSamples.add(`"${anchorText.slice(0, 40)}" -> ${host}`);
            }
          }
        }

        // Aggregate category counts
        if (category === 'editorial_ref') {
          editorialCitationCount++;
          editorialDomainsFound.add(host);
        } else if (category === 'affiliate') {
          affiliateMonetizedCount++;
          affiliateDomainsFound.add(host);
        } else if (category === 'commercial') {
          commercialBrandCount++;
          commercialDomainsFound.add(host);
        } else if (category === 'social') {
          socialOrCommunityCount++;
        } else if (category === 'platform') {
          platformOrTechCount++;
        } else {
          generalExternalCount++;
        }

        // Domain tracking
        if (!domainFrequency[host]) {
          domainFrequency[host] = { count: 0, articles: new Set(), category };
        }
        domainFrequency[host].count++;
        domainFrequency[host].articles.add(article.url);
      } else {
        articleIntCount++;
        totalInternal++;
      }
    });

    if (articleExtCount > maxExternalAllPages) {
      maxExternalAllPages = articleExtCount;
    }

    if (isArticlePage) {
      articlePagesCount++;
      articleExtLinksTotal += articleExtCount;
      if (articleExtCount > maxExternalArticle) {
        maxExternalArticle = articleExtCount;
      }
    }

    pageStatsList.push({
      url: article.url,
      title: article.title || article.url,
      externalLinksCount: articleExtCount,
      internalLinksCount: articleIntCount,
      topExternalDomains: Array.from(articleDomains).slice(0, 5),
    });
  }

  // Calculate article-level link statistics prioritizing article pages
  const effectiveArticleCount = articlePagesCount > 0 ? articlePagesCount : totalArticles;
  const effectiveExtTotal = articlePagesCount > 0 ? articleExtLinksTotal : totalExternal;
  const avgExternal = effectiveArticleCount > 0 ? parseFloat((effectiveExtTotal / effectiveArticleCount).toFixed(1)) : 0;
  const maxExternal = articlePagesCount > 0 ? maxExternalArticle : maxExternalAllPages;

  // Format Top Domains
  const topExternalDomains: DomainLinkCount[] = Object.entries(domainFrequency)
    .map(([domain, data]) => ({
      domain,
      count: data.count,
      isCommonPlatform: data.category === 'social' || data.category === 'platform' || data.category === 'editorial_ref',
      articlesCount: data.articles.size,
      category: data.category,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  pageStatsList.sort((a, b) => b.externalLinksCount - a.externalLinksCount);
  const pagesWithHighestExternalLinks = pageStatsList.slice(0, 5);

  const linkClassification: LinkClassificationBreakdown = {
    editorialCitationCount,
    affiliateMonetizedCount,
    commercialBrandCount,
    commercialOrAffiliateCount: affiliateMonetizedCount + commercialBrandCount,
    socialOrCommunityCount,
    platformOrTechCount,
    generalExternalCount,
    keywordAnchorCount,
    brandOrDomainAnchorCount,
    genericAnchorCount,
    emptyOrImageAnchorCount,
    classifiedDetails: {
      editorialDomains: Array.from(editorialDomainsFound).slice(0, 8),
      commercialDomains: Array.from(commercialDomainsFound).slice(0, 8),
      affiliateDomains: Array.from(affiliateDomainsFound).slice(0, 8),
      affiliateTaggedCount: affiliateTaggedLinksCount,
      commercialAnchorSamples: Array.from(commercialAnchorSamples),
    },
  };

  // Observable statistic, neutral wording
  const status: 'normal' | 'moderate' | 'high' = 'normal';
  const signalStatus: 'VERIFIED_POSITIVE' | 'SIGNAL_NEUTRAL' | 'SIGNAL_CAUTION' | 'SIGNAL_WARNING' = 'SIGNAL_NEUTRAL';
  const signalState: 'VERIFIED' | 'SIGNAL' | 'NOT_CHECKED' = 'VERIFIED';

  const denominatorRatioStr = articlePagesCount > 0 && articlePagesCount < totalArticles
    ? `${articlePagesCount}/${totalArticles} sampled pages`
    : `${totalArticles}/${totalArticles} sampled pages`;

  const headline = `Average of ${avgExternal} external links per sampled article`;
  const explanation = `Observed an average of ${avgExternal} external links per sampled article (evaluated across ${effectiveArticleCount} article pages). Outbound-link density is an observable statistic and does not by itself indicate risk.`;

  // Evidence
  const relTitle = unknownRelCount > 0
    ? `Audited rel attributes: ${followedCount} Follow, ${nofollowCount} Nofollow, ${sponsoredCount} Sponsored, ${ugcCount} UGC, ${unknownRelCount} Unknown`
    : `Audited rel attributes: ${followedCount} Follow, ${nofollowCount} Nofollow, ${sponsoredCount} Sponsored, ${ugcCount} UGC`;

  const totalAudited = followedCount + nofollowCount + sponsoredCount + ugcCount + unknownRelCount;

  const evidence: EvidenceItem[] = [
    {
      id: 'ext-avg',
      type: 'stat',
      title: `${avgExternal} external links per article average`,
      detail: `Observed an average of ${avgExternal} external links per sampled article. Outbound-link density is an observable statistic and does not by itself indicate risk.`,
    },
    {
      id: 'ext-rel',
      type: 'stat',
      title: relTitle,
      detail: `Follow: ${followedCount} links (${totalAudited > 0 ? Math.round((followedCount / totalAudited) * 100) : 0}%). Sponsored: ${sponsoredCount}. UGC: ${ugcCount}. Nofollow: ${nofollowCount}.`,
    },
  ];

  return {
    status,
    signalStatus,
    signalState,
    headline,
    totalArticlesSampled: totalArticles,
    totalArticlePagesSampled: effectiveArticleCount,
    totalExternalLinks: totalExternal,
    totalInternalLinks: totalInternal,
    avgExternalPerArticle: avgExternal,
    maxExternalOnSingleArticle: maxExternal,
    followedLinksCount: followedCount,
    nofollowLinksCount: nofollowCount,
    sponsoredLinksCount: sponsoredCount,
    ugcLinksCount: ugcCount,
    unknownRelLinksCount: unknownRelCount,
    relAudit: {
      follow: followedCount,
      nofollow: nofollowCount,
      sponsored: sponsoredCount,
      ugc: ugcCount,
      unknown: unknownRelCount,
      rawRelTokenCounts: {
        nofollowTokenCount,
        sponsoredTokenCount,
        ugcTokenCount,
        followTokenCount,
        unknownTokensFound: Array.from(unknownTokensFound),
      },
    },
    topExternalDomains,
    pagesWithHighestExternalLinks,
    linkClassification,
    explanation,
    evidence,
  };
}
