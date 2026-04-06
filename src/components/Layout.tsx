import React from 'react';
import { LayoutDashboard, Table, PieChart, TrendingUp, Settings, LogOut, Search, PlusCircle, RefreshCw, Trash2, PlusSquare } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddWatchlist: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onAddWatchlist }) => {
  const { watchlist, isLoading, refreshPrices, summary, signOut, removeFromWatchlist } = usePortfolio();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'holdings', label: 'Holdings', icon: Table },
    { id: 'allocation', label: 'Allocation', icon: PieChart },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-border flex flex-col hidden md:flex sticky top-0">
      <div className="p-6 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <TrendingUp className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">InvestDash</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="mb-4">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Main Navigation</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-card-hover hover:text-white transition-colors">
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
  );
};

export const TopNav: React.FC<{ onAddPosition: () => void }> = ({ onAddPosition }) => {
  return (
    <div className="h-16 border-b border-border bg-background flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
      <div className="relative w-full max-w-md hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search tickers, assets..." 
          className="w-full bg-sidebar border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={onAddPosition}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Position</span>
        </button>
        
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold border border-border">
          JD
        </div>
      </div>
    </div>
  );
};
