import React, { useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, AlertCircle, Loader2 } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/calculations';
import type { Holding } from '../types';

interface TransactionFormProps {
  holding: Holding;
  type: 'buy' | 'sell';
  onClose: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ holding, type, onClose }) => {
  const { recordTransaction, isLoading } = usePortfolio();
  const [formData, setFormData] = useState({
    quantity: '',
    price: holding.currentPrice.toString(),
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    const qty = parseFloat(formData.quantity);
    const price = parseFloat(formData.price);

    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    if (isNaN(price) || price <= 0) {
      setError('Price must be a positive number.');
      return;
    }

    if (type === 'sell' && qty > holding.quantity) {
      setError(`Cannot sell more than you own (${holding.quantity} shares).`);
      return;
    }

    try {
      await recordTransaction(holding.id, type, qty, price);
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while recording the transaction.';
      setError(errorMessage);
    }
  };

  const currentTotalCost = holding.quantity * holding.averageCost;
  const newQty = type === 'buy' ? holding.quantity + (parseFloat(formData.quantity) || 0) : holding.quantity - (parseFloat(formData.quantity) || 0);
  const newTotalCost = type === 'buy' ? currentTotalCost + ((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0)) : currentTotalCost;
  const newAvgCost = newQty > 0 ? newTotalCost / newQty : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${type === 'buy' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {type === 'buy' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {type === 'buy' ? 'Buy' : 'Sell'} {holding.symbol}
              </h2>
              <p className="text-xs text-gray-500">Update your position with a new transaction.</p>
            </div>
          </div>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity to {type === 'buy' ? 'Buy' : 'Sell'}</label>
              <input 
                type="number" 
                step="any"
                placeholder="0.00" 
                className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{type === 'buy' ? 'Buy' : 'Sell'} Price</label>
              <input 
                type="number" 
                step="any" 
                placeholder="0.00" 
                className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="bg-sidebar/50 rounded-xl p-4 border border-border space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Projection</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Current Qty</span>
                <span className="text-sm font-medium">{holding.quantity}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">New Qty</span>
                <span className={`text-sm font-bold ${type === 'buy' ? 'text-success' : 'text-danger'}`}>
                  {newQty.toFixed(4)}
                </span>
              </div>
              {type === 'buy' && (
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                  <span className="text-sm text-gray-400">New Avg Cost</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-blue-500">{formatCurrency(newAvgCost)}</span>
                    <p className="text-[10px] text-gray-500">Current: {formatCurrency(holding.averageCost)}</p>
                  </div>
                </div>
              )}
            </div>
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
              disabled={isLoading}
              className={`flex-1 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 ${
                type === 'buy' ? 'bg-success hover:bg-success/90 shadow-lg shadow-success/10' : 'bg-danger hover:bg-danger/90 shadow-lg shadow-danger/10'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                type === 'buy' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Recording...' : `${type === 'buy' ? 'Confirm Buy' : 'Confirm Sell'}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
