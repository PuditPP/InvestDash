export type AssetType = 'Stock' | 'ETF' | 'Crypto' | 'Bond' | 'Cash';

export type Sector = 
  | 'Technology' 
  | 'Healthcare' 
  | 'Financials' 
  | 'Consumer' 
  | 'Energy' 
  | 'Utilities' 
  | 'Communication' 
  | 'Industrial' 
  | 'Real Estate' 
  | 'Materials' 
  | 'Other';

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  sector: Sector;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  priorClose: number;
  purchaseDate: string;
  note?: string;
  history?: number[];
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priorClose: number;
}

export interface PortfolioSummary {
  totalValue: number;
  dailyChange: number;
  dailyChangePercentage: number;
  totalReturn: number;
  totalReturnPercentage: number;
  cashAvailable: number;
  lastUpdated?: string;
}

export interface AssetAllocationItem {
  name: AssetType;
  value: number;
  percentage: number;
  color: string;
}

export interface SectorAllocationItem {
  name: Sector;
  value: number;
  percentage: number;
  color: string;
}

export interface PerformanceMetrics {
  totalUnrealizedGain: number;
  totalReturnPercentage: number;
  bestPerformer: {
    symbol: string;
    returnPercentage: number;
  } | null;
  worstPerformer: {
    symbol: string;
    returnPercentage: number;
  } | null;
  diversificationStatus: {
    status: 'Well diversified' | 'Concentrated' | 'Highly Concentrated';
    message: string;
  };
}
