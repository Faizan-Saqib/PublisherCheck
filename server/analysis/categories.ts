import { CrawlSessionResult } from '../crawler/discovery.js';
import { ListedCategoriesResult, DetectedCategory, EvidenceItem } from '../../src/types.js';

const NON_CATEGORY_WORDS = new Set([
  'home', 'homepage', 'about', 'about us', 'contact', 'contact us', 'privacy', 'privacy policy',
  'terms', 'terms of service', 'terms and conditions', 'write for us', 'contribute', 'advertise',
  'advertising', 'login', 'log in', 'sign in', 'sign up', 'register', 'subscribe', 'newsletter',
  'search', 'cart', 'checkout', 'my account', 'account', 'shop', 'store', 'pricing', 'faqs', 'faq',
  'support', 'help', 'rss', 'feed', 'sitemap', 'disclaimer', 'cookies', 'cookie policy', 'editorial policy',
  'careers', 'jobs', 'team', 'our team', 'authors', 'author', 'archive', 'archives', 'all posts',
  'all articles', 'latest', 'recent', 'popular', 'trending', 'read more', 'view all', 'menu', 'close',
  'back', 'next', 'previous', 'share', 'follow us', 'facebook', 'twitter', 'x', 'instagram', 'linkedin',
  'youtube', 'pinterest', 'tiktok', 'github', 'reddit', 'threads'
]);

export function analyzeListedCategories(crawl: CrawlSessionResult): ListedCategoriesResult {
  const categoryMap = new Map<string, { cat: DetectedCategory; sourceLabel: string }>();
  const sourcesFound = new Set<string>();

  const addCategory = (
    rawName: string,
    url: string | undefined,
    source: DetectedCategory['source'],
    sourceLabel: string
  ) => {
    let name = rawName.trim();
    // Strip surrounding punctuation, bullet points, pipes, slashes
    name = name.replace(/^[•\-\/|:»›\s]+|[•\-\/|:»›\s]+$/g, '').trim();
    // Strip trailing parenthesized or bracketed counts e.g. "(12)" or "[5]"
    name = name.replace(/\s*\(\d+\)$/, '').trim();
    name = name.replace(/\s*\[\d+\]$/, '').trim();

    if (!name || name.length < 2 || name.length > 50) return;
    if (name.includes('\n') || name.includes('\r')) return;

    const lower = name.toLowerCase();
    if (NON_CATEGORY_WORDS.has(lower)) return;
    if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('www.')) return;
    if (categoryMap.has(lower)) return;

    // Report exact category names used by the website (preserve original casing and characters)
    categoryMap.set(lower, {
      cat: {
        name,
        url,
        source,
      },
      sourceLabel,
    });
    sourcesFound.add(sourceLabel);
  };

  const hp = crawl.homepage.$;
  const baseUrl = crawl.baseUrl;

  // Helper to resolve clean absolute URL
  const resolveUrl = (href: string | undefined): string | undefined => {
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      return undefined;
    }
    try {
      return new URL(href, baseUrl.origin).href;
    } catch {
      return undefined;
    }
  };

  // Helper to extract clean text from an anchor without child counter tags
  const extractAnchorText = (el: any, $: any): string => {
    try {
      const $clone = $(el).clone();
      $clone.find('.count, .post-count, .badge, [class*="count"], [class*="badge"], span.cat-count').remove();
      return $clone.text().trim();
    } catch {
      return $(el).text().trim();
    }
  };

  // 1. Blogger / Blogspot labels and categories
  hp('a[href*="/search/label/"], .widget.Label a, .cloud-label-widget-content a, .list-label-widget-content a, a.label-name').each((_, el) => {
    const $el = hp(el);
    const href = $el.attr('href') || '';
    const fullUrl = resolveUrl(href);
    let text = extractAnchorText(el, hp);

    if (!text && href.includes('/search/label/')) {
      try {
        const labelPart = href.split('/search/label/')[1]?.split('?')[0]?.split('#')[0];
        if (labelPart) {
          text = decodeURIComponent(labelPart).replace(/[+]/g, ' ').trim();
        }
      } catch {
        // ignore
      }
    }

    if (text) {
      addCategory(text, fullUrl, 'taxonomy', 'Blogger labels/categories');
    }
  });

  // 2. Dedicated Category Menus and Taxonomy Widgets
  hp('.widget_categories a, .widget_category a, ul.wp-block-categories a, li.cat-item a, .category-menu a, #category-menu a, .cat-menu a, .categories-list a, .category-list a, .topics-menu a, .sections-nav a, a[rel="category tag"], a[rel="category"]').each((_, el) => {
    const $el = hp(el);
    const href = $el.attr('href') || '';
    const fullUrl = resolveUrl(href);
    const text = extractAnchorText(el, hp);

    if (text) {
      addCategory(text, fullUrl, 'menu', 'category menus');
    }
  });

  // 3. Public Taxonomy & Archive URLs in links
  hp('a[href*="/category/"], a[href*="/categories/"], a[href*="/topic/"], a[href*="/topics/"], a[href*="/section/"], a[href*="/sections/"], a[href*="/channel/"], a[href*="/rubrik/"]').each((_, el) => {
    const $el = hp(el);
    const href = $el.attr('href') || '';
    const fullUrl = resolveUrl(href);
    if (!fullUrl) return;

    let text = extractAnchorText(el, hp);

    // If text is not present or an icon, attempt to decode exact slug name
    if (!text) {
      const match = href.toLowerCase().match(/\/(category|categories|topics|topic|section|sections|channel|rubrik)\/([^/?#]+)/i);
      if (match && match[2]) {
        try {
          text = decodeURIComponent(match[2]).replace(/[-_+]/g, ' ').trim();
        } catch {
          text = match[2].replace(/[-_+]/g, ' ').trim();
        }
      }
    }

    if (text) {
      addCategory(text, fullUrl, 'archive', 'public taxonomy/archive URLs');
    }
  });

  // 4. Main Navigation Menus
  hp('nav a, header nav a, [role="navigation"] a, #main-nav a, #main-menu a, .main-navigation a, .site-navigation a, .nav-menu a, .navbar-nav a, .primary-menu a, #primary-menu a').each((_, el) => {
    const $el = hp(el);
    const href = $el.attr('href') || '';
    const fullUrl = resolveUrl(href);
    if (!fullUrl) return;

    // Must be internal link
    try {
      const u = new URL(fullUrl);
      if (u.origin !== baseUrl.origin) return;
    } catch {
      return;
    }

    const text = extractAnchorText(el, hp);
    if (!text || text.length < 2 || text.length > 35) return;

    // Check if link is a direct content category link in navigation
    addCategory(text, fullUrl, 'navigation', 'main navigation menus');
  });

  // 5. Check sitemap entries for explicit taxonomy/category URLs if sitemap was parsed
  if (crawl.sitemap && crawl.sitemap.found && crawl.sitemap.entries && crawl.sitemap.entries.length > 0) {
    for (const entry of crawl.sitemap.entries) {
      const uLower = entry.url.toLowerCase();
      const match = uLower.match(/\/(category|categories|topics|topic|section|sections|rubrik)\/([^/?#]+)/i);
      if (match && match[2]) {
        try {
          const rawSlug = entry.url.split(match[1] + '/')[1]?.split('/')[0]?.split('?')[0];
          if (rawSlug) {
            const decoded = decodeURIComponent(rawSlug).replace(/[-_+]/g, ' ').trim();
            if (decoded && !NON_CATEGORY_WORDS.has(decoded.toLowerCase())) {
              addCategory(decoded, entry.url, 'sitemap', 'public taxonomy/archive URLs');
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  const detectedItems = Array.from(categoryMap.values());
  const categories: DetectedCategory[] = detectedItems.map(item => item.cat).slice(0, 30);
  const count = categories.length;
  const isDetected = count > 0;
  const sourcesList = Array.from(sourcesFound);

  if (isDetected) {
    const evidence: EvidenceItem[] = [
      {
        id: 'cat-summary',
        type: 'stat',
        title: 'Publicly Declared Category Structure',
        detail: `Found ${count} category ${count === 1 ? 'name' : 'names'} through ${sourcesList.join(', ') || 'first-party website structure'}.`,
      },
    ];

    for (const item of detectedItems.slice(0, 10)) {
      evidence.push({
        id: `cat-${item.cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        type: 'url',
        title: item.cat.name,
        detail: `Detected in ${item.sourceLabel}${item.cat.url ? ` (${item.cat.url})` : ''}`,
        url: item.cat.url,
      });
    }

    return {
      status: 'detected',
      signalStatus: 'VERIFIED_POSITIVE',
      signalState: 'VERIFIED',
      headline: 'Listed Categories',
      categories,
      count,
      sourcesFound: sourcesList,
      explanation: `PublisherCheck identified ${count} publicly declared ${count === 1 ? 'category' : 'categories'} in the website's accessible first-party structure (${sourcesList.join(', ') || 'public navigation'}). Exact category names are reported as declared by the website.`,
      evidence,
    };
  } else {
    return {
      status: 'not_detected',
      signalStatus: 'SIGNAL_NEUTRAL',
      signalState: 'VERIFIED',
      headline: 'No Explicit Category Structure Detected',
      categories: [],
      count: 0,
      sourcesFound: [],
      explanation:
        'No explicit category navigation or public taxonomy structure was found in the accessible first-party website structure checked. This does not establish that the site has no internal categories; it only means PublisherCheck could not verify a public category structure.',
      evidence: [
        {
          id: 'cat-none',
          type: 'note',
          title: 'No Explicit Category Structure Detected',
          detail:
            'No explicit category navigation or public taxonomy structure was found in the accessible first-party website structure checked. This does not establish that the site has no internal categories; it only means PublisherCheck could not verify a public category structure.',
        },
      ],
    };
  }
}
