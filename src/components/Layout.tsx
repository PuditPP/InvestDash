import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Table, PieChart, TrendingUp, Settings, LogOut, Search, RefreshCw, Trash2, PlusSquare, Loader2, Plus, Menu, X } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { searchSymbols } from '../services/marketData';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddWatchlist: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onAddWatchlist, isOpen, setIsOpen }) => {
  const { watchlist, isLoading, refreshPrices, summary, signOut, removeFromWatchlist } = usePortfolio();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'holdings', label: 'Holdings', icon: Table },
    { id: 'allocation', label: 'Allocation', icon: PieChart },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`
        fixed md:sticky top-0 left-0 z-50 w-64 h-screen bg-sidebar border-r border-border flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <button 
            onClick={() => handleTabClick('dashboard')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left focus:outline-none group"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">InvestDash</h1>
          </button>
          <button 
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Main Navigation</p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                  activeTab === item.id ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:bg-card-hover hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-8">
            <div className="px-3 flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Watchlist</p>
              <button 
                onClick={onAddWatchlist}
                className="p-1 hover:bg-card-hover rounded-md text-gray-500 hover:text-white transition-colors"
                title="Add to Watchlist"
              >
                <PlusSquare className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1">
              {watchlist.length === 0 ? (
                <p className="px-3 py-4 text-xs text-gray-600 italic">No items in watchlist</p>
              ) : (
                watchlist.map((item) => {
                  const change = item.currentPrice - item.priorClose;
                  const changePercent = (change / item.priorClose) * 100;
                  const isPositive = change >= 0;

                  return (
                    <div 
                      key={item.id}
                      className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-card-hover transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white uppercase truncate">{item.symbol}</span>
                        <span className="text-[10px] text-gray-500 truncate">{item.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-medium text-white">${item.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div className={`text-[10px] font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
                            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => removeFromWatchlist(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-danger/10 rounded-md text-gray-500 hover:text-danger transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <button 
            onClick={() => refreshPrices()}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-card-hover hover:text-white transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm">Refresh Data</span>
              {summary.lastUpdated && (
                <span className="text-[10px] text-gray-500">Last: {summary.lastUpdated}</span>
              )}
            </div>
          </button>
          <button 
            onClick={() => handleTabClick('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'settings' ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:bg-card-hover hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export const TopNav: React.FC<{ 
  onSelectAsset: (asset: { symbol: string, description: string }) => void;
  toggleSidebar: () => void;
}> = ({ onSelectAsset, toggleSidebar }) => {
  const { user } = usePortfolio();
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchInput.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchSymbols(searchInput);
        setSuggestions(results.filter(r => r.symbol && !r.symbol.includes('.')).slice(0, 8));
        setShowSuggestions(true);
      } catch (err) {
        console.error('TopNav Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSelect = (s: any) => {
    onSelectAsset({ symbol: s.symbol, description: s.description });
    setSearchInput('');
    setShowSuggestions(false);
  };

  return (
    <div className="h-16 border-b border-border bg-background flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <button 
          className="md:hidden p-2 text-gray-400 hover:text-white bg-sidebar border border-border rounded-lg"
          onClick={toggleSidebar}
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="relative w-full max-w-md" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-sidebar border border-border rounded-lg py-2 pl-10 pr-10 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => searchInput.length >= 2 && setShowSuggestions(true)}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              </div>
            )}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-[calc(100vw-2rem)] sm:w-[400px] mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar overflow-x-hidden animate-in slide-in-from-top-2 duration-200">
              <div className="p-2 border-b border-border bg-sidebar/50">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">Quick Add Position</span>
              </div>
              {suggestions.map((s) => (
                <button
                  key={s.symbol}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-sidebar text-left transition-colors border-b border-border last:border-0 group"
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{s.symbol}</span>
                      <span className="text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                        {s.type || 'Stock'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 truncate">{s.description}</span>
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-4">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-bold text-white leading-none">{user?.user_metadata?.full_name || 'User'}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold border border-border shrink-0 overflow-hidden">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'
          )}
        </div>
      </div>
    </div>
  );
};
