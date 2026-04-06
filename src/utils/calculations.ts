import type { Holding, PortfolioSummary, AssetAllocationItem, SectorAllocationItem, PerformanceMetrics, AssetType, Sector } from '../types';

export const ASSET_COLORS: Record<AssetType, string> = {
  Stock: '#3b82f6',
  ETF: '#10b981',
  Crypto: '#f59e0b',
  Bond: '#8b5cf6',
  Cash: '#6b7280',
};

export const SECTOR_COLORS: Record<Sector, string> = {
  Technology: '#3b82f6',
  Healthcare: '#10b981',
  Financials: '#f59e0b',
  Consumer: '#ef4444',
  Energy: '#8b5cf6',
  Utilities: '#06b6d4',
  Communication: '#ec4899',
  Industrial: '#f97316',
  'Real Estate': '#14b8a6',
  Materials: '#a855f7',
  Other: '#64748b',
};

export const calculateHoldingsMetrics = (holdings: Holding[]) => {
  return holdings.map(h => {
    const marketValue = h.quantity * h.currentPrice;
    const costBasis = h.quantity * h.averageCost;
    const unrealizedGain = marketValue - costBasis;
    const unrealizedGainPercentage = (unrealizedGain / costBasis) * 100;
    const dailyChange = (h.currentPrice - h.priorClose) * h.quantity;
    const dailyChangePercentage = ((h.currentPrice - h.priorClose) / h.priorClose) * 100;

    return {
      ...h,
      marketValue,
      costBasis,
      unrealizedGain,
      unrealizedGainPercentage,
      dailyChange,
      dailyChangePercentage,
    };
  });
};

export const calculatePortfolioSummary = (holdings: Holding[], cash: number): PortfolioSummary => {
  const metrics = calculateHoldingsMetrics(holdings);
  const totalMarketValue = metrics.reduce((acc, h) => acc + h.marketValue, 0);
  const totalCostBasis = metrics.reduce((acc, h) => acc + h.costBasis, 0);
  const totalDailyChange = metrics.reduce((acc, h) => acc + h.dailyChange, 0);
  
  const totalValue = totalMarketValue + cash;
  const totalReturn = totalMarketValue - totalCostBasis;
  const totalReturnPercentage = totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0;
  
  const priorTotalMarketValue = metrics.reduce((acc, h) => acc + (h.priorClose * h.quantity), 0);
  const dailyChangePercentage = priorTotalMarketValue > 0 ? (totalDailyChange / priorTotalMarketValue) * 100 : 0;

  return {
    totalValue,
    dailyChange: totalDailyChange,
    dailyChangePercentage,
    totalReturn,
    totalReturnPercentage,
    cashAvailable: cash,
  };
};

export const calculateAssetAllocation = (holdings: Holding[]): AssetAllocationItem[] => {
  const metrics = calculateHoldingsMetrics(holdings);
  const totalValue = metrics.reduce((acc, h) => acc + h.marketValue, 0);
  
  const allocationMap = metrics.reduce((acc, h) => {
    acc[h.assetType] = (acc[h.assetType] || 0) + h.marketValue;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(allocationMap).map(([name, value]) => ({
    name: name as AssetType,
    value,
    percentage: (value / totalValue) * 100,
    color: ASSET_COLORS[name as AssetType] || '#64748b',
  })).sort((a, b) => b.value - a.value);
};

export const calculateSectorBreakdown = (holdings: Holding[]): SectorAllocationItem[] => {
  const metrics = calculateHoldingsMetrics(holdings);
  const totalValue = metrics.reduce((acc, h) => acc + h.marketValue, 0);
  
  const allocationMap = metrics.reduce((acc, h) => {
    acc[h.sector] = (acc[h.sector] || 0) + h.marketValue;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(allocationMap).map(([name, value]) => ({
    name: name as Sector,
    value,
    percentage: (value / totalValue) * 100,
    color: SECTOR_COLORS[name as Sector] || '#64748b',
  })).sort((a, b) => b.value - a.value);
};

export const calculatePerformanceMetrics = (holdings: Holding[]): PerformanceMetrics => {
  if (holdings.length === 0) {
    return {
      totalUnrealizedGain: 0,
      totalReturnPercentage: 0,
      bestPerformer: null,
      worstPerformer: null,
      diversificationStatus: { status: 'Well diversified', message: 'Add positions to see status' },
    };
  }

  const metrics = calculateHoldingsMetrics(holdings);
  const totalUnrealizedGain = metrics.reduce((acc, h) => acc + h.unrealizedGain, 0);
  const totalCostBasis = metrics.reduce((acc, h) => acc + h.costBasis, 0);
  const totalReturnPercentage = (totalUnrealizedGain / totalCostBasis) * 100;

  const sortedByReturn = [...metrics].sort((a, b) => b.unrealizedGainPercentage - a.unrealizedGainPercentage);
  const bestPerformer = {
    symbol: sortedByReturn[0].symbol,
    returnPercentage: sortedByReturn[0].unrealizedGainPercentage,
  };
  const worstPerformer = {
    symbol: sortedByReturn[sortedByReturn.length - 1].symbol,
    returnPercentage: sortedByReturn[sortedByReturn.length - 1].unrealizedGainPercentage,
  };

  // Diversification logic
  const sectors = calculateSectorBreakdown(holdings);
  const assets = calculateAssetAllocation(holdings);
  
  const topSector = sectors[0];
  const topAsset = assets[0];
  
  let status: 'Well diversified' | 'Concentrated' | 'Highly Concentrated' = 'Well diversified';
  let message = 'Your portfolio is well diversified across sectors and assets.';

  if (topSector && topSector.percentage > 40) {
    status = 'Highly Concentrated';
    message = `High concentration in ${topSector.name} (${topSector.percentage.toFixed(1)}%). Consider diversifying.`;
  } else if (topSector && topSector.percentage > 25) {
    status = 'Concentrated';
    message = `Relatively high concentration in ${topSector.name} (${topSector.percentage.toFixed(1)}%).`;
  } else if (topAsset && topAsset.percentage > 50) {
    status = 'Concentrated';
    message = `Concentrated in ${topAsset.name} asset class (${topAsset.percentage.toFixed(1)}%).`;
  }

  return {
    totalUnrealizedGain,
    totalReturnPercentage,
    bestPerformer,
    worstPerformer,
    diversificationStatus: { status, message },
  };
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export const formatPercentage = (value: number) => {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};
