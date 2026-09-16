import React from 'react';
import { ShieldCheck, Check, X, ExternalLink } from 'lucide-react';
import { EditorialTransparencyResult } from '../types.js';

interface EditorialCardProps {
  data: EditorialTransparencyResult;
}

export function EditorialCard({ data }: EditorialCardProps) {
  const getStatusBadge = () => {
    if (data.signalState === 'SIGNAL') {
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Limited Transparency',
      };
    }
    switch (data.status) {
      case 'good':
        return {
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Signals Verified',
        };
      case 'partial':
        return {
          badge: 'bg-stone-100 text-stone-800 border-stone-300',
          dot: 'bg-stone-500',
          label: 'Signals Verified',
        };
      case 'minimal':
        return {
          badge: 'bg-stone-100 text-stone-700 border-stone-300',
          dot: 'bg-stone-500',
          label: 'Minimal Observed',
        };
      case 'not_checked':
      default:
        return {
          badge: 'bg-stone-100 text-stone-700 border-stone-200',
          dot: 'bg-stone-400',
          label: 'Not Checked',
        };
    }
  };

  const status = getStatusBadge();

  const checklist = [
    { label: 'About Page', type: 'Identity', found: data.aboutPage.found, url: data.aboutPage.url },
    { label: 'Contact Page', type: 'Identity', found: data.contactPage.found, url: data.contactPage.url },
  ];

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 sm:p-6" id="editorial-transparency-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
              Identity Verification
            </span>
            <h3 className="text-base font-bold text-stone-900">Publisher Transparency</h3>
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

        {/* Verification Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          {checklist.map((item, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                item.found
                  ? 'bg-stone-50/80 border-stone-200 text-stone-800'
                  : 'bg-stone-50/40 border-stone-200/60 text-stone-500'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {item.found ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center shrink-0">
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </div>
                )}
                <span className="font-medium truncate">{item.label}</span>
                <span className="text-[10px] text-stone-400 font-mono">({item.type})</span>
              </div>

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-stone-700 shrink-0 ml-2"
                  title="Open Link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
