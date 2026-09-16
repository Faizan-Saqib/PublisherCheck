import React from 'react';
import { Server, Check, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { TechnicalChecksResult } from '../types.js';

interface TechnicalCardProps {
  data: TechnicalChecksResult;
}

export function TechnicalCard({ data }: TechnicalCardProps) {
  const getStatusBadge = () => {
    switch (data.status) {
      case 'good':
        return {
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Healthy Setup',
        };
      case 'caution':
        return {
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Minor Omissions',
        };
      case 'warning':
        return {
          badge: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Technical Issues',
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
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 sm:p-6" id="technical-checks-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
              Infrastructure & Indexability
            </span>
            <h3 className="text-base font-bold text-stone-900">Technical Website Checks</h3>
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

        {/* Technical Signals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
          <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs">
            <span className="text-[10px] text-stone-600 uppercase font-bold tracking-wider block">HTTPS Secure</span>
            <span className="font-semibold text-stone-900 mt-0.5 flex items-center gap-1">
              {data.isHttps ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>Yes</span>
                </>
              ) : (
                <>
                  <X className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                  <span>No (Insecure)</span>
                </>
              )}
            </span>
          </div>
        </div>

        {data.noindexDetectedCount > 0 && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Warning: {data.noindexDetectedCount} sampled pages contain meta name="robots" content="noindex".
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
