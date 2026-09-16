import React from 'react';
import { Users, ExternalLink, HelpCircle, CheckCircle2 } from 'lucide-react';
import { GuestPostSignalsResult } from '../types.js';

interface GuestPostCardProps {
  data: GuestPostSignalsResult;
}

export function GuestPostCard({ data }: GuestPostCardProps) {
  const isFound = data.status === 'found';

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 sm:p-6" id="guest-post-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
              Editorial Openness
            </span>
            <h3 className="text-base font-bold text-stone-900">Guest Post Guidelines</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data.status === 'not_checked' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
              <span className="w-2 h-2 rounded-full bg-stone-400" />
              Not Checked
            </span>
          ) : isFound && data.hasCommercialTerms ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Commercial Terms Detected
            </span>
          ) : isFound ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-300">
              <span className="w-2 h-2 rounded-full bg-stone-500" />
              Guidelines Observed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Not Detected
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-stone-900">
          {data.headline}
        </p>
        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
          {data.explanation}
        </p>

        {isFound && data.contributionPagesFound.length > 0 && (
          <div className="mt-3 space-y-2">
            <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider block">
              Identified Contribution Documents:
            </span>
            {data.contributionPagesFound.map((page, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  page.commercialTermsDetected && page.commercialTermsDetected.length > 0
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div>
                  <span className="font-semibold text-stone-900 block">{page.title}</span>
                  <span className="text-[11px] text-stone-600">
                    Matched phrase: <em>"{page.matchedPhrase}"</em>
                  </span>
                  {page.commercialTermsDetected && page.commercialTermsDetected.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="text-[10px] font-bold text-amber-900">Explicit terms:</span>
                      {page.commercialTermsDetected.map((term, tIdx) => (
                        <span key={tIdx} className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-mono text-[10px]">
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-stone-700 hover:text-stone-900 underline shrink-0"
                >
                  <span>Open Page</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}

        {!isFound && (
          <div className="mt-3 p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <span>
              Contribution or Write for Us page not detected in public navigation. Many publishers manage pitches privately via email or direct staff channels.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
