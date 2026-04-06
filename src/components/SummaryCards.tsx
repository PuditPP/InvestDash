import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency, formatPercentage } from '../utils/calculations';
import { Sparkline } from './Sparkline';

export const SummaryCards: React.FC = () => {
  const { summary } = usePortfolio();

  const mockHistory = [100, 102, 101, 105, 103, 108, 110];

  const cards = [
    {
      label: 'Total Portfolio Value',
      value: formatCurrency(summary.totalValue),
      subValue: 'Across all assets',
      icon: DollarSign,
      color: 'text-blue-500',
      sparkColor: '#3b82f6',
    },
    {
      label: 'Daily Change',
      value: formatCurrency(Math.abs(summary.dailyChange)),
      subValue: formatPercentage(summary.dailyChangePercentage),
      icon: summary.dailyChange >= 0 ? TrendingUp : TrendingDown,
      color: summary.dailyChange >= 0 ? 'text-success' : 'text-danger',
      isNegative: summary.dailyChange < 0,
      sparkColor: summary.dailyChange >= 0 ? '#10b981' : '#ef4444',
    },
    {
      label: 'Overall ROI',
      value: formatCurrency(Math.abs(summary.totalReturn)),
      subValue: formatPercentage(summary.totalReturnPercentage),
      icon: Percent,
      color: summary.totalReturn >= 0 ? 'text-success' : 'text-danger',
      isNegative: summary.totalReturn < 0,
      sparkColor: summary.totalReturn >= 0 ? '#10b981' : '#ef4444',
    },
    ];

    return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-card border border-border p-6 rounded-xl hover:bg-card-hover transition-all group overflow-hidden relative">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-sm font-medium text-gray-400">{card.label}</span>
            <div className={`p-2 rounded-lg bg-sidebar border border-border ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 relative z-10">
            <h3 className="text-2xl font-bold tracking-tight">
              {card.isNegative && '-'} {card.value}
            </h3>
            <p className={`text-sm font-medium ${card.color}`}>
              {card.subValue}
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-12 opacity-20">
            <Sparkline data={mockHistory} color={card.sparkColor} width="100%" height="100%" />
          </div>
        </div>
      ))}
    </div>
  );
};
