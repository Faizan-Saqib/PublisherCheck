import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, HelpCircle, RefreshCw, FileText, CheckCircle2, Clock } from 'lucide-react';
import { PublisherCheckReport, RiskLevel } from '../types.js';

interface OverallSummaryCardProps {
  report: PublisherCheckReport;
  onRefresh: () => void;
  onOpenSampledPages: () => void;
  isRefreshing?: boolean;
}

export function OverallSummaryCard({
  report,
  onRefresh,
  onOpenSampledPages,
  isRefreshing = false,
}: OverallSummaryCardProps) {
  const {
    normalizedDomain,
    targetUrl,
    overallRiskLevel,
    signalCounts,
    summaryVerdict,
    isCached,
    cachedAt,
    analyzedAt,
    isDemoData,
    sampledPages,
  } = report;

  // Formatting date
  const displayDate = new Date(isCached && cachedAt ? cachedAt : analyzedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'NO MAJOR CAUTION SIGNALS':
      case 'LOW RISK SIGNALS':
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-900',
          indicator: 'bg-emerald-500',
          icon: ShieldCheck,
          label: 'NO MAJOR CAUTION SIGNALS',
          desc: 'No major caution signals detected in completed checks',
        };
      case 'REVIEW RECOMMENDED':
      case 'SOME RISK SIGNALS':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-900',
          indicator: 'bg-amber-500',
          icon: AlertTriangle,
          label: 'REVIEW RECOMMENDED',
          desc: 'One or more caution signals require human due diligence review',
        };
      case 'STRONG CAUTION SIGNALS':
      case 'SEVERAL RISK SIGNALS':
        return {
          bg: 'bg-rose-50 border-rose-300 text-rose-900',
          indicator: 'bg-rose-500',
          icon: AlertCircle,
          label: 'STRONG CAUTION SIGNALS',
          desc: 'Strong explicit evidence of commercial link selling or severe issues',
        };
      case 'INSUFFICIENT DATA':
      default:
        return {
          bg: 'bg-stone-100 border-stone-300 text-stone-800',
          indicator: 'bg-stone-400',
          icon: HelpCircle,
          label: 'INSUFFICIENT DATA',
          desc: 'Too few public signals available for a confident assessment',
        };
    }
  };

  const risk = getRiskBadge(overallRiskLevel);
  const RiskIcon = risk.icon;

  const verifiedCount = signalCounts?.verified ?? 0;
  const signalCount = signalCounts?.signal ?? 0;
  const notCheckedCount = signalCounts?.notChecked ?? 0;
  const totalCount = report.checksTotalCount ?? signalCounts?.total ?? 6;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-8">
      {/* Demo or Cache Banner */}
      {isDemoData && (
        <div className="bg-amber-500 text-stone-950 font-bold px-4 py-2 text-xs flex items-center justify-between tracking-wide">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-stone-950" />
            <span>DEMO DATA — NOT A LIVE SCAN</span>
          </div>
          <span className="text-[11px] font-normal opacity-90 hidden sm:inline">
            Demonstration benchmark dataset
          </span>
        </div>
      )}

      {isCached && !isDemoData && (
        <div className="bg-stone-100 text-stone-700 px-4 py-2 text-xs flex items-center justify-between border-b border-stone-200">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span>Showing cached report from <strong>{displayDate}</strong></span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 font-semibold text-stone-900 hover:text-stone-700 disabled:opacity-50 underline cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Re-check Now</span>
          </button>
        </div>
      )}

      <div className="p-6 sm:p-8">
        {/* Header row: Domain + Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-stone-600">Due Diligence Report</span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-600 font-mono">Last checked: {displayDate}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1 flex items-center gap-2">
              <span>{normalizedDomain}</span>
            </h2>
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-600 hover:text-stone-700 truncate max-w-md block mt-0.5 hover:underline font-mono"
            >
              {targetUrl}
            </a>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              onClick={onOpenSampledPages}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold border border-stone-300 transition-colors"
              id="view-sampled-pages-btn"
            >
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              <span>Sampled Pages ({sampledPages.length})</span>
            </button>

            {!isCached && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold border border-stone-300 transition-colors disabled:opacity-50"
                id="refresh-scan-btn"
                title="Force a fresh live re-crawl"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
          </div>
        </div>

        {/* Assessment & Checks Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-center">
          {/* Risk Verdict Banner */}
          <div className="md:col-span-7 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Overall Assessment
            </span>

            <div className={`p-4 rounded-xl border ${risk.bg} flex items-start gap-3.5`}>
              <div className="p-2 rounded-lg bg-white/80 shadow-xs shrink-0 mt-0.5">
                <RiskIcon className="w-5 h-5 text-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight">{risk.label}</span>
                </div>
                <p className="text-xs mt-1 text-stone-800 leading-relaxed font-normal">
                  {summaryVerdict}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-stone-800">
                Checks evaluated: {verifiedCount + signalCount} of {totalCount}
              </span>
              <span className="text-stone-400">|</span>
              <span className="text-stone-600">Observable public evidence only</span>
            </div>

            {report.validationNotes && report.validationNotes.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Internal Consistency Validation</span>
                    <span className="text-amber-800 text-[11px] leading-relaxed">
                      {report.validationNotes.length} section{report.validationNotes.length > 1 ? 's' : ''} exhibited inconsistent counts or status metrics and were automatically designated as &apos;Not Checked&apos; to prevent displaying misleading data.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Check Status Summary Breakdown (Replaces numerical score) */}
          <div className="md:col-span-5 bg-stone-50 rounded-xl border border-stone-200 p-5 text-left flex flex-col justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-3">
              Check Status Summary
            </span>

            <div className="grid grid-cols-3 gap-2.5 my-1">
              <div className="bg-white border border-emerald-200 rounded-lg p-3 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-emerald-700">{verifiedCount}</span>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">Verified</span>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-3 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-amber-700">{signalCount}</span>
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">Signals</span>
              </div>
              <div className="bg-white border border-stone-200 rounded-lg p-3 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-stone-600">{notCheckedCount}</span>
                <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide">Not Checked</span>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-normal mt-3">
              Total checks: {totalCount}. PublisherCheck verifies observable public markup and flags patterns for human review. It is not an arbitrary SEO score.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
