import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight, Briefcase, Loader2, RefreshCw, Tag } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { fetchCompanyNews, type NewsItem } from '../services/marketData';

export const GlobalNewsFeed: React.FC = () => {
  const { holdings } = usePortfolio();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const loadPortfolioNews = useCallback(async () => {
    if (holdings.length === 0) {
      setNews([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch news for all holdings in parallel and tag with symbol
      const newsPromises = holdings.map(async (h) => {
        const companyNews = await fetchCompanyNews(h.symbol);
        return companyNews.map(item => ({
          ...item,
          relatedSymbol: h.symbol // Tag news with the symbol that triggered the fetch
        }));
      });
      
      const results = await Promise.all(newsPromises);
      
      // Flatten, remove duplicates (by ID), and sort by datetime (newest first)
      const allNews = results.flat();
      const uniqueNews = Array.from(new Map(allNews.map(item => [item.id, item])).values());
      const sortedNews = uniqueNews.sort((a, b) => b.datetime - a.datetime);
      
      setNews(sortedNews);
    } catch (err) {
      console.error('Failed to load portfolio news');
    } finally {
      setIsLoading(false);
    }
  }, [holdings]);

  useEffect(() => {
    loadPortfolioNews();
  }, [loadPortfolioNews]);

  // Pagination logic
  const totalPages = Math.ceil(news.length / itemsPerPage) || 1;
  const currentNews = news.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  if (isLoading && news.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p className="text-sm font-medium">Analyzing news for your holdings...</p>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-card border border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-3 bg-sidebar rounded-full">
          <Briefcase className="w-8 h-8 text-gray-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">No Holdings Found</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">Add positions to your portfolio to see personalized market news here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Portfolio News</h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Latest updates for your {holdings.length} assets</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-sidebar border border-border rounded-lg p-1">
            <button 
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-card-hover disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-all text-gray-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-2 text-gray-400 min-w-[60px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="p-1.5 hover:bg-card-hover disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-all text-gray-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            onClick={loadPortfolioNews}
            className="p-2 hover:bg-card-hover rounded-lg transition-colors text-gray-400 hover:text-white border border-border"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {currentNews.map((item) => (
          <div 
            key={item.id} 
            className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col"
          >
            {item.image && (
              <div className="h-32 w-full overflow-hidden bg-sidebar relative">
                <img 
                  src={item.image} 
                  alt="" 
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent opacity-60" />
                <div className="absolute bottom-2 left-3 flex flex-col gap-1">
                  <div className="px-2 py-0.5 bg-blue-600 rounded text-[9px] font-black uppercase tracking-tighter w-fit">
                    {item.source}
                  </div>
                  {item.relatedSymbol && (
                    <div className="px-2 py-0.5 bg-sidebar/80 backdrop-blur-sm border border-border rounded text-[9px] font-black text-white uppercase tracking-tighter w-fit flex items-center gap-1">
                      <Tag className="w-2 h-2 text-blue-400" />
                      {item.relatedSymbol}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {new Date(item.datetime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!item.image && item.relatedSymbol && (
                    <span className="text-[9px] font-black text-blue-400 uppercase bg-blue-400/10 px-1.5 py-0.5 rounded">
                      {item.relatedSymbol}
                    </span>
                  )}
                </div>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block group-hover:text-blue-400 transition-colors line-clamp-3"
                >
                  <h3 className="font-bold text-sm leading-snug">
                    {item.headline}
                  </h3>
                </a>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                {!item.image && (
                    <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400 bg-sidebar px-2 py-0.5 rounded border border-border">
                        {item.source}
                    </span>
                )}
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-1.5 ml-auto"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
