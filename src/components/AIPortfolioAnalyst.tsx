import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Brain, Loader2, RefreshCcw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { analyzePortfolio, fetchCompanyNews, type NewsItem } from '../services/marketData';

export const AIPortfolioAnalyst: React.FC = () => {
  const { holdings, summary } = usePortfolio();
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performAnalysis = useCallback(async () => {
    if (holdings.length === 0) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      // 1. Fetch recent news for all holdings to provide context
      const newsPromises = holdings.slice(0, 5).map(h => fetchCompanyNews(h.symbol)); // Limit to first 5 for efficiency
      const newsResults = await Promise.all(newsPromises);
      const portfolioNews: NewsItem[] = newsResults.flat().map((n, i) => ({
        ...n,
        relatedSymbol: holdings[Math.floor(i / 3)]?.symbol // Approximate mapping
      }));

      // 2. Perform holistic analysis
      const result = await analyzePortfolio(holdings, summary, portfolioNews);
      setAnalysis(result);
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setError('Market analysis temporarily unavailable.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [holdings, summary]);

  useEffect(() => {
    performAnalysis();
  }, [holdings.length]); // Re-analyze when holdings count changes

  if (holdings.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-blue-500/5 relative overflow-hidden group">
      {/* Background Decorative Element */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-700" />
      
      <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            {isAnalyzing ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Brain className="w-6 h-6 text-white" />
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                AI Portfolio Analyst
                <Sparkles className="w-4 h-4 text-blue-400" />
              </h3>
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">
                Llama 3 Powered
              </span>
            </div>
            
            <button 
              onClick={performAnalysis}
              disabled={isAnalyzing}
              className="p-1.5 hover:bg-sidebar rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-30"
              title="Refresh Analysis"
            >
              <RefreshCcw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isAnalyzing && !analysis ? (
            <div className="space-y-2 py-2">
              <div className="h-4 bg-sidebar rounded w-full animate-pulse" />
              <div className="h-4 bg-sidebar rounded w-3/4 animate-pulse" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-danger text-sm py-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-left-4 duration-700">
              <p className="text-gray-200 text-sm leading-relaxed italic font-medium">
                "{analysis || "Your portfolio is currently being analyzed for market risks and opportunities..."}"
              </p>
              
              <div className="flex items-center gap-4 mt-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${summary.dailyChange >= 0 ? 'bg-success' : 'bg-danger'}`} />
                  ROI Impact: {summary.dailyChangePercentage >= 0 ? 'Positive' : 'Cautious'}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Context: {holdings.length} Assets + Live News
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
