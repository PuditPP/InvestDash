import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Holding, WatchlistItem, Transaction, PortfolioSummary, AssetAllocationItem, SectorAllocationItem, PerformanceMetrics } from '../types';
import { 
  calculatePortfolioSummary, 
  calculateAssetAllocation, 
  calculateSectorBreakdown, 
  calculatePerformanceMetrics 
} from '../utils/calculations';
import { 
  fetchMarketQuotes, 
  fetchSingleQuote, 
  fetchHistoricalData, 
  fetchCompanyProfile, 
  BENCHMARK_SYMBOL,
  type MarketQuote 
} from '../services/marketData';


interface PortfolioContextType {
  holdings: Holding[];
  watchlist: WatchlistItem[];
  transactions: Transaction[];
  user: User | null;
  summary: PortfolioSummary;
  assetAllocation: AssetAllocationItem[];
  sectorBreakdown: SectorAllocationItem[];
  performanceMetrics: PerformanceMetrics;
  addPosition: (holding: Omit<Holding, 'id' | 'currentPrice' | 'priorClose' | 'history'>) => Promise<void>;
  editPosition: (id: string, updates: Partial<Holding>) => Promise<void>;
  recordTransaction: (id: string, type: 'buy' | 'sell', quantity: number, price: number) => Promise<void>;
  removePosition: (id: string) => Promise<void>;
  addToWatchlist: (symbol: string) => Promise<void>;
  removeFromWatchlist: (id: string) => Promise<void>;
  refreshPrices: () => Promise<void>;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  const [summary, setSummary] = useState<PortfolioSummary>({
    totalValue: 0,
    dailyChange: 0,
    dailyChangePercentage: 0,
    totalReturn: 0,
    totalReturnPercentage: 0,
    cashAvailable: 0,
  });
  const [assetAllocation, setAssetAllocation] = useState<AssetAllocationItem[]>([]);
  const [sectorBreakdown, setSectorBreakdown] = useState<SectorAllocationItem[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalUnrealizedGain: 0,
    totalReturnPercentage: 0,
    bestPerformer: null,
    worstPerformer: null,
    diversificationStatus: { status: 'Well diversified', message: '' }
  });

  // Handle Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync calculated state
  useEffect(() => {
    const baseSummary = calculatePortfolioSummary(holdings, 0);
    setSummary(prev => ({ 
      ...baseSummary, 
      lastUpdated,
      benchmarkReturn: prev.benchmarkReturn 
    }));
    setAssetAllocation(calculateAssetAllocation(holdings));
    setSectorBreakdown(calculateSectorBreakdown(holdings));
    setPerformanceMetrics(calculatePerformanceMetrics(holdings));
  }, [holdings, lastUpdated]);

  // Load Holdings and Watchlist from Supabase
  const loadData = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      // Load Holdings
      const holdingsResult = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', userId);

      if (holdingsResult.error) throw holdingsResult.error;

      if (holdingsResult.data) {
        // Map Supabase columns to our Holding interface
        const mappedHoldings: Holding[] = holdingsResult.data.map(item => ({
          id: item.id,
          symbol: item.symbol,
          name: item.name || item.symbol,
          assetType: (item.symbol === 'BTC' ? 'Bitcoin' : (item.asset_type || 'Stock')) as AssetType,
          sector: (item.symbol === 'BTC' ? 'Crypto' : (item.sector || 'Other')) as Sector,
          quantity: item.quantity,
          averageCost: item.average_cost,
          currentPrice: item.current_price || item.average_cost,
          priorClose: item.prior_close || item.average_cost,
          purchaseDate: item.purchase_date,
          note: item.note,
          history: item.history || []
        }));
        setHoldings(mappedHoldings);
      }

      // Load Watchlist
      const watchlistResult = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', userId);
      
      if (watchlistResult.error) {
        console.warn('Watchlist load error:', watchlistResult.error);
      } else if (watchlistResult.data) {
        const mappedWatchlist: WatchlistItem[] = watchlistResult.data.map(item => ({
          id: item.id,
          symbol: item.symbol,
          name: item.name || item.symbol,
          currentPrice: item.current_price || 0,
          priorClose: item.prior_close || 0
        }));
        setWatchlist(mappedWatchlist);
      }

      // Load Transactions
      const transactionsResult = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (transactionsResult.data) {
        const mappedTransactions: Transaction[] = transactionsResult.data.map(item => ({
          id: item.id,
          holdingId: item.holding_id,
          symbol: item.symbol,
          type: item.type as 'buy' | 'sell',
          quantity: item.quantity,
          price: item.price,
          date: item.transaction_date
        }));
        setTransactions(mappedTransactions);
      }

      // Automatically refresh prices once data is loaded from DB
      if (holdingsResult.data || watchlistResult.data) {
        const h = holdingsResult.data ? holdingsResult.data.map(item => ({
          id: item.id,
          symbol: item.symbol,
          name: item.name || item.symbol,
          assetType: (item.symbol === 'BTC' ? 'Bitcoin' : (item.asset_type || 'Stock')) as AssetType,
          sector: (item.symbol === 'BTC' ? 'Crypto' : (item.sector || 'Other')) as Sector,
          quantity: item.quantity,
          averageCost: item.average_cost,
          currentPrice: item.current_price || item.average_cost,
          priorClose: item.prior_close || item.average_cost,
          purchaseDate: item.purchase_date,
          note: item.note,
          history: item.history || []
        })) : [];
        
        const w = watchlistResult.data ? watchlistResult.data.map(item => ({
          id: item.id,
          symbol: item.symbol,
          name: item.name || item.symbol,
          currentPrice: item.current_price || 0,
          priorClose: item.prior_close || 0
        })) : [];

        refreshPrices(h, w);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData(user.id);
    } else {
      setHoldings([]);
      setWatchlist([]);
      setIsLoading(false);
    }
  }, [user, loadData]);

  const addPosition = async (newHolding: Omit<Holding, 'id' | 'currentPrice' | 'priorClose' | 'history'>) => {
    if (!user) return;
    setIsLoading(true);
    
    let currentPrice = newHolding.averageCost;
    let priorClose = newHolding.averageCost;
    let name = newHolding.name;
    let history: number[] = [];

    try {
      const [quote, histData] = await Promise.all([
        fetchSingleQuote(newHolding.symbol.toUpperCase()),
        fetchHistoricalData(newHolding.symbol.toUpperCase())
      ]);

      if (quote) {
        currentPrice = quote.price;
        priorClose = quote.priorClose;
        if (quote.name) name = quote.name;
      }
      
      if (histData) history = histData;

      const { data, error } = await supabase
        .from('holdings')
        .insert([{
          user_id: user.id,
          symbol: newHolding.symbol.toUpperCase(),
          name: name,
          asset_type: newHolding.assetType,
          sector: newHolding.sector,
          quantity: newHolding.quantity,
          average_cost: newHolding.averageCost,
          purchase_date: newHolding.purchaseDate,
          note: newHolding.note,
          current_price: currentPrice,
          prior_close: priorClose,
          history: history
        }])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        const added = { ...newHolding, id: data[0].id, currentPrice, priorClose, history, name };
        setHoldings(prev => [...prev, added]);

        // Create initial transaction record
        await supabase.from('transactions').insert([{
          user_id: user.id,
          holding_id: data[0].id,
          symbol: newHolding.symbol.toUpperCase(),
          type: 'buy',
          quantity: newHolding.quantity,
          price: newHolding.averageCost,
          transaction_date: newHolding.purchaseDate
        }]);

        // Refresh transactions state
        const { data: newTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false });
        
        if (newTx) {
          setTransactions(newTx.map(item => ({
            id: item.id,
            holdingId: item.holding_id,
            symbol: item.symbol,
            type: item.type as 'buy' | 'sell',
            quantity: item.quantity,
            price: item.price,
            date: item.transaction_date
          })));
        }
      } else {
        throw new Error('Failed to create holding record.');
      }
    } catch (err) {
      console.error('Error adding position:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const editPosition = async (id: string, updates: Partial<Holding>) => {
    try {
      const { error } = await supabase
        .from('holdings')
        .update({
          symbol: updates.symbol,
          quantity: updates.quantity,
          average_cost: updates.averageCost,
          purchase_date: updates.purchaseDate,
          note: updates.note,
          asset_type: updates.assetType,
          sector: updates.sector,
          name: updates.name
        })
        .eq('id', id);

      if (error) throw error;
      setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    } catch (err) {
      console.error('Error editing position:', err);
      throw err;
    }
  };

  const recordTransaction = async (id: string, type: 'buy' | 'sell', quantity: number, price: number) => {
    const holding = holdings.find(h => h.id === id);
    if (!holding) return;

    setIsLoading(true);
    try {
      let newQuantity = holding.quantity;
      let newAverageCost = holding.averageCost;

      if (type === 'buy') {
        const currentTotalCost = holding.quantity * holding.averageCost;
        const newPurchaseCost = quantity * price;
        newQuantity = holding.quantity + quantity;
        newAverageCost = (currentTotalCost + newPurchaseCost) / newQuantity;
      } else {
        newQuantity = holding.quantity - quantity;
        if (newQuantity < 0) throw new Error('Cannot sell more than you own.');
        // Average cost typically doesn't change on a sell in weighted average systems
      }

      const { error } = await supabase
        .from('holdings')
        .update({
          quantity: newQuantity,
          average_cost: newAverageCost
        })
        .eq('id', id);

      if (error) throw error;

      // Create transaction record
      await supabase.from('transactions').insert([{
        user_id: user.id,
        holding_id: id,
        symbol: holding.symbol,
        type: type,
        quantity: quantity,
        price: price,
        transaction_date: new Date().toISOString().split('T')[0]
      }]);
      
      setHoldings(prev => prev.map(h => 
        h.id === id ? { ...h, quantity: newQuantity, averageCost: newAverageCost } : h
      ));

      // Refresh transactions state
      const { data: newTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });
      
      if (newTx) {
        setTransactions(newTx.map(item => ({
          id: item.id,
          holdingId: item.holding_id,
          symbol: item.symbol,
          type: item.type as 'buy' | 'sell',
          quantity: item.quantity,
          price: item.price,
          date: item.transaction_date
        })));
      }
    } catch (err) {
      console.error('Error recording transaction:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removePosition = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this position?')) return;
    
    try {
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setHoldings(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('Error removing position:', err);
      throw err;
    }
  };

  const addToWatchlist = async (symbol: string) => {
    if (!user) return;
    const formattedSymbol = symbol.toUpperCase();
    if (watchlist.some(item => item.symbol === formattedSymbol)) return;

    setIsLoading(true);
    try {
      let name = formattedSymbol;
      let currentPrice = 0;
      let priorClose = 0;

      const [profile, quote] = await Promise.all([
        fetchCompanyProfile(formattedSymbol),
        fetchSingleQuote(formattedSymbol)
      ]);

      if (profile) name = profile.name;
      if (quote) {
        currentPrice = quote.price;
        priorClose = quote.priorClose;
      }

      const { data, error } = await supabase
        .from('watchlist')
        .insert([{
          user_id: user.id,
          symbol: formattedSymbol,
          name: name,
          current_price: currentPrice,
          prior_close: priorClose
        }])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setWatchlist(prev => [...prev, {
          id: data[0].id,
          symbol: formattedSymbol,
          name: name,
          currentPrice,
          priorClose
        }]);
      }
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWatchlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setWatchlist(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error removing from watchlist:', err);
      throw err;
    }
  };

  const refreshPrices = async (currentHoldings = holdings, currentWatchlist = watchlist) => {
    if (currentHoldings.length === 0 && currentWatchlist.length === 0) return;
    setIsLoading(true);
    
    const holdingSymbols = currentHoldings.map(h => h.symbol.toUpperCase());
    const watchlistSymbols = currentWatchlist.map(w => w.symbol.toUpperCase());
    const allUniqueSymbols = Array.from(new Set([...holdingSymbols, ...watchlistSymbols, BENCHMARK_SYMBOL]));

    try {
      const results = await Promise.all([
        fetchMarketQuotes(allUniqueSymbols),
        ...holdingSymbols.map(s => fetchHistoricalData(s))
      ]);
      
      const quotes = results[0] as MarketQuote[];
      const histories = results.slice(1) as number[][];

      // Calculate benchmark return (SPY)
      const benchmarkQuote = quotes.find(q => q.symbol === BENCHMARK_SYMBOL);
      const benchmarkReturn = benchmarkQuote 
        ? ((benchmarkQuote.price - benchmarkQuote.priorClose) / benchmarkQuote.priorClose) * 100 
        : undefined;
      
      const updatedHoldings = currentHoldings.map((h, index) => {
        const quote = quotes.find(q => q.symbol === h.symbol.toUpperCase());
        const history = histories[index];
        return {
          ...h,
          currentPrice: quote ? quote.price : h.currentPrice,
          priorClose: quote ? quote.priorClose : h.priorClose,
          history: (history && history.length > 0) ? history : h.history
        };
      });

      const updatedWatchlist = currentWatchlist.map(w => {
        const quote = quotes.find(q => q.symbol === w.symbol.toUpperCase());
        return {
          ...w,
          currentPrice: quote ? quote.price : w.currentPrice,
          priorClose: quote ? quote.priorClose : w.priorClose
        };
      });

      setHoldings(updatedHoldings);
      setWatchlist(updatedWatchlist);
      setSummary(prev => ({ ...prev, benchmarkReturn }));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <PortfolioContext.Provider value={{
      holdings,
      watchlist,
      transactions,
      user,
      summary,
      assetAllocation,
      sectorBreakdown,
      performanceMetrics,
      addPosition,
      editPosition,
      recordTransaction,
      removePosition,
      addToWatchlist,
      removeFromWatchlist,
      refreshPrices,
      isLoading,
      signOut
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};
