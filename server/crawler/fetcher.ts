import { validateIpSafety } from '../security/ssrf.js';

export interface FetchResult {
  ok: boolean;
  statusCode: number;
  statusText: string;
  finalUrl: string;
  headers: Record<string, string>;
  text: string;
  durationMs: number;
  redirects: string[];
  error?: string;
}

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; PublisherCheck/1.0; +https://publishercheck.dev/bot; Due-Diligence Bot)';
const MAX_BODY_BYTES = 2.5 * 1024 * 1024; // 2.5MB max per response
const DEFAULT_TIMEOUT_MS = 9000; // 9 seconds

export async function safeFetch(
  targetUrl: string,
  options: {
    timeoutMs?: number;
    maxRedirects?: number;
    acceptType?: string;
  } = {}
): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? 5;
  const redirects: string[] = [];

  const startTime = Date.now();
  let currentUrl = targetUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrl);
    } catch {
      return {
        ok: false,
        statusCode: 0,
        statusText: 'Invalid URL',
        finalUrl: currentUrl,
        headers: {},
        text: '',
        durationMs: Date.now() - startTime,
        redirects,
        error: `Malformed redirect URL: ${currentUrl}`,
      };
    }

    // SSRF IP check on each hop
    const ipCheck = await validateIpSafety(parsedUrl.hostname);
    if (!ipCheck.safe) {
      return {
        ok: false,
        statusCode: 0,
        statusText: 'Blocked IP',
        finalUrl: currentUrl,
        headers: {},
        text: '',
        durationMs: Date.now() - startTime,
        redirects,
        error: ipCheck.error,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          'Accept': options.acceptType || 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        redirect: 'manual', // handle manually to record redirects & check SSRF at every hop
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle Redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return {
            ok: false,
            statusCode: response.status,
            statusText: response.statusText,
            finalUrl: currentUrl,
            headers: Object.fromEntries(response.headers.entries()),
            text: '',
            durationMs: Date.now() - startTime,
            redirects,
            error: `Received ${response.status} redirect without Location header`,
          };
        }

        const resolvedLocation = new URL(location, currentUrl).href;
        redirects.push(resolvedLocation);
        currentUrl = resolvedLocation;
        continue;
      }

      // Check content-type
      const contentType = response.headers.get('content-type') || '';
      const isHtmlOrTextOrXml =
        contentType.includes('text/') ||
        contentType.includes('xml') ||
        contentType.includes('json') ||
        contentType.includes('rss') ||
        contentType.includes('atom');

      if (!isHtmlOrTextOrXml && response.status === 200) {
        return {
          ok: false,
          statusCode: response.status,
          statusText: response.statusText,
          finalUrl: currentUrl,
          headers: Object.fromEntries(response.headers.entries()),
          text: '',
          durationMs: Date.now() - startTime,
          redirects,
          error: `Non-HTML/XML Content-Type received: ${contentType || 'unknown'}`,
        };
      }

      // Read limited body stream
      const reader = response.body?.getReader();
      let chunks: Uint8Array[] = [];
      let totalBytes = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.length;
            if (totalBytes > MAX_BODY_BYTES) {
              await reader.cancel();
              break; // keep partial body within limit
            }
            chunks.push(value);
          }
        }
      }

      const fullBuffer = Buffer.concat(chunks);
      const text = fullBuffer.toString('utf-8');

      return {
        ok: response.status >= 200 && response.status < 400,
        statusCode: response.status,
        statusText: response.statusText,
        finalUrl: currentUrl,
        headers: Object.fromEntries(response.headers.entries()),
        text,
        durationMs: Date.now() - startTime,
        redirects,
      };
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const isAbort = fetchErr?.name === 'AbortError';
      return {
        ok: false,
        statusCode: 0,
        statusText: isAbort ? 'Request Timeout' : 'Network Error',
        finalUrl: currentUrl,
        headers: {},
        text: '',
        durationMs: Date.now() - startTime,
        redirects,
        error: isAbort ? `Request timed out after ${timeoutMs}ms` : (fetchErr?.message || 'Network request failed'),
      };
    }
  }

  return {
    ok: false,
    statusCode: 0,
    statusText: 'Too Many Redirects',
    finalUrl: currentUrl,
    headers: {},
    text: '',
    durationMs: Date.now() - startTime,
    redirects,
    error: `Exceeded maximum redirect limit (${maxRedirects})`,
  };
}
