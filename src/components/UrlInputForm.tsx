import React, { useState, useEffect } from 'react';
import { Search, Globe, ArrowRight, Loader2, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface UrlInputFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  initialUrl?: string;
}

const CRAWL_STEPS = [
  'Validating target URL and checking SSRF security boundaries...',
  'Connecting to host and verifying HTTP/HTTPS reachability...',
  'Inspecting relevant public site structure, sitemaps, and discoverable feeds...',
  'Scanning homepage navigation and locating recent article candidates...',
  'Crawling sampled content pages and public utility documents...',
  'Analyzing outbound links, commercial anchors, author bylines & topics...',
  'Synthesizing evidence-first due diligence report...',
];

export function UrlInputForm({ onSubmit, isLoading, initialUrl = '' }: UrlInputFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [clientError, setClientError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [initialUrl]);

  // Cycle through realistic crawl step notifications during scan
  useEffect(() => {
    if (!isLoading) {
      setStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setStepIndex(prev => (prev < CRAWL_STEPS.length - 1 ? prev + 1 : prev));
    }, 1400);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setClientError('Please enter a website URL');
      return;
    }

    // Basic client validation
    try {
      const test = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
      const parsed = new URL(test);
      if (!parsed.hostname.includes('.')) {
        setClientError('Please enter a valid domain (e.g. example.com)');
        return;
      }
    } catch {
      setClientError('Please enter a valid website URL format');
      return;
    }

    onSubmit(trimmed);
  };

  const handleQuickSelect = (sampleUrl: string) => {
    setUrl(sampleUrl);
    setClientError(null);
    onSubmit(sampleUrl);
  };

  return (
    <div className="w-full max-w-3xl mx-auto text-center pt-8 pb-10 px-4">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-4">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Zero Paid SEO APIs Required • Evidence-First Due Diligence
      </div>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
        Check a website before you buy a guest post or link placement.
      </h1>

      <p className="mt-4 text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
        Paste a website URL. We inspect publicly available pages and show you the signals we can actually verify — with raw evidence and zero fabricated metrics.
      </p>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="mt-8 relative max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5 p-2 bg-white rounded-2xl border border-stone-300 shadow-lg shadow-stone-200/50 focus-within:border-stone-800 focus-within:ring-2 focus-within:ring-stone-800/10 transition-all">
          <div className="relative flex-1 flex items-center min-h-[48px] pl-3 pr-2">
            <Globe className="w-5 h-5 text-stone-400 shrink-0 mr-2.5" />
            <input
              type="text"
              id="website-url-input"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={isLoading}
              placeholder="https://example.com"
              className="w-full bg-transparent border-0 text-stone-900 placeholder:text-stone-400 text-base focus:outline-hidden font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            id="check-website-submit-btn"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white font-semibold text-sm transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-stone-300" />
                <span>Crawling...</span>
              </>
            ) : (
              <>
                <span>Check Website</span>
                <ArrowRight className="w-4 h-4 text-stone-300" />
              </>
            )}
          </button>
        </div>

        {clientError && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-rose-600 text-xs font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>{clientError}</span>
          </div>
        )}
      </form>

      {/* Progress State */}
      {isLoading && (
        <div className="mt-6 max-w-md mx-auto p-4 rounded-xl bg-stone-50 border border-stone-200 text-left animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-stone-700" />
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
              Live Inspection in Progress
            </span>
          </div>
          <p className="text-xs text-stone-600 font-mono transition-all">
            {CRAWL_STEPS[stepIndex]}
          </p>
          <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-stone-800 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.round(((stepIndex + 1) / CRAWL_STEPS.length) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Try Samples */}
      {!isLoading && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-stone-500">
          <span className="font-medium text-stone-600">Try an example:</span>
          <button
            type="button"
            onClick={() => handleQuickSelect('https://thedailyfront.com')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition-colors font-mono text-[11px]"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            thedailyfront.com (Demo)
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('https://techcrunch.com')}
            className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition-colors font-mono text-[11px]"
          >
            techcrunch.com
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('https://smashingmagazine.com')}
            className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition-colors font-mono text-[11px]"
          >
            smashingmagazine.com
          </button>
        </div>
      )}

      <p className="mt-6 text-xs text-stone-500 max-w-xl mx-auto">
        We do not crawl unlimited pages. For this MVP, we inspect up to 15–20 recent articles, relevant public site structure, sitemaps where available, and primary editorial/utility pages.
      </p>
    </div>
  );
}
