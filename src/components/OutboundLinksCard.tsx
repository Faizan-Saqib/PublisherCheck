import React, { useState } from 'react';
import { Link2, ChevronDown, ChevronUp, ExternalLink, Globe } from 'lucide-react';
import { OutboundLinksResult } from '../types.js';

interface OutboundLinksCardProps {
  data: OutboundLinksResult;
}

export function OutboundLinksCard({ data }: OutboundLinksCardProps) {
  const [showPages, setShowPages] = useState(false);

  const getStatusBadge = () => {
    if (data.status === 'not_checked') {
      return {
        badge: 'bg-stone-100 text-stone-700 border-stone-200',
        dot: 'bg-stone-400',
        label: 'Not Checked',
      };
    }
    if (data.signalState === 'SIGNAL') {
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Elevated Density',
      };
    }
    return {
      badge: 'bg-stone-100 text-stone-800 border-stone-300',
      dot: 'bg-stone-500',
      label: 'Observable Profile',
    };
  };

  const status = getStatusBadge();
  const totalAuditedRel = data.followedLinksCount + data.nofollowLinksCount + data.sponsoredLinksCount + data.ugcLinksCount + (data.unknownRelLinksCount || 0);

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 sm:p-6" id="outbound-links-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
              Link Profiling
            </span>
            <h3 className="text-base font-bold text-stone-900">Outbound Link Profile</h3>
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
        <p className="text-sm font-semibold text-stone-900">
          {data.headline}
        </p>
        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
          {data.explanation}
        </p>

        {/* Average Outbound Links Metric Box */}
        <div className="mt-4 p-3.5 bg-stone-50 rounded-lg border border-stone-200/70 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-600 uppercase font-bold tracking-wider block">Average Outbound Links</span>
            <span className="text-xs text-stone-500 mt-0.5 block">
              {data.totalArticlePagesSampled && data.totalArticlePagesSampled > 0
                ? `Calculated across ${data.totalArticlePagesSampled} sampled content pages`
                : 'Calculated across sampled pages'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-mono font-extrabold text-stone-900">
              {data.avgExternalPerArticle}
            </span>
            <span className="text-[10px] text-stone-500 block">links per article</span>
          </div>
        </div>

        {/* Audited Rel Attribute Verification Breakdown */}
        <div className="mt-4 p-3.5 bg-stone-50/70 rounded-xl border border-stone-200" id="rel-attribute-audit-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block">
                Audited Link Rel Attributes
              </span>
              <span className="text-[10px] text-stone-500">
                Individual per-link audit without unverified inferences
              </span>
            </div>
            {totalAuditedRel > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto font-medium">
                Audited: {totalAuditedRel} links
              </span>
            )}
          </div>

          <div className={`grid grid-cols-2 ${(data.unknownRelLinksCount || 0) > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-2 text-center`}>
            {/* FOLLOW */}
            <div className="p-2.5 rounded-lg bg-white border border-stone-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 block">FOLLOW</span>
              <span className="text-base font-mono font-extrabold text-stone-900 block mt-0.5">
                {data.followedLinksCount}
              </span>
              <span className="text-[10px] text-stone-500 block">
                {totalAuditedRel > 0 ? `${Math.round((data.followedLinksCount / totalAuditedRel) * 100)}%` : '0%'}
              </span>
              <span className="text-[9px] text-stone-400 block mt-0.5">Standard crawlable</span>
            </div>

            {/* NOFOLLOW */}
            <div className="p-2.5 rounded-lg bg-white border border-stone-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 block">NOFOLLOW</span>
              <span className="text-base font-mono font-extrabold text-stone-900 block mt-0.5">
                {data.nofollowLinksCount}
              </span>
              <span className="text-[10px] text-stone-500 block">
                {totalAuditedRel > 0 ? `${Math.round((data.nofollowLinksCount / totalAuditedRel) * 100)}%` : '0%'}
              </span>
              <span className="text-[9px] text-stone-400 block mt-0.5">rel="nofollow"</span>
            </div>

            {/* SPONSORED */}
            <div className={`p-2.5 rounded-lg border ${
              data.sponsoredLinksCount > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-stone-200'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                data.sponsoredLinksCount > 0 ? 'text-amber-800' : 'text-stone-700'
              }`}>SPONSORED</span>
              <span className={`text-base font-mono font-extrabold block mt-0.5 ${
                data.sponsoredLinksCount > 0 ? 'text-amber-950' : 'text-stone-900'
              }`}>
                {data.sponsoredLinksCount}
              </span>
              <span className="text-[10px] text-stone-500 block">
                {totalAuditedRel > 0 ? `${Math.round((data.sponsoredLinksCount / totalAuditedRel) * 100)}%` : '0%'}
              </span>
              <span className="text-[9px] text-stone-400 block mt-0.5">rel="sponsored"</span>
            </div>

            {/* UGC */}
            <div className={`p-2.5 rounded-lg border ${
              data.ugcLinksCount > 0 ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-stone-200'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                data.ugcLinksCount > 0 ? 'text-blue-800' : 'text-stone-700'
              }`}>UGC</span>
              <span className={`text-base font-mono font-extrabold block mt-0.5 ${
                data.ugcLinksCount > 0 ? 'text-blue-950' : 'text-stone-900'
              }`}>
                {data.ugcLinksCount}
              </span>
              <span className="text-[10px] text-stone-500 block">
                {totalAuditedRel > 0 ? `${Math.round((data.ugcLinksCount / totalAuditedRel) * 100)}%` : '0%'}
              </span>
              <span className="text-[9px] text-stone-400 block mt-0.5">rel="ugc"</span>
            </div>

            {/* UNKNOWN: Only displayed if count > 0 */}
            {(data.unknownRelLinksCount || 0) > 0 && (
              <div className="p-2.5 rounded-lg border col-span-2 sm:col-span-1 bg-rose-50/60 border-rose-200">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-800">UNKNOWN</span>
                <span className="text-base font-mono font-extrabold block mt-0.5 text-rose-950">
                  {data.unknownRelLinksCount}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  {totalAuditedRel > 0 ? `${Math.round(((data.unknownRelLinksCount || 0) / totalAuditedRel) * 100)}%` : '0%'}
                </span>
                <span className="text-[9px] text-stone-400 block mt-0.5">Non-standard/custom</span>
              </div>
            )}
          </div>
        </div>

        {/* Expandable Section: Pages with highest outbound links */}
        {data.pagesWithHighestExternalLinks.length > 0 && (
          <div className="mt-4 pt-3 border-t border-stone-100">
            <button
              onClick={() => setShowPages(!showPages)}
              className="flex items-center justify-between w-full text-xs font-semibold text-stone-700 hover:text-stone-900 cursor-pointer"
            >
              <span>Pages Containing Highest Outbound Links ({data.pagesWithHighestExternalLinks.length})</span>
              {showPages ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showPages && (
              <div className="mt-2.5 space-y-2 text-xs">
                {data.pagesWithHighestExternalLinks.map((p, idx) => (
                  <div key={idx} className="p-2 rounded bg-stone-50 border border-stone-200 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-stone-900 truncate">{p.title}</span>
                      <span className="shrink-0 px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-mono text-[10px] font-bold">
                        {p.externalLinksCount} ext links
                      </span>
                    </div>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-stone-500 hover:text-stone-800 underline truncate flex items-center gap-1 font-mono"
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      <span>{p.url}</span>
                    </a>
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
