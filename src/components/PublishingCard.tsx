import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, ExternalLink, HelpCircle } from 'lucide-react';
import { PublishingCheckResult } from '../types.js';

interface PublishingCardProps {
  data: PublishingCheckResult;
}

function formatPublicationDate(dateStr: string | null): string {
  if (!dateStr) return 'Not detected';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function PublishingCard({ data }: PublishingCardProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  const getStatusBadge = () => {
    if (data.status === 'not_checked' || data.totalArticlesSampled === 0) {
      return {
        dot: 'bg-stone-400',
        badge: 'bg-stone-100 text-stone-700 border-stone-200',
        label: 'Not Checked',
      };
    }
    if (data.sampledArticlesWithDates === 0 || !data.latestPostDate) {
      return {
        dot: 'bg-stone-400',
        badge: 'bg-stone-100 text-stone-700 border-stone-200',
        label: 'Dates Not Detected',
      };
    }
    return {
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      label: 'Dates Detected',
    };
  };

  const status = getStatusBadge();
  const sampleCount = data.totalArticlesSampled || 10;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 sm:p-6 transition-all" id="publishing-activity-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
              Sampled Article Dates
            </span>
            <h3 className="text-base font-bold text-stone-900">Publishing Activity</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.badge}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
      </div>

      <div className="mt-4">
        {/* Sample Scope Statement */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-800">
          Based on the latest {sampleCount} sampled articles
        </div>

        {/* Sample Transparency Statement */}
        <p className="text-xs text-stone-700 mt-2.5 leading-relaxed">
          {data.totalArticlesSampled > 0 ? (
            data.sampledArticlesWithDates > 0 ? (
              `PublisherCheck analyzed the latest ${data.totalArticlesSampled} accessible article pages from this website. Publication dates were identified for ${data.sampledArticlesWithDates} of ${data.totalArticlesSampled} sampled articles.`
            ) : (
              `PublisherCheck analyzed the latest ${data.totalArticlesSampled} accessible article pages from this website. No explicit publication dates were identified across ${data.totalArticlesSampled} sampled articles.`
            )
          ) : (
            'No accessible sample pages could be fetched or inspected to evaluate publication timestamps.'
          )}
        </p>

        {/* Separate Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {/* Metric 1: Latest Sampled Publication */}
          <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200/80 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                Latest Sampled Publication
              </span>
              <span className="text-sm font-bold text-stone-900 mt-1 block font-mono">
                {formatPublicationDate(data.latestPostDate)}
              </span>
            </div>
            <span className="text-[11px] text-stone-500 mt-2 block">
              {data.sampledArticlesWithDates > 0
                ? `Identified among ${data.sampledArticlesWithDates} of ${data.totalArticlesSampled} sampled articles with dates`
                : `No publication dates detected in sample`}
            </span>
          </div>

          {/* Metric 2: Total Articles on Site */}
          <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200/80 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                Total Articles on Site
              </span>
              <span className="text-sm font-bold text-stone-900 mt-1 block">
                {data.totalArticlesOnSite != null && data.totalArticlesOnSite > 0
                  ? `${data.totalArticlesOnSite.toLocaleString()} articles`
                  : 'Not reliably determined'}
              </span>
            </div>
            <span className="text-[11px] text-stone-500 mt-2 block">
              {data.totalArticlesOnSite != null && data.totalArticlesOnSite > 0
                ? (data.totalArticlesOnSiteSource ? `Verified via ${data.totalArticlesOnSiteSource}` : 'Verified from complete public source')
                : 'Not estimated from sample; verifiable source required'}
            </span>
          </div>
        </div>

        {/* When no dates detected in sampled pages */}
        {data.totalArticlesSampled > 0 && data.sampledArticlesWithDates === 0 && (
          <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <span>
              Publication dates were not detected in HTML time tags, metadata, or JSON-LD across the {data.totalArticlesSampled} inspected pages. CMS templates often omit date timestamps from article presentation.
            </span>
          </div>
        )}

        {/* When no sample pages could be fetched */}
        {data.totalArticlesSampled === 0 && (
          <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <span>
              No accessible sample pages could be fetched or inspected to evaluate publication timestamps.
            </span>
          </div>
        )}

        {/* Expandable Observable Evidence */}
        {data.evidence.length > 0 && (
          <div className="mt-4 pt-3 border-t border-stone-100">
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className="flex items-center justify-between w-full text-xs font-semibold text-stone-700 hover:text-stone-900 cursor-pointer"
            >
              <span>View Observable Evidence ({data.evidence.length} items)</span>
              {showEvidence ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showEvidence && (
              <div className="mt-2.5 space-y-2 text-xs">
                {data.evidence.map(item => (
                  <div key={item.id} className="p-2 rounded bg-stone-50 border border-stone-200 flex flex-col gap-0.5">
                    <span className="font-semibold text-stone-900 truncate">{item.title}</span>
                    {item.detail && <span className="text-stone-600 text-[11px]">{item.detail}</span>}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-stone-500 hover:text-stone-800 underline truncate flex items-center gap-1 mt-0.5 font-mono"
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        <span>{item.url}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
