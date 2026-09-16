import React from 'react';
import { Eye, BookOpen, ExternalLink, Target } from 'lucide-react';

export function ManualChecksCard() {
  const steps = [
    {
      num: '1',
      title: 'Read 2–3 recent articles thoroughly',
      body: 'Evaluate the writing for usefulness, originality, and audience value. Review whether articles provide substantive editorial coverage and natural reference link context.',
      icon: BookOpen,
    },
    {
      num: '2',
      title: 'Inspect destination links in surrounding posts',
      body: 'Look at where other recent articles point: are they relevant editorial reference citations, or commercial niches, affiliate offers, and sponsored placements?',
      icon: ExternalLink,
    },
    {
      num: '3',
      title: 'Check where the readership actually lives',
      body: 'Look at reader comments, social media engagement, and topic framing. Does the site reach the specific industry or geographic audience you care about?',
      icon: Target,
    },
  ];

  return (
    <div className="bg-stone-900 text-white rounded-xl p-5 sm:p-6 shadow-sm" id="manual-checks-section">
      <div className="flex items-center gap-2.5 pb-4 border-b border-stone-800">
        <div className="p-2 rounded-lg bg-stone-800 text-amber-400">
          <Eye className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
            Human Due Diligence
          </span>
          <h3 className="text-base font-bold text-white">Three Things Only You Can Check</h3>
        </div>
      </div>

      <p className="text-xs text-stone-300 mt-3 leading-relaxed">
        Automated crawlers provide structural signals, but sound placement decisions require 3 minutes of human editorial review:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
        {steps.map(step => {
          const Icon = step.icon;
          return (
            <div key={step.num} className="p-3.5 rounded-lg bg-stone-800/80 border border-stone-700/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-stone-700 text-amber-400 font-bold text-xs flex items-center justify-center">
                    {step.num}
                  </span>
                  <Icon className="w-4 h-4 text-stone-400" />
                </div>
                <h4 className="text-xs font-bold text-white mb-1.5">{step.title}</h4>
                <p className="text-[11px] text-stone-300 leading-relaxed">{step.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
