import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MoreVertical, Edit2, Trash2, Download, ExternalLink, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency, formatPercentage, calculateHoldingsMetrics } from '../utils/calculations';
import { Sparkline } from './Sparkline';
import { NewsSection } from './NewsSection';
import { TransactionForm } from './TransactionForm';
import type { Holding } from '../types';

interface HoldingsTableProps {
  onEdit: (holding: Holding) => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ onEdit }) => {
  const { holdings, removePosition, summary } = usePortfolio();
  const [sortField, setSortField] = useState<string>('marketValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);
  const [transactionMode, setTransactionMode] = useState<{ holding: Holding, type: 'buy' | 'sell' } | null>(null);

  const metrics = calculateHoldingsMetrics(holdings);

  // Use real historical data for sparklines if available, otherwise fallback to mock
  const getHistory = (h: Holding) => {
    if (h.history && h.history.length > 0) {
      return h.history;
    }
    
    // Fallback for immediate UI feedback if history hasn't loaded
    const base = h.currentPrice;
    const history = [];
    for (let i = 0; i < 7; i++) {
      history.push(base * (1 + (Math.random() * 0.02 - 0.01)));
    }
    history.push(base);
    return history;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedHoldings = [...metrics].sort((a, b) => {
    const aValue = (a as any)[sortField];
    const bValue = (b as any)[sortField];
    return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
  });

  const exportToCSV = () => {
    const headers = ['Symbol', 'Name', 'Asset Type', 'Sector', 'Quantity', 'Avg Cost', 'Current Price', 'Market Value', 'Total Gain', 'Total Gain %', 'Daily Change %', 'Weight %'];
    const rows = sortedHoldings.map(h => [
      h.symbol,
      h.name,
      h.assetType,
      h.sector,
      h.quantity,
      h.averageCost,
      h.currentPrice,
      h.marketValue,
      h.unrealizedGain,
      h.unrealizedGainPercentage,
      h.dailyChangePercentage,
      (h.marketValue / summary.totalValue * 100)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `portfolio_holdings_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold tracking-tight">Holdings</h2>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-card-hover transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-sidebar/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('symbol')}>
                <div className="flex items-center gap-2">Ticker <SortIcon field="symbol" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('quantity')}>
                <div className="flex items-center gap-2">Quantity <SortIcon field="quantity" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('averageCost')}>
                <div className="flex items-center gap-2">Avg Cost <SortIcon field="averageCost" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('currentPrice')}>
                <div className="flex items-center gap-2">Price <SortIcon field="currentPrice" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('marketValue')}>
                <div className="flex items-center gap-2">Market Value <SortIcon field="marketValue" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('unrealizedGain')}>
                <div className="flex items-center gap-2">Gain/Loss <SortIcon field="unrealizedGain" /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('dailyChangePercentage')}>
                <div className="flex items-center gap-2">Day Change <SortIcon field="dailyChangePercentage" /></div>
              </th>
              <th className="px-6 py-4">Weight</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedHoldings.map((h) => (
              <React.Fragment key={h.id}>
                <tr 
                  className={`group hover:bg-card-hover transition-colors cursor-pointer ${selectedHoldingId === h.id ? 'bg-card-hover' : ''}`}
                  onClick={() => setSelectedHoldingId(selectedHoldingId === h.id ? null : h.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{h.symbol}</span>
                        <span className="text-xs text-gray-500 truncate max-w-[100px]">{h.name}</span>
                      </div>
                      <Sparkline 
                        data={getHistory(h)} 
                        color={h.dailyChangePercentage >= 0 ? '#10b981' : '#ef4444'} 
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{h.quantity}</td>
                  <td className="px-6 py-4 font-medium">{formatCurrency(h.averageCost)}</td>
                  <td className="px-6 py-4 font-medium">{formatCurrency(h.currentPrice)}</td>
                  <td className="px-6 py-4 font-bold">{formatCurrency(h.marketValue)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`font-bold ${h.unrealizedGain >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(h.unrealizedGain)}
                      </span>
                      <span className={`text-xs ${h.unrealizedGain >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatPercentage(h.unrealizedGainPercentage)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${h.dailyChangePercentage >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {formatPercentage(h.dailyChangePercentage)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-sidebar rounded-full overflow-hidden hidden sm:block">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${(h.marketValue / summary.totalValue * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{(h.marketValue / summary.totalValue * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-sidebar rounded transition-colors text-gray-500 hover:text-white">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                {selectedHoldingId === h.id && (
                  <tr className="bg-sidebar/30 border-t-0">
                    <td colSpan={9} className="px-6 py-8 border-t-0">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-200">
                        {/* Left Column: Stats & Actions */}
                        <div className="space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Asset Details</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Type</span>
                                  <span className="text-sm font-medium">{h.assetType}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Sector</span>
                                  <span className="text-sm font-medium">{h.sector}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Purchase Date</span>
                                  <span className="text-sm font-medium">{h.purchaseDate}</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Performance</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Cost Basis</span>
                                  <span className="text-sm font-medium">{formatCurrency(h.averageCost * h.quantity)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Total Return</span>
                                  <span className={`text-sm font-medium ${h.unrealizedGain >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {formatCurrency(h.unrealizedGain)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            <div className="flex gap-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransactionMode({ holding: h, type: 'buy' });
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-success/10 border border-success/20 hover:bg-success/20 text-success px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                              >
                                <ArrowUpCircle className="w-4 h-4" />
                                <span>Buy More</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransactionMode({ holding: h, type: 'sell' });
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-danger/10 border border-danger/20 hover:bg-danger/20 text-danger px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                              >
                                <ArrowDownCircle className="w-4 h-4" />
                                <span>Sell Part</span>
                              </button>
                            </div>
                            <div className="flex gap-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(h);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-sidebar border border-border hover:border-blue-500 hover:text-blue-500 px-4 py-2.5 rounded-xl text-sm transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                                <span>Edit Position</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePosition(h.id);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-sidebar border border-border hover:border-danger hover:text-danger px-4 py-2.5 rounded-xl text-sm transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: AI News */}
                        <div className="lg:border-l lg:border-border lg:pl-8">
                          <NewsSection symbol={h.symbol} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      {transactionMode && (
        <TransactionForm 
          holding={transactionMode.holding}
          type={transactionMode.type}
          onClose={() => setTransactionMode(null)}
        />
      )}
    </div>
  );
};
