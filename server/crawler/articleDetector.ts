import * as cheerio from 'cheerio';

export interface ExtractedArticleMetadata {
  isArticle: boolean;
  confidenceScore: number;
  schemaType?: string;
  title: string;
  metaDescription: string;
  canonicalUrl?: string;
  isNoindex: boolean;
  publishedDate?: string;
  updatedDate?: string;
  author?: string;
  authorUrl?: string;
  wordCount: number;
  paragraphCount: number;
  hasByline: boolean;
  detectionReasons: string[];
}

// Safely parse all JSON-LD blocks in HTML
export function parseJsonLdScripts(html: string): any[] {
  const objects: any[] = [];
  const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawContent = match[1]?.trim();
    if (!rawContent) continue;

    try {
      // Clean CDATA or leading/trailing comments
      const cleaned = rawContent
        .replace(/^\s*\/\/\s*<!\[CDATA\[/, '')
        .replace(/\/\/\s*\]\]>\s*$/, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        objects.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed['@graph'])) {
          objects.push(...parsed['@graph']);
        } else {
          objects.push(parsed);
        }
      }
    } catch {
      // ignore JSON parse errors in inline scripts
    }
  }

  return objects;
}

const ARTICLE_SCHEMA_TYPES = new Set([
  'article',
  'newsarticle',
  'blogposting',
  'techarticle',
  'report',
  'scholarlyarticle',
  'socialmediaposting',
  'liveblogposting',
  'analysisnewsarticle',
  'reviewnewsarticle',
  'opinionnewsarticle',
]);

const NON_ARTICLE_SCHEMA_TYPES = new Set([
  'collectionpage',
  'searchresultspage',
  'categorypage',
  'aboutpage',
  'contactpage',
  'product',
  'website',
  'organization',
  'person',
]);

export function findArticleSchema(jsonLdObjects: any[]): { isArticleSchema: boolean; schemaType?: string; data?: any } {
  for (const obj of jsonLdObjects) {
    if (!obj || typeof obj !== 'object') continue;
    const rawType = obj['@type'];
    const types = Array.isArray(rawType) ? rawType : [rawType];

    for (const t of types) {
      if (typeof t === 'string') {
        const lower = t.toLowerCase();
        if (ARTICLE_SCHEMA_TYPES.has(lower)) {
          return { isArticleSchema: true, schemaType: t, data: obj };
        }
      }
    }
  }

  return { isArticleSchema: false };
}

// Clean author name: remove "by", "written by", prefixes, timestamps, email, limit length
export function cleanAuthorName(raw?: string): string | undefined {
  if (!raw) return undefined;
  let cleaned = raw.trim();

  // Remove prefixes
  cleaned = cleaned.replace(/^(written\s+by|posted\s+by|by|author:?|published\s+by)\s+/i, '');
  // Remove dates or pipe tails
  cleaned = cleaned.split(/[\n\r|•·]/)[0].trim();
  // Remove "on [date]" tail
  cleaned = cleaned.replace(/\s+on\s+[A-Za-z]+ \d{1,2}(,\s*\d{4})?.*/i, '').trim();

  if (!cleaned || cleaned.length < 2 || cleaned.length > 60) return undefined;

  // Filter out generic placeholders
  const genericPlaceholders = new Set([
    'admin', 'administrator', 'editor', 'editorial team', 'staff', 'staff writer',
    'contributor', 'guest', 'guest author', 'team', 'author', 'user', 'root', 'webmaster'
  ]);
  if (genericPlaceholders.has(cleaned.toLowerCase())) {
    return cleaned; // keep but recognizable
  }

  return cleaned;
}

// Validate date string
export function parseAndFormatDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length < 4) return undefined;

  // Handle epoch timestamps (numeric string or digits)
  if (/^\d{10,13}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    const ms = trimmed.length === 10 ? num * 1000 : num;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      const yr = d.getFullYear();
      if (yr >= 1995 && yr <= new Date().getFullYear() + 1) {
        return d.toISOString().split('T')[0];
      }
    }
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return extractDateFromText(trimmed);
  }

  const yr = parsed.getFullYear();
  if (yr < 1995 || yr > new Date().getFullYear() + 1) return undefined;

  return parsed.toISOString().split('T')[0];
}

// Extract date from freeform text string
export function extractDateFromText(text: string): string | undefined {
  if (!text || text.length < 4) return undefined;

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = text.match(/\b(199\d|20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // 2. Month DD, YYYY (e.g., January 15, 2024 or Jan 15, 2024)
  const monthDayYearMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(199\d|20\d{2})\b/i);
  if (monthDayYearMatch) {
    const candidate = new Date(`${monthDayYearMatch[1]} ${monthDayYearMatch[2]}, ${monthDayYearMatch[3]}`);
    if (!isNaN(candidate.getTime())) {
      return candidate.toISOString().split('T')[0];
    }
  }

  // 3. DD Month YYYY (e.g., 15 January 2024 or 15 Jan 2024)
  const dayMonthYearMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(199\d|20\d{2})\b/i);
  if (dayMonthYearMatch) {
    const candidate = new Date(`${dayMonthYearMatch[2]} ${dayMonthYearMatch[1]}, ${dayMonthYearMatch[3]}`);
    if (!isNaN(candidate.getTime())) {
      return candidate.toISOString().split('T')[0];
    }
  }

  // 4. MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = text.match(/\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](199\d|20\d{2})\b/);
  if (slashMatch) {
    const candidate = new Date(`${slashMatch[3]}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`);
    if (!isNaN(candidate.getTime())) {
      return candidate.toISOString().split('T')[0];
    }
  }

  return undefined;
}

/**
 * Strict publication date detection following priority order:
 * 1. <time datetime="">
 * 2. JSON-LD datePublished
 * 3. Open Graph / article meta tags
 * 4. CMS-specific markup classes / attributes (.posted-on, .entry-date, wp-block-post-date, etc.)
 * 5. Visible text dates near the author/byline area
 * 6. Publication-like URL date patterns (/2024/03/, /2023-11-04/) as fallback
 */
export function detectPublicationDate(
  $: cheerio.CheerioAPI,
  jsonLdObjects: any[] = [],
  articleSchema: { isArticleSchema: boolean; data?: any } = { isArticleSchema: false },
  pageUrl?: string
): string | undefined {
  // 1. <time datetime="">
  let dateFromTimeTag: string | undefined;
  const priorityTimeSelectors = [
    'article time[datetime]',
    '.entry-meta time[datetime]',
    '.post-meta time[datetime]',
    '.byline time[datetime]',
    'time.published[datetime]',
    'time.entry-date[datetime]',
    'time.post-date[datetime]',
    'time[datetime]',
  ];
  for (const sel of priorityTimeSelectors) {
    $(sel).each((_, el) => {
      if (dateFromTimeTag) return;
      const dt = $(el).attr('datetime');
      const formatted = parseAndFormatDate(dt);
      if (formatted) {
        dateFromTimeTag = formatted;
      }
    });
    if (dateFromTimeTag) return dateFromTimeTag;
  }

  // 2. JSON-LD datePublished
  if (articleSchema.data?.datePublished) {
    const formatted = parseAndFormatDate(articleSchema.data.datePublished);
    if (formatted) return formatted;
  }
  for (const obj of jsonLdObjects) {
    if (obj && typeof obj === 'object') {
      if (obj.datePublished) {
        const formatted = parseAndFormatDate(obj.datePublished);
        if (formatted) return formatted;
      }
      if (Array.isArray(obj['@graph'])) {
        for (const item of obj['@graph']) {
          if (item?.datePublished) {
            const formatted = parseAndFormatDate(item.datePublished);
            if (formatted) return formatted;
          }
        }
      }
    }
  }

  // 3. Open Graph / article meta tags
  const metaSelectors = [
    'meta[property="article:published_time"]',
    'meta[property="og:published_time"]',
    'meta[property="og:article:published_time"]',
    'meta[name="publication_date"]',
    'meta[name="date"]',
    'meta[name="parsely-pub-date"]',
    'meta[name="sailthru.date"]',
    'meta[name="dc.date"]',
    'meta[name="dc.date.issued"]',
    'meta[name="article.published"]',
    '[itemprop="datePublished"]',
  ];
  for (const sel of metaSelectors) {
    const el = $(sel).first();
    if (el.length > 0) {
      const raw = el.attr('content') || el.attr('datetime');
      const formatted = parseAndFormatDate(raw);
      if (formatted) return formatted;
    }
  }

  // 4. CMS-specific markup classes / attributes
  const cmsSelectors = [
    '.posted-on',
    '.entry-date',
    '.wp-block-post-date',
    '.published',
    '.post-date',
    '.article-date',
    '.date-published',
    '.post__date',
    '[class*="publish-date"]',
    '[class*="entry-date"]',
    '[class*="post-date"]',
  ];
  for (const sel of cmsSelectors) {
    let cmsFound: string | undefined;
    $(sel).each((_, el) => {
      if (cmsFound) return;
      const attrDate = $(el).attr('datetime') || $(el).attr('data-date') || $(el).attr('data-time') || $(el).attr('data-timestamp');
      let parsed = parseAndFormatDate(attrDate);
      if (!parsed) {
        const text = $(el).text().trim();
        parsed = parseAndFormatDate(text);
      }
      if (parsed) {
        cmsFound = parsed;
      }
    });
    if (cmsFound) return cmsFound;
  }

  // 5. Visible text dates near the author/byline area
  const bylineAreas = [
    '.byline',
    '.author-date',
    '.entry-meta',
    '.post-meta',
    '.article-meta',
    '.post-header',
    'header.entry-header',
    '.author-box',
  ];
  for (const sel of bylineAreas) {
    const areaText = $(sel).text();
    if (areaText) {
      const parsed = extractDateFromText(areaText);
      if (parsed) return parsed;
    }
  }

  // Check first paragraphs for explicit date strings
  let paraDate: string | undefined;
  $('p, span').slice(0, 8).each((_, el) => {
    if (paraDate) return;
    const t = $(el).text().trim();
    if (/^(Published|Posted|Date):/i.test(t) || /\b(Published|Posted)\s+(?:on\s+)?([A-Za-z]+|\d{1,2})/i.test(t)) {
      const parsed = extractDateFromText(t);
      if (parsed) {
        paraDate = parsed;
      }
    }
  });
  if (paraDate) return paraDate;

  // 6. Publication-like URL date patterns as fallback
  if (pageUrl) {
    try {
      const path = new URL(pageUrl, 'https://example.com').pathname;
      const fullDateMatch = path.match(/\b(20\d{2})[\/-](0[1-9]|1[0-2])[\/-](0[1-9]|[12]\d|3[01])\b/);
      if (fullDateMatch) {
        const candidate = `${fullDateMatch[1]}-${fullDateMatch[2]}-${fullDateMatch[3]}`;
        if (parseAndFormatDate(candidate)) return candidate;
      }
      const yearMonthMatch = path.match(/\b(20\d{2})[\/-](0[1-9]|1[0-2])(?:\/|$)/);
      if (yearMonthMatch) {
        const candidate = `${yearMonthMatch[1]}-${yearMonthMatch[2]}-01`;
        if (parseAndFormatDate(candidate)) return candidate;
      }
    } catch {
      // ignore URL parse errors
    }
  }

  return undefined;
}

// Extract article body and measure words
export function extractCleanArticleBody($: cheerio.CheerioAPI): {
  contentEl: cheerio.Cheerio<any>;
  text: string;
  wordCount: number;
  paragraphCount: number;
} {
  const candidateSelectors = [
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
  for (const sel of candidateSelectors) {
    const el = $(sel);
    if (el.length > 0 && el.text().trim().length > 200) {
      selected = el.first();
      break;
    }
  }

  if (!selected) {
    selected = $('body');
  }

  // Clone and strip non-article elements
  const clone = selected.clone();
  clone.find([
    'header', 'nav', 'footer', 'aside', '.sidebar', '.widget', '.widget-area',
    '.author-bio', '.author-box', '.about-author', '.post-author',
    '.comments', '#comments', '.comment-list', '.comment-respond',
    '.related-posts', '.jp-relatedposts', '.similar-articles', '.yarpp-related',
    '.share-buttons', '.social-share', '.share-bar', '.social-icons',
    '.advertisement', '.ad', '.adsbygoogle', '.taboola', '.outbrain',
    '.newsletter-signup', '.popup', '.modal', '.cookie-notice',
    '.post-tags', '.tags-links', 'footer.entry-footer'
  ].join(', ')).remove();

  const paragraphs = clone.find('p').filter((_, p) => {
    return $(p).text().trim().length > 25;
  });

  const fullText = clone.text().replace(/\s+/g, ' ').trim();
  const words = fullText ? fullText.split(/\s+/).filter(w => w.length > 1).length : 0;

  return {
    contentEl: clone,
    text: fullText,
    wordCount: words,
    paragraphCount: paragraphs.length,
  };
}

// Detailed heuristics to verify if page is genuinely a standalone article
export function evaluatePageAsArticle(
  html: string,
  url: string,
  $: cheerio.CheerioAPI
): ExtractedArticleMetadata {
  const jsonLd = parseJsonLdScripts(html);
  const articleSchema = findArticleSchema(jsonLd);
  const detectionReasons: string[] = [];
  let confidenceScore = 0;

  const title = $('title').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().trim() || '';

  const metaDescription = $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() || '';

  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim();
  const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';
  const isNoindex = robotsMeta.includes('noindex');

  // 1. Schema.org validation
  if (articleSchema.isArticleSchema) {
    confidenceScore += 45;
    detectionReasons.push(`JSON-LD ${articleSchema.schemaType} schema present (+45)`);
  }

  // 2. OpenGraph article type
  const ogType = $('meta[property="og:type"]').attr('content')?.toLowerCase();
  if (ogType === 'article' || ogType === 'blog') {
    confidenceScore += 25;
    detectionReasons.push(`OpenGraph type="${ogType}" (+25)`);
  }

  // 3. Extract Published Date using strict priority (time tag, JSON-LD, meta, CMS classes, visible text, URL pattern)
  const publishedDate = detectPublicationDate($, jsonLd, articleSchema, url);

  if (publishedDate) {
    confidenceScore += 15;
    detectionReasons.push(`Valid publication timestamp verified (+15)`);
  }

  // Extract Modified / Updated Date
  let updatedDate: string | undefined;
  if (articleSchema.data?.dateModified) {
    updatedDate = parseAndFormatDate(articleSchema.data.dateModified);
  }
  if (!updatedDate) {
    const metaModDate =
      $('meta[property="article:modified_time"]').attr('content') ||
      $('meta[property="og:updated_time"]').attr('content') ||
      $('meta[name="last-modified"]').attr('content') ||
      $('[itemprop="dateModified"]').attr('content') ||
      $('[itemprop="dateModified"]').attr('datetime') ||
      $('time.updated').first().attr('datetime');
    updatedDate = parseAndFormatDate(metaModDate);
  }

  // 4. Extract Author
  let author: string | undefined;
  let authorUrl: string | undefined;
  if (articleSchema.data?.author) {
    const authData = articleSchema.data.author;
    if (typeof authData === 'string') {
      author = cleanAuthorName(authData);
    } else if (Array.isArray(authData) && authData.length > 0) {
      const first = authData[0];
      author = cleanAuthorName(typeof first === 'string' ? first : first.name);
      authorUrl = first.url;
    } else if (typeof authData === 'object' && authData.name) {
      author = cleanAuthorName(authData.name);
      authorUrl = authData.url;
    }
  }

  if (!author) {
    const metaAuthor =
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('meta[name="twitter:creator"]').attr('content') ||
      $('[itemprop="author"]').first().text().trim() ||
      $('[rel="author"]').first().text().trim() ||
      $('.author-name, .byline, .entry-author-name, .post-author').first().text().trim();

    author = cleanAuthorName(metaAuthor);
    authorUrl = $('[rel="author"], a[href*="/author/"]').first().attr('href');
  }

  // Also check top paragraphs or headings for inline "Author: <Name>"
  if (!author) {
    $('p, span, .post-header, .entry-content > p').slice(0, 8).each((_, el) => {
      if (author) return;
      const text = $(el).text().trim();
      const match = text.match(/^(?:Author|Written by|By):\s*([A-Za-z][A-Za-z\s.'-]{1,40})/i);
      if (match && match[1]) {
        let name = match[1].trim();
        name = name.replace(/(Last Updated|Updated|Published|\b20\d{2}\b).*/i, '').trim();
        const cleaned = cleanAuthorName(name);
        if (cleaned && cleaned.length >= 2) {
          author = cleaned;
        }
      }
    });
  }

  const hasByline = !!author;
  if (hasByline) {
    confidenceScore += 10;
    detectionReasons.push(`Author attribution present (+10)`);
  }

  // 5. Body Content & Paragraph structure
  const bodyAnalysis = extractCleanArticleBody($);
  if (bodyAnalysis.wordCount >= 300) {
    confidenceScore += 20;
    detectionReasons.push(`Substantive article content (${bodyAnalysis.wordCount} words, ${bodyAnalysis.paragraphCount} paragraphs) (+20)`);
  } else if (bodyAnalysis.wordCount >= 150) {
    confidenceScore += 10;
    detectionReasons.push(`Moderate article content length (${bodyAnalysis.wordCount} words) (+10)`);
  } else {
    confidenceScore -= 25;
    detectionReasons.push(`Insufficient content body text (<150 words) (-25)`);
  }

  // 6. Heading check
  const h1Count = $('h1').length;
  if (h1Count === 1) {
    confidenceScore += 5;
  } else if (h1Count > 3) {
    confidenceScore -= 15;
    detectionReasons.push(`Multiple h1 tags (${h1Count}) indicates possible aggregate page (-15)`);
  }

  // 7. URL Pattern heuristics
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    if (/\/\d{4}\/\d{2}\//.test(path) || path.includes('/blog/') || path.includes('/news/') || path.includes('/post/') || path.includes('/article/')) {
      confidenceScore += 15;
      detectionReasons.push(`URL path structure matches editorial convention (+15)`);
    } else if (path.includes('-') && path.length > 20 && !path.endsWith('/')) {
      confidenceScore += 10;
      detectionReasons.push(`Long hyphenated slug (+10)`);
    }

    // Negative URL signals
    if (/(category|tag|author|page|search|topics|archives)\//.test(path)) {
      confidenceScore -= 45;
      detectionReasons.push(`URL contains taxonomy listing segment (-45)`);
    }
  } catch {
    // ignore
  }

  // 8. Negative layout signals: multiple post teaser cards or archive indicators
  const postCardsCount = $('.post-card, .article-card, .entry-preview, .blog-entry, .post-item, .excerpt').length;
  if (postCardsCount >= 4) {
    confidenceScore -= 35;
    detectionReasons.push(`Detected ${postCardsCount} teaser cards; appears to be an index or archive page (-35)`);
  }

  const paginationCount = $('.pagination, .nav-links, .page-numbers, .pagination-next').length;
  if (paginationCount > 0 && bodyAnalysis.wordCount < 400) {
    confidenceScore -= 25;
    detectionReasons.push(`Detected pagination controls with low body word count (-25)`);
  }

  const bodyClasses = ($('body').attr('class') || '').toLowerCase();
  if (bodyClasses.includes('archive') || bodyClasses.includes('category') || bodyClasses.includes('blog-home') || bodyClasses.includes('search-results')) {
    confidenceScore -= 40;
    detectionReasons.push(`Body tag contains archive/category class (-40)`);
  }

  // Final score normalization
  const finalScore = Math.max(0, Math.min(100, confidenceScore));
  const isArticle = finalScore >= 50;

  return {
    isArticle,
    confidenceScore: finalScore,
    schemaType: articleSchema.schemaType,
    title,
    metaDescription,
    canonicalUrl,
    isNoindex,
    publishedDate,
    updatedDate,
    author,
    authorUrl,
    wordCount: bodyAnalysis.wordCount,
    paragraphCount: bodyAnalysis.paragraphCount,
    hasByline,
    detectionReasons,
  };
}
