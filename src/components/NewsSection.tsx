import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { fetchCompanyNews, summarizeNewsImpact, type NewsItem } from '../services/marketData';

interface NewsSectionProps {
  symbol: string;
}

export const NewsSection: React.FC<NewsSectionProps> = ({ symbol }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summarizingId, setSummarizingId] = useState<number | null>(null);

  const loadNews = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCompanyNews(symbol);
      setNews(data);
    } catch (err) {
      console.error('Failed to load news');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [symbol]);

  const handleSummarize = async (item: NewsItem) => {
    if (item.aiSummary) return;
    
    setSummarizingId(item.id);
    try {
      const summary = await summarizeNewsImpact(item.headline, item.summary);
      setNews(prev => prev.map(n => 
        n.id === item.id ? { ...n, aiSummary: summary } : n
      ));
    } catch (err) {
      console.error('AI Summary failed');
    } finally {
      setSummarizingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <p className="text-sm">Fetching latest news for {symbol}...</p>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 border border-dashed border-border rounded-xl">
        <p className="text-sm">No recent news found for {symbol}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
          <Newspaper className="w-4 h-4" />
          Latest News
        </h4>
        <button 
          onClick={loadNews}
          className="p-1 hover:bg-card-hover rounded-full transition-colors text-gray-500 hover:text-white"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      
      <div className="grid gap-4">
        {news.map((item) => (
          <div key={item.id} className="bg-card border border-border rounded-xl p-4 hover:border-blue-500/50 transition-all group">
            <div className="flex justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    {item.source}
                    <ExternalLink className="w-2 h-2" />
                  </a>
                  <span>•</span>
                  <span>{new Date(item.datetime * 1000).toLocaleDateString()}</span>
                </div>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block group-hover:text-blue-400 transition-colors"
                >
                  <h5 className="font-bold text-sm leading-tight">
                    {item.headline}
                  </h5>
                </a>
                
                {item.aiSummary ? (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mt-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase mb-1">
                      <Sparkles className="w-3 h-3" />
                      AI Market Impact
                    </div>
                    <p className="text-xs text-blue-100 italic leading-relaxed">
                      "{item.aiSummary}"
                    </p>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleSummarize(item)}
                    disabled={summarizingId === item.id}
                    className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase py-1.5 px-3 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-all border border-blue-500/20 disabled:opacity-50"
                  >
                    {summarizingId === item.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        AI Summarize Impact
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {item.image && (
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-sidebar border border-border hidden sm:block">
                  <img src={item.image} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
            
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-medium text-gray-400 hover:text-white transition-colors"
            >
              Read full article
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
