import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Sidebar, TopNav } from './components/Layout';
import { SummaryCards } from './components/SummaryCards';
import { GlobalNewsFeed } from './components/GlobalNewsFeed';
import { AIPortfolioAnalyst } from './components/AIPortfolioAnalyst';
import { AssetAllocationChart, SectorBreakdownChart } from './components/Charts';
import { HoldingsTable } from './components/HoldingsTable';
import { PerformanceMetricsPanel } from './components/PerformanceMetrics';
import { AddPositionForm } from './components/AddPositionForm';
import { WatchlistForm } from './components/WatchlistForm';
import { ProfileSettings } from './components/ProfileSettings';
import { Auth } from './components/Auth';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext';

import type { Holding } from './types';

const DashboardContent: React.FC = () => {
  const { summary, user } = usePortfolio();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | undefined>(undefined);
  const [preselectedAsset, setPreselectedAsset] = useState<{ symbol: string, description: string } | undefined>(undefined);

  const handleEdit = (holding: Holding) => {
    setEditingHolding(holding);
    setPreselectedAsset(undefined);
    setIsAddModalOpen(true);
  };

  const handleSelectAsset = (asset: { symbol: string, description: string }) => {
    setPreselectedAsset(asset);
    setEditingHolding(undefined);
    setIsAddModalOpen(true);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsWatchlistModalOpen(false);
    setEditingHolding(undefined);
    setPreselectedAsset(undefined);
  };

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden relative">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onAddWatchlist={() => setIsWatchlistModalOpen(true)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav 
          onSelectAsset={handleSelectAsset}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>
                  <p className="text-gray-500 mt-1">Real-time performance and allocation metrics.</p>
                </div>
                {summary.lastUpdated && (
                  <div className="text-xs font-medium text-gray-500 bg-sidebar px-3 py-1.5 rounded-lg border border-border">
                    Prices updated at: <span className="text-blue-500">{summary.lastUpdated}</span>
                  </div>
                )}
              </header>

              <div className="space-y-8">
                <GlobalNewsFeed />
                <AIPortfolioAnalyst />
                <SummaryCards />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <AssetAllocationChart />
                </div>
                <div className="md:col-span-1">
                  <SectorBreakdownChart />
                </div>
                <div className="md:col-span-2 xl:col-span-1">
                  <PerformanceMetricsPanel />
                </div>
              </div>

              <HoldingsTable onEdit={handleEdit} />
            </div>
          )}

          {activeTab === 'holdings' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
              <header>
                <h1 className="text-3xl font-bold tracking-tight">Holdings</h1>
                <p className="text-gray-500 mt-1">Manage and analyze your individual positions.</p>
              </header>
              <HoldingsTable onEdit={handleEdit} />
            </div>
          )}

          {activeTab === 'allocation' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
              <header>
                <h1 className="text-3xl font-bold tracking-tight">Portfolio Allocation</h1>
                <p className="text-gray-500 mt-1">Detailed breakdown of your asset classes and sectors.</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AssetAllocationChart />
                <SectorBreakdownChart />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-4 md:p-0">
              <ProfileSettings />
            </div>
          )}
        </main>
      </div>

      {isAddModalOpen && (
        <AddPositionForm 
          onClose={closeModals} 
          editingHolding={editingHolding} 
          preselectedAsset={preselectedAsset}
        />
      )}

      {isWatchlistModalOpen && (
        <WatchlistForm 
          onClose={closeModals} 
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <PortfolioProvider>
      <DashboardContent />
    </PortfolioProvider>
  );
};

export default App;
