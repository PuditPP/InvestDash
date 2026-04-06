import React from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, Target } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency, formatPercentage } from '../utils/calculations';

export const PerformanceMetricsPanel: React.FC = () => {
  const { performanceMetrics } = usePortfolio();
  const { totalUnrealizedGain, totalReturnPercentage, bestPerformer, worstPerformer, diversificationStatus } = performanceMetrics;

  const getStatusIcon = () => {
    switch (diversificationStatus.status) {
      case 'Well diversified': return <CheckCircle className="text-success w-5 h-5" />;
      case 'Concentrated': return <AlertTriangle className="text-yellow-500 w-5 h-5" />;
      case 'Highly Concentrated': return <AlertTriangle className="text-danger w-5 h-5" />;
      default: return null;
    }
  };

  const getStatusBg = () => {
    switch (diversificationStatus.status) {
      case 'Well diversified': return 'bg-success/10 border-success/20';
      case 'Concentrated': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'Highly Concentrated': return 'bg-danger/10 border-danger/20';
      default: return 'bg-sidebar border-border';
    }
  };

  return (
    <div className="bg-card border border-border p-6 rounded-xl h-full space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          Performance Metrics
        </h2>
        
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${getStatusBg()} flex gap-3`}>
              {getStatusIcon()}
              <div>
                <p className="text-sm font-bold">{diversificationStatus.status}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{diversificationStatus.message}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-sidebar rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-success/10 text-success">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Total Unrealized Gain</span>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${totalUnrealizedGain >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(totalUnrealizedGain)}
                </p>
                <p className={`text-xs ${totalUnrealizedGain >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatPercentage(totalReturnPercentage)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-sidebar rounded-lg border border-border">
                <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Best Performer</p>
                {bestPerformer ? (
                  <>
                    <p className="text-sm font-bold text-white">{bestPerformer.symbol}</p>
                    <p className="text-xs font-bold text-success">{formatPercentage(bestPerformer.returnPercentage)}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-gray-500">N/A</p>
                )}
              </div>
              <div className="p-4 bg-sidebar rounded-lg border border-border">
                <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Worst Performer</p>
                {worstPerformer ? (
                  <>
                    <p className="text-sm font-bold text-white">{worstPerformer.symbol}</p>
                    <p className="text-xs font-bold text-danger">{formatPercentage(worstPerformer.returnPercentage)}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-gray-500">N/A</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Diversification Rule</h3>
        <p className="text-xs text-gray-400 italic">
          "Warn if any single sector exceeds 30% or any single asset class exceeds 50% of the total portfolio market value."
        </p>
      </div>
    </div>
  );
};
