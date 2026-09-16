import React from 'react';
import { HelpCircle, Ban, Database, TrendingUp, Key, Search, Award } from 'lucide-react';

export function NotCheckedCard() {
  const uncheckables = [
    {
      title: 'Domain Rating / Domain Authority (DR/DA)',
      reason: 'Proprietary formulas from third-party SEO vendors (Ahrefs/Moz). We never fabricate or estimate external metrics.',
      icon: Award,
    },
    {
      title: 'Estimated Organic Traffic & Trends',
      reason: 'Traffic estimations require third-party clickstream panels or private Google Analytics access.',
      icon: TrendingUp,
    },
    {
      title: 'Organic Keyword Rankings in Google',
      reason: 'SERP tracking requires scraping Google search result pages across thousands of localized keywords.',
      icon: Key,
    },
    {
      title: 'Referring Domains & Full Backlink Profile',
      reason: 'Mapping incoming links requires maintaining a multi-billion-page web crawling index.',
      icon: Database,
    },
    {
      title: 'Google Index Status & PageRank Passing',
      reason: 'Only Google Search Console can confirm exact indexed URLs or algorithmic link weight calculations.',
      icon: Search,
    },
  ];

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-300/80 p-5 sm:p-6" id="not-checked-section">
      <div className="flex items-center gap-2.5 pb-4 border-b border-stone-200">
        <div className="p-2 rounded-lg bg-stone-200 text-stone-700">
          <Ban className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
            Scope Boundaries
          </span>
          <h3 className="text-base font-bold text-stone-900">What We Could Not Check</h3>
        </div>
      </div>

      <p className="text-xs text-stone-600 mt-3 leading-relaxed">
        PublisherCheck operates strictly from first-party public content and direct technical responses. We believe in transparency and refuse to pretend to know metrics that cannot be verified without paid closed-source vendor databases:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {uncheckables.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="p-3 rounded-lg bg-white border border-stone-200 flex items-start gap-2.5">
              <Icon className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-xs text-stone-900 block">{item.title}</span>
                <span className="text-[11px] text-stone-600 mt-0.5 block leading-normal">{item.reason}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
