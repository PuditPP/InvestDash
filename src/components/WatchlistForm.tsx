import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Loader2, Search } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { fetchCompanyProfile } from '../services/marketData';

interface WatchlistFormProps {
  onClose: () => void;
}

export const WatchlistForm: React.FC<WatchlistFormProps> = ({ onClose }) => {
  const { addToWatchlist, isLoading } = usePortfolio();
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch profile when symbol changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (symbol.length >= 2) {
        setIsFetching(true);
        setError(null);
        try {
          const profile = await fetchCompanyProfile(symbol);
          if (profile) {
            setName(profile.name);
          }
        } catch {
          console.error('Profile fetch failed');
        } finally {
          setIsFetching(false);
        }
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [symbol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !symbol) return;
    setError(null);

    try {
      await addToWatchlist(symbol.toUpperCase());
      onClose();
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred while adding to watchlist.';
      setError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Add New Watchlist</h2>
          <button onClick={onClose} className="p-2 hover:bg-sidebar rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-2 text-danger text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Symbol *</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="AAPL, BTC, or SPY" 
                  className="w-full bg-sidebar border border-border rounded-lg py-3 px-4 pl-11 text-sm focus:outline-none focus:border-blue-500 transition-colors uppercase"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  required
                  autoFocus
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  {isFetching ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>
            </div>

            {name && (
              <div className="p-3 bg-sidebar/50 rounded-lg border border-border animate-in fade-in slide-in-from-top-1">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Asset Name</p>
                <p className="text-sm font-medium">{name}</p>
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-sidebar transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading || !symbol}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-blue-500/10"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Adding...' : 'Add to Watchlist'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
