import React, { useState } from 'react';
import { Navbar } from './components/Navbar.js';
import { UrlInputForm } from './components/UrlInputForm.js';
import { TrustLegend } from './components/TrustLegend.js';
import { OverallSummaryCard } from './components/OverallSummaryCard.js';
import { CategoriesCard } from './components/CategoriesCard.js';
import { NotCheckedCard } from './components/NotCheckedCard.js';
import { ManualChecksCard } from './components/ManualChecksCard.js';
import { SampledPagesModal } from './components/SampledPagesModal.js';
import { PublisherCheckReport } from './types.js';
import { validateReportConsistency } from './validationPass.js';
// Naye Icons add kiye hain Metric Cards ke liye
import { AlertCircle, Sparkles, RefreshCw, ShieldCheck, ArrowRight, TrendingUp, Link as LinkIcon, FileText, PenTool, UserCheck, LayoutList } from 'lucide-react';

// --- NAYA METRIC CARD COMPONENT YAHIN ADD KIYA HAI ---
interface MetricCardProps {
  title: string;
  metric: string | number;
  description: string;
  icon: any;
  trendIcon?: any;
  iconColorClass?: string;
}

function MetricCard({ 
  title, 
  metric, 
  description, 
  icon: Icon, 
  trendIcon: TrendIcon,
  iconColorClass = 'text-indigo-600 bg-indigo-50' 
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between h-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="flex items-center gap-2 text-3xl font-bold text-slate-900 mb-1">
            {metric}
            {TrendIcon && (
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600">
                <TrendIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </h3>
          <span className="text-sm font-bold text-slate-700">
            {title}
          </span>
        </div>
        <div className={`p-2.5 rounded-lg ${iconColorClass} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4 mt-auto">
        {description}
      </p>
    </div>
  );
}
// ---------------------------------------------------

export default function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PublisherCheckReport | null>(null);
  const [isSampledModalOpen, setIsSampledModalOpen] = useState(false);

  const runAnalysis = async (urlToAnalyze: string, forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setCurrentUrl(urlToAnalyze);

    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToAnalyze, forceRefresh }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Inspection failed. Please verify the URL and try again.');
      }

      const validatedReport = validateReportConsistency(data.report);
      setReport(validatedReport);
      window.scrollTo({ top: 180, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while communicating with the inspection engine.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo');
      const data = await res.json();
      if (data.success && data.report) {
        const validatedDemo = validateReportConsistency(data.report);
        setReport(validatedDemo);
        setCurrentUrl(validatedDemo.targetUrl);
        window.scrollTo({ top: 180, behavior: 'smooth' });
      } else {
        throw new Error('Could not load sample report.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load sample report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setReport(null);
    setError(null);
    setCurrentUrl('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        onReset={handleReset}
        onLoadDemo={handleLoadDemo}
        isLoading={isLoading || isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto mb-10">
          <UrlInputForm
            onSubmit={(url) => runAnalysis(url, false)}
            isLoading={isLoading}
            initialUrl={currentUrl}
          />
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-5 rounded-2xl bg-red-50 border border-red-100 text-red-900 shadow-sm">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-base">Inspection Could Not Be Completed</h4>
                <p className="text-sm text-red-700 mt-1.5 leading-relaxed">{error}</p>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <button
                    onClick={handleLoadDemo}
                    className="font-semibold text-red-800 hover:text-red-950 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>View sample report instead</span>
                  </button>
                  <button
                    onClick={() => setError(null)}
                    className="font-medium text-red-600 hover:text-red-900 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {report && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <OverallSummaryCard
                report={report}
                onRefresh={() => runAnalysis(report.targetUrl, true)}
                onOpenSampledPages={() => setIsSampledModalOpen(true)}
                isRefreshing={isRefreshing}
              />
            </div>

            {/* NAYA 3-COLUMN METRIC GRID - Image Jaisa Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <MetricCard 
                title="Publishing Activity" 
                metric={report.publishing?.totalArticles ? `${report.publishing.totalArticles}` : 'Active'} 
                description="Total accessible articles found via public sitemap." 
                icon={FileText} 
                iconColorClass="text-emerald-600 bg-emerald-50"
              />

              <MetricCard 
                title="Avg. Outbound Links" 
                metric={report.outboundLinks?.average || 'N/A'} 
                description="Average external links found per sampled article." 
                icon={LinkIcon} 
                trendIcon={TrendingUp} 
                iconColorClass="text-blue-600 bg-blue-50"
              />

              <MetricCard 
                title="Technical Health" 
                metric={report.technicalChecks?.httpsSecure ? 'Secure' : 'Warning'} 
                description="HTTPS secure and core accessibility verified." 
                icon={ShieldCheck} 
                iconColorClass="text-purple-600 bg-purple-50"
              />

              <MetricCard 
                title="Guest Post Signals" 
                metric={report.guestPostSignals?.guidelinesDetected ? 'Detected' : 'Clear'} 
                description="Analysis of contribution guidelines and commercial terms." 
                icon={PenTool} 
                iconColorClass="text-amber-600 bg-amber-50"
              />

              <MetricCard 
                title="Editorial Transparency" 
                metric={report.editorialTransparency?.pagesFound || 'Checked'} 
                description="Standard transparency pages (About, Contact) verified." 
                icon={UserCheck} 
                iconColorClass="text-indigo-600 bg-indigo-50"
              />

              <MetricCard 
                title="Author Attribution" 
                metric={report.contentAuthors?.attributionDetected ? 'Verified' : 'Missing'} 
                description="Author attribution and timestamps detected in markup." 
                icon={LayoutList} 
                iconColorClass="text-rose-600 bg-rose-50"
              />

            </div>
            {/* Grid End */}

            {/* Purane Categories aur Manual Checks wese hi rakhe hain */}
            {report.categories && (
              <div className="mt-8">
                <CategoriesCard data={report.categories} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <NotCheckedCard />
              <ManualChecksCard />
            </div>

            <div className="mt-10 p-6 rounded-2xl bg-slate-900 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="font-bold text-lg block mb-1">
                  Verify the raw evidence yourself
                </span>
                <span className="text-sm text-slate-300">
                  Inspect the specific pages, titles, authors, and anchor contexts analyzed in this run.
                </span>
              </div>
              <button
                onClick={() => setIsSampledModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-sm font-bold shrink-0 transition-colors shadow-sm cursor-pointer"
              >
                <span>Open Inspector ({report.sampledPages.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {report && (
        <SampledPagesModal
          isOpen={isSampledModalOpen}
          onClose={() => setIsSampledModalOpen(false)}
          pages={report.sampledPages}
          domain={report.normalizedDomain}
        />
      )}
    </div>
  );
}