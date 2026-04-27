import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Brain, Loader2, RefreshCcw, AlertTriangle, Send, MessageSquare } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { analyzePortfolio, fetchCompanyNews, askPortfolioQuestion, type NewsItem } from '../services/marketData';

export const AIPortfolioAnalyst: React.FC = () => {
  const { holdings, summary } = usePortfolio();
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioNews, setPortfolioNews] = useState<NewsItem[]>([]);

  // QA State
  const [userQuestion, setUserQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);

  const STORAGE_KEY = 'portfolio_ai_analysis';

  const performAnalysis = useCallback(async (force = false) => {
    if (holdings.length === 0) return;

    // Check if we have a valid analysis for today
    const stored = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toISOString().split('T')[0];

    if (!force && stored) {
      try {
        const { data, date } = JSON.parse(stored);
        if (date === today && data) {
          setAnalysis(data);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse stored analysis');
      }
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      // 1. Fetch recent news for all holdings to provide context
      const newsPromises = holdings.slice(0, 5).map(h => fetchCompanyNews(h.symbol));
      const newsResults = await Promise.all(newsPromises);
      const fetchedNews: NewsItem[] = newsResults.flat().map((n, i) => ({
        ...n,
        relatedSymbol: holdings[Math.floor(i / 3)]?.symbol
      }));
      setPortfolioNews(fetchedNews);

      // 2. Perform holistic analysis
      const result = await analyzePortfolio(holdings, summary, fetchedNews);
      
      // 3. Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: result,
        date: today
      }));
      
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
  }, [performAnalysis]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim() || isAnswering) return;

    setIsAnswering(true);
    setAiAnswer(null);

    try {
      // If we don't have news yet, fetch it
      let currentNews = portfolioNews;
      if (currentNews.length === 0) {
        const newsPromises = holdings.slice(0, 5).map(h => fetchCompanyNews(h.symbol));
        const newsResults = await Promise.all(newsPromises);
        currentNews = newsResults.flat().map((n, i) => ({
          ...n,
          relatedSymbol: holdings[Math.floor(i / 3)]?.symbol
        }));
        setPortfolioNews(currentNews);
      }

      const answer = await askPortfolioQuestion(userQuestion, holdings, summary, currentNews);
      setAiAnswer(answer);
      setUserQuestion('');
    } catch (err) {
      console.error('QA Error:', err);
      setAiAnswer("Unable to answer at the moment. Please try again.");
    } finally {
      setIsAnswering(false);
    }
  };

  if (holdings.length === 0) return null;

  return (
    <div className="space-y-6">
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
                  Daily Strategy
                </span>
              </div>
              <button 
                onClick={() => performAnalysis(true)}
                disabled={isAnalyzing}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all group/btn"
                title="Refresh AI Analysis"
              >
                <RefreshCcw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : 'group-hover/btn:rotate-180 transition-transform duration-500'}`} />
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
                <div className="text-gray-200 text-sm leading-relaxed font-medium space-y-2">
                  {analysis ? (
                    analysis.split('\n')
                      .filter(line => line.trim())
                      .map((line, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                          <span className="text-gray-200">
                            {line.replace(/^[•\-\*\d\.\s]+/, '').trim()}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-500 text-xs">Awaiting market data for strategic analysis...</p>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-6 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${summary.dailyChange >= 0 ? 'bg-success' : 'bg-danger'}`} />
                    ROI Impact: {summary.dailyChangePercentage >= 0 ? 'Positive' : 'Cautious'}
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Update Frequency: 1 Time / Day
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ask a Question Section */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-white tracking-tight">Ask your Portfolio</h3>
          </div>

          <form onSubmit={handleAskQuestion} className="relative">
            <input 
              type="text" 
              placeholder="e.g. What is my risk exposure? or How are my tech stocks doing?" 
              className="w-full bg-sidebar border border-border rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              disabled={isAnswering}
            />
            <button 
              type="submit"
              disabled={!userQuestion.trim() || isAnswering}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg transition-all"
            >
              {isAnswering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>

          {aiAnswer && (
            <div className="animate-in slide-in-from-top-2 duration-300 p-4 bg-sidebar/50 rounded-xl border border-border/50">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">
                  {aiAnswer}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
