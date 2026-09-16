import React from 'react';
import { UserCheck, AlertTriangle } from 'lucide-react';
import { ContentAuthorSignalsResult } from '../types.js';

interface AuthorContentCardProps {
  data: ContentAuthorSignalsResult;
}

export function AuthorContentCard({ data }: AuthorContentCardProps) {
  const getStatusBadge = () => {
    if (data.signalState === 'SIGNAL') {
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Generic Attribution',
      };
    }
    switch (data.status) {
      case 'transparent':
        return {
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Attribution Detected',
        };
      case 'mixed':
        return {
          badge: 'bg-stone-100 text-stone-800 border-stone-300',
          dot: 'bg-stone-500',
          label: 'Attribution Observed',
        };
      case 'opaque':
        return {
          badge: 'bg-stone-100 text-stone-700 border-stone-300',
          dot: 'bg-stone-500',
          label: 'Markup Not Detected',
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

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 sm:p-6" id="author-signals-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
              Bylines & Accountability
            </span>
            <h3 className="text-base font-bold text-stone-900">Author Attribution</h3>
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

        {data.genericAuthorDetected && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Generic author accounts (such as "admin", "editor", or "team") were detected across multiple sampled articles.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
