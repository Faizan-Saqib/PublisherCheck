import React from 'react';
import { CheckCircle2, Activity, HelpCircle } from 'lucide-react';

export function TrustLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2">
      <span className="font-semibold text-stone-700 tracking-wide uppercase text-[10px]">Signal Legend:</span>
      
      <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-medium">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>VERIFIED</span>
        <span className="text-[10px] text-emerald-700 font-normal hidden sm:inline">(Directly observed)</span>
      </div>

      <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
        <Activity className="w-3 h-3 text-amber-600" />
        <span>SIGNAL</span>
        <span className="text-[10px] text-amber-700 font-normal hidden sm:inline">(Inferred from evidence)</span>
      </div>

      <div className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 border border-stone-300 px-2 py-0.5 rounded font-medium">
        <HelpCircle className="w-3 h-3 text-stone-500" />
        <span>NOT CHECKED</span>
        <span className="text-[10px] text-stone-600 font-normal hidden sm:inline">(Requires unverified data)</span>
      </div>
    </div>
  );
}
