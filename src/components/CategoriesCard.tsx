import React from 'react';
import { Layers, ExternalLink } from 'lucide-react';
import { ListedCategoriesResult } from '../types.js';

interface CategoriesCardProps {
  data?: ListedCategoriesResult;
}

export function CategoriesCard({ data }: CategoriesCardProps) {
  if (!data) return null;

  const isDetected = data.status === 'detected' && data.categories.length > 0;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 sm:p-6" id="listed-categories-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-stone-100 text-stone-700">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
              Site Taxonomy & Navigation
            </span>
            <h3 className="text-base font-bold text-stone-900">
              {isDetected ? 'Listed Categories' : 'No Explicit Category Structure Detected'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isDetected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isDetected ? 'bg-emerald-500' : 'bg-stone-400'}`} />
            {isDetected ? 'Categories Detected' : 'Not Detected'}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs text-stone-600 leading-relaxed">{data.explanation}</p>

        {isDetected ? (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              {data.categories.map((cat, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-800 border border-stone-200"
                >
                  <span>{cat.name}</span>
                  {cat.url && (
                    <a
                      href={cat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 hover:text-stone-700 transition-colors"
                      title={cat.url}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600 leading-relaxed">
            No explicit category navigation or public taxonomy structure was found in the accessible first-party website structure checked. This does not establish that the site has no internal categories; it only means PublisherCheck could not verify a public category structure.
          </div>
        )}

        {/* Evidence List */}
        {data.evidence && data.evidence.length > 0 && (
          <div className="mt-4 pt-3 border-t border-stone-100">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-600 block mb-2">
              Observable Evidence
            </span>
            <div className="space-y-1.5">
              {data.evidence.map((item) => (
                <div key={item.id} className="text-xs text-stone-700 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-stone-800">{item.title}</span>
                    {item.detail && <span className="text-stone-500 ml-1.5">— {item.detail}</span>}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 hover:text-stone-600 shrink-0 inline-flex items-center gap-0.5"
                    >
                      <span className="text-[11px]">view</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
