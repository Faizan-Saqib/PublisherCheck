import React, { useState } from 'react';
import { X, Search, ExternalLink, Calendar, User, AlertTriangle, Link2 } from 'lucide-react';
import { SampledPageSummary } from '../types.js';

interface SampledPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: SampledPageSummary[];
  domain: string;
}

export function SampledPagesModal({ isOpen, onClose, pages, domain }: SampledPagesModalProps) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = pages.filter(p => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.url.toLowerCase().includes(q) ||
      (p.author && p.author.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-stone-900">Sampled Pages & Observable Evidence</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono font-semibold">
                {pages.length} pages
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Inspected public URLs for <strong>{domain}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3.5 border-b border-stone-100 bg-stone-50">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sampled pages by title or author..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-800"
            />
          </div>
        </div>

        {/* Page List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              No sampled pages match your search.
            </div>
          ) : (
            filtered.map((page, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-all text-xs flex flex-col gap-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-stone-900 text-sm">{page.title}</h4>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-stone-500 hover:text-stone-800 underline flex items-center gap-1 mt-0.5 font-mono truncate"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{page.url}</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                    {page.isVerifiedArticle && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                        <span>Editorial Post</span>
                        {page.articleConfidence !== undefined && (
                          <span className="font-mono text-[9px] opacity-75">({page.articleConfidence}%)</span>
                        )}
                      </span>
                    )}
                    {page.hasSponsoredLinks && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>rel="sponsored"</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100 text-[11px] text-stone-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>{page.publishDate ? `Date: ${page.publishDate}` : 'Date: Not detected'}</span>
                  </div>

                  {page.author && (
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      <span>By: {page.author}</span>
                    </div>
                  )}

                  {page.wordCount !== undefined && page.wordCount > 0 && (
                    <div className="flex items-center gap-1 font-mono">
                      <span>{page.wordCount.toLocaleString()} words</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>{page.externalLinksCount} external / {page.internalLinksCount} internal links</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>Showing {filtered.length} of {pages.length} inspected pages</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 text-white hover:bg-stone-900 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
