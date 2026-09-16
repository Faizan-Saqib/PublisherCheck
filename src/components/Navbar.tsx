import React from 'react';
import { ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

interface NavbarProps {
  onReset: () => void;
  onLoadDemo: () => void;
  isLoading?: boolean;
}

export function Navbar({ onReset, onLoadDemo, isLoading }: NavbarProps) {
  return (
    <header className="border-b border-stone-200 bg-white/95 backdrop-blur-xs sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 text-left group focus:outline-hidden"
          id="nav-brand-logo"
        >
          <div className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center text-white shadow-xs group-hover:bg-stone-800 transition-colors">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-stone-900 text-lg tracking-tight">PublisherCheck</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                MVP
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              Free publisher due diligence for guest-post & link buyers
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onLoadDemo}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors disabled:opacity-50"
            id="nav-demo-button"
            title="Load sample report for thedailyfront.com"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Sample Report</span>
          </button>
        </div>
      </div>
    </header>
  );
}
