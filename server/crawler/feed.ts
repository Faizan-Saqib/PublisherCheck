import { XMLParser } from 'fast-xml-parser';
import { safeFetch } from './fetcher.js';

export interface FeedEntry {
  url: string;
  title?: string;
  pubDate?: string;
}

export interface FeedDiscoveryResult {
  found: boolean;
  feedUrl?: string;
  type?: 'rss' | 'atom';
  entries: FeedEntry[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  trimValues: true,
});

export async function parseFeedXml(xmlText: string, targetOrigin: string): Promise<FeedDiscoveryResult> {
  try {
    const parsed = parser.parse(xmlText);
    const entries: FeedEntry[] = [];

    // RSS 2.0 / 0.9 / 1.0
    if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
      const items = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];

      for (const item of items) {
        let link = typeof item.link === 'string' ? item.link.trim() : (item['@_href'] || '');
        if (typeof item.link === 'object' && item.link['#text']) {
          link = item.link['#text'].trim();
        }
        if (link) {
          try {
            const parsedLink = new URL(link, targetOrigin);
            entries.push({
              url: parsedLink.href,
              title: typeof item.title === 'string' ? item.title.trim() : undefined,
              pubDate: typeof item.pubDate === 'string' ? item.pubDate.trim() : undefined,
            });
          } catch {
            // invalid link ignored
          }
        }
      }
      return { found: entries.length > 0, type: 'rss', entries };
    }

    // Atom feed
    if (parsed.feed && parsed.feed.entry) {
      const items = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry
        : [parsed.feed.entry];

      for (const entry of items) {
        let link = '';
        if (typeof entry.link === 'string') {
          link = entry.link.trim();
        } else if (entry.link && entry.link['@_href']) {
          link = entry.link['@_href'].trim();
        } else if (Array.isArray(entry.link)) {
          const alternate = entry.link.find((l: any) => l['@_rel'] === 'alternate' || !l['@_rel']);
          if (alternate && alternate['@_href']) {
            link = alternate['@_href'].trim();
          }
        }

        const date = entry.published || entry.updated || entry.issued;
        if (link) {
          try {
            const parsedLink = new URL(link, targetOrigin);
            entries.push({
              url: parsedLink.href,
              title: typeof entry.title === 'string' ? entry.title.trim() : (entry.title?.['#text'] || undefined),
              pubDate: typeof date === 'string' ? date.trim() : undefined,
            });
          } catch {
            // ignore
          }
        }
      }
      return { found: entries.length > 0, type: 'atom', entries };
    }

    return { found: false, entries: [] };
  } catch {
    return { found: false, entries: [] };
  }
}

export async function discoverFeeds(
  baseUrl: URL,
  htmlHeadFeedLinks: string[] = []
): Promise<FeedDiscoveryResult> {
  const candidateUrls = [...htmlHeadFeedLinks];
  const standardFeedPaths = ['/feed', '/feed/', '/rss', '/rss.xml', '/atom.xml', '/index.xml', '/blog/feed'];

  for (const path of standardFeedPaths) {
    const full = new URL(path, baseUrl.origin).href;
    if (!candidateUrls.includes(full)) {
      candidateUrls.push(full);
    }
  }

  for (const feedUrl of candidateUrls) {
    const fetchRes = await safeFetch(feedUrl, { timeoutMs: 5000, acceptType: 'application/rss+xml,application/atom+xml,application/xml,text/xml' });
    if (fetchRes.ok && fetchRes.statusCode === 200 && fetchRes.text.includes('<')) {
      const parsedFeed = await parseFeedXml(fetchRes.text, baseUrl.origin);
      if (parsedFeed.found && parsedFeed.entries.length > 0) {
        return {
          found: true,
          feedUrl,
          type: parsedFeed.type,
          entries: parsedFeed.entries,
        };
      }
    }
  }

  return { found: false, entries: [] };
}
