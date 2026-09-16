import { CrawlSessionResult } from '../crawler/discovery.js';
import { GuestPostSignalsResult, EvidenceItem } from '../../src/types.js';

const CONTRIBUTION_PHRASES = [
  'write for us',
  'guest post',
  'guest posts',
  'guest article',
  'submit an article',
  'submit your article',
  'become a contributor',
  'contribute to our blog',
  'contributor guidelines',
  'guest blogging guidelines',
  'sponsored post',
  'partner with us',
  'advertise with us',
];

const EXPLICIT_COMMERCIAL_TERMS = [
  'sponsored post',
  'sponsored article',
  'paid guest post',
  'paid contribution',
  'publishing fee',
  'editorial fee',
  'admin fee',
  'processing fee',
  'casino',
  'gambling',
  'betting',
  'cbd',
  'forex',
  'turnaround time',
  'tat: ',
  'paypal',
  'crypto accepted',
  'rate card',
];

export function analyzeGuestPostSignals(crawl: CrawlSessionResult): GuestPostSignalsResult {
  const contributionPagesFound: {
    title: string;
    url: string;
    matchType: 'url_slug' | 'page_title' | 'anchor_text' | 'body_phrase';
    matchedPhrase: string;
    commercialTermsDetected?: string[];
  }[] = [];

  const seenUrls = new Set<string>();
  const commercialTermsFound: string[] = [];

  // 1. Check utility pages (especially contribute page if fetched)
  if (crawl.utilityPages.contribute) {
    const page = crawl.utilityPages.contribute;
    const pageTitle = page.title.toLowerCase();
    const bodyText = page.$('body').text().toLowerCase();

    for (const phrase of CONTRIBUTION_PHRASES) {
      if (page.url.toLowerCase().includes(phrase.replace(/\s+/g, '-')) ||
          pageTitle.includes(phrase) ||
          bodyText.includes(phrase)) {
        if (!seenUrls.has(page.url)) {
          seenUrls.add(page.url);

          // Inspect page content for explicit commercial indicators
          const pageCommercialTerms: string[] = [];
          for (const term of EXPLICIT_COMMERCIAL_TERMS) {
            if (bodyText.includes(term)) {
              pageCommercialTerms.push(term);
              if (!commercialTermsFound.includes(term)) {
                commercialTermsFound.push(term);
              }
            }
          }

          // Check regex for explicit prices (e.g. $50, 100 USD)
          if (/\$\d{2,4}\b/.test(bodyText) || /\b\d{2,4}\s*(usd|eur|gbp)\b/i.test(bodyText)) {
            const priceMatch = bodyText.match(/\$\d{2,4}\b/) || bodyText.match(/\b\d{2,4}\s*(usd|eur|gbp)\b/i);
            if (priceMatch && !commercialTermsFound.includes(priceMatch[0])) {
              pageCommercialTerms.push(priceMatch[0]);
              commercialTermsFound.push(priceMatch[0]);
            }
          }

          contributionPagesFound.push({
            title: page.title || 'Contribution Guidelines',
            url: page.url,
            matchType: pageTitle.includes(phrase) ? 'page_title' : 'body_phrase',
            matchedPhrase: phrase,
            commercialTermsDetected: pageCommercialTerms.length > 0 ? pageCommercialTerms : undefined,
          });
          break;
        }
      }
    }
  }

  // 2. Scan all links on the Homepage
  crawl.homepage.$('a[href]').each((_, el) => {
    const href = crawl.homepage.$(el).attr('href') || '';
    const anchorText = crawl.homepage.$(el).text().trim().toLowerCase();

    if (!href.startsWith('http') && !href.startsWith('/')) return;

    let fullUrl = '';
    try {
      fullUrl = new URL(href, crawl.baseUrl.origin).href;
    } catch {
      return;
    }

    const lowerUrl = fullUrl.toLowerCase();

    for (const phrase of CONTRIBUTION_PHRASES) {
      const slugVersion = phrase.replace(/\s+/g, '-');
      const isAnchorMatch = anchorText.includes(phrase);
      const isUrlMatch = lowerUrl.includes(slugVersion) || lowerUrl.includes(phrase.replace(/\s+/g, ''));

      if (isAnchorMatch || isUrlMatch) {
        if (!seenUrls.has(fullUrl)) {
          seenUrls.add(fullUrl);
          contributionPagesFound.push({
            title: crawl.homepage.$(el).text().trim() || phrase,
            url: fullUrl,
            matchType: isAnchorMatch ? 'anchor_text' : 'url_slug',
            matchedPhrase: phrase,
          });
        }
      }
    }
  });

  const isFound = contributionPagesFound.length > 0;
  const hasCommercialTerms = commercialTermsFound.length > 0;
  const evidence: EvidenceItem[] = [];

  if (isFound) {
    for (const item of contributionPagesFound.slice(0, 5)) {
      evidence.push({
        id: `gp-${Math.random().toString(36).slice(2, 7)}`,
        type: 'url',
        title: `Contribution page detected: "${item.title}"`,
        detail: `Matched phrase: "${item.matchedPhrase}" via ${item.matchType} at ${item.url}${
          item.commercialTermsDetected && item.commercialTermsDetected.length > 0
            ? ` (Commercial terms detected: ${item.commercialTermsDetected.join(', ')})`
            : ''
        }`,
        url: item.url,
      });
    }

    if (hasCommercialTerms) {
      evidence.push({
        id: 'gp-commercial-evidence',
        type: 'note',
        title: `Explicit Commercial Terms: ${commercialTermsFound.join(', ')}`,
        detail: 'Direct text indicators found on submission page indicating fees or commercial terms.',
      });

      return {
        status: 'found',
        signalStatus: 'SIGNAL_CAUTION',
        signalState: 'SIGNAL',
        headline: 'Caution: Explicit commercial contribution terms observed',
        contributionPagesFound,
        commercialTermsFound,
        hasCommercialTerms: true,
        explanation: `An explicit contribution page was detected at ${contributionPagesFound[0].url}. Observable commercial terms were detected in page content: ${commercialTermsFound.join(', ')}.`,
        evidence,
      };
    } else {
      return {
        status: 'found',
        signalStatus: 'SIGNAL_NEUTRAL',
        signalState: 'VERIFIED',
        headline: 'Contribution guidelines observed without explicit commercial terms',
        contributionPagesFound,
        commercialTermsFound: [],
        hasCommercialTerms: false,
        explanation: `Contribution guidelines detected at ${contributionPagesFound[0].url}. No explicit commercial terms were found in the accessible page content (no pricing or publishing fees detected). The presence of contributor guidelines is a standard publisher practice.`,
        evidence,
      };
    }
  } else {
    return {
      status: 'not_detected',
      signalStatus: 'VERIFIED_POSITIVE',
      signalState: 'VERIFIED',
      headline: 'Contribution or Write for Us page not detected in public navigation',
      contributionPagesFound: [],
      commercialTermsFound: [],
      hasCommercialTerms: false,
      explanation: 'No public "Write for Us" or contribution page was detected in the homepage navigation or scanned utility paths. This is an observable signal and not proof of whether guest contributions are accepted.',
      evidence: [
        {
          id: 'gp-none',
          type: 'note',
          title: 'Not Detected in Public Navigation',
          detail: 'No public contribution or submission guidelines link identified during inspection.',
        },
      ],
    };
  }
}
