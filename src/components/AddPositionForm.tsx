import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Loader2, Search } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { fetchCompanyProfile } from '../services/marketData';
import type { Holding, AssetType, Sector } from '../types';

interface AddPositionFormProps {
  onClose: () => void;
  editingHolding?: Holding;
}

export const AddPositionForm: React.FC<AddPositionFormProps> = ({ onClose, editingHolding }) => {
  const { addPosition, editPosition, isLoading } = usePortfolio();
  const [formData, setFormData] = useState({
    symbol: editingHolding?.symbol || '',
    name: editingHolding?.name || '',
    assetType: (editingHolding?.assetType || 'Stock') as AssetType,
    sector: (editingHolding?.sector || 'Technology') as Sector,
    quantity: editingHolding?.quantity.toString() || '',
    averageCost: editingHolding?.averageCost.toString() || '',
    purchaseDate: editingHolding?.purchaseDate || new Date().toISOString().split('T')[0],
    note: editingHolding?.note || '',
  });

  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSymbolNotFound, setIsSymbolNotFound] = useState(false);

  // Auto-fetch profile when symbol changes
  useEffect(() => {
    if (editingHolding) return;

    const timer = setTimeout(async () => {
      if (formData.symbol.length >= 2) {
        setIsFetching(true);
        setError(null);
        setIsSymbolNotFound(false);
        try {
          const profile = await fetchCompanyProfile(formData.symbol);
          if (profile) {
            setFormData(prev => ({
              ...prev,
              name: profile.name,
              assetType: profile.assetType as AssetType,
              sector: profile.sector as Sector
            }));
            setIsSymbolNotFound(false);
          } else {
            setIsSymbolNotFound(true);
            setShowAdvanced(true);
          }
        } catch {
          console.error('Profile fetch failed');
          setIsSymbolNotFound(true);
          setShowAdvanced(true);
        } finally {
          setIsFetching(false);
        }
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.symbol, editingHolding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    // Basic validation
    if (!formData.symbol || !formData.quantity || !formData.averageCost) {
      setError('Please fill in all required fields.');
      return;
    }

    // Use symbol as fallback name if name is missing
    const finalName = formData.name || formData.symbol.toUpperCase();

    const quantity = parseFloat(formData.quantity);
    const averageCost = parseFloat(formData.averageCost);

    if (isNaN(quantity) || quantity <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    if (isNaN(averageCost) || averageCost <= 0) {
      setError('Average cost must be a positive number.');
      return;
    }

    try {
      if (editingHolding) {
        await editPosition(editingHolding.id, {
          symbol: formData.symbol.toUpperCase(),
          name: finalName,
          assetType: formData.assetType,
          sector: formData.sector,
          quantity,
          averageCost,
          purchaseDate: formData.purchaseDate,
          note: formData.note,
        });
      } else {
        await addPosition({
          symbol: formData.symbol.toUpperCase(),
          name: finalName,
          assetType: formData.assetType,
          sector: formData.sector,
          quantity,
          averageCost,
          purchaseDate: formData.purchaseDate,
          note: formData.note,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Submit error:', err);
      let errorMessage = 'An error occurred while saving the position.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String(err.message);
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
    }
  };

  const assetTypes: AssetType[] = ['Stock', 'ETF', 'Crypto', 'Bond', 'Cash'];
  const sectors: Sector[] = [
    'Technology', 'Healthcare', 'Financials', 'Consumer', 'Energy', 
    'Utilities', 'Communication', 'Industrial', 'Real Estate', 'Materials', 'Other'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">
            {editingHolding ? 'Edit Position' : 'Add New Position'}
          </h2>
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

          {isSymbolNotFound && !editingHolding && (
            <div className="p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg text-blue-400 text-xs">
              Details for "{formData.symbol}" not found. Please enter them manually.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Symbol *</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="AAPL" 
                className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 pl-9 text-sm focus:outline-none focus:border-blue-500 transition-colors uppercase"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                required
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {isFetching ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>
          </div>

          {(showAdvanced || editingHolding || isSymbolNotFound) && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name *</label>
                <input 
                  type="text" 
                  placeholder="Apple Inc." 
                  className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isFetching}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset Type</label>
                  <select 
                    className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                    value={formData.assetType}
                    onChange={(e) => setFormData({ ...formData, assetType: e.target.value as AssetType })}
                    disabled={isFetching}
                  >
                    {assetTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sector</label>
                  <select 
                    className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value as Sector })}
                    disabled={isFetching}
                  >
                    {sectors.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity *</label>
              <input 
                type="number" 
                step="any"
                placeholder="0.00" 
                className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Cost *</label>
              <input 
                type="number" 
                step="any" 
                placeholder="0.00" 
                className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.averageCost}
                onChange={(e) => setFormData({ ...formData, averageCost: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase Date</label>
              <input 
                type="date" 
                className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </div>
            {!showAdvanced && !editingHolding && !isSymbolNotFound && (
              <div className="flex items-end pb-1">
                <button 
                  type="button"
                  onClick={() => setShowAdvanced(true)}
                  className="text-xs text-blue-500 hover:text-blue-400 font-medium transition-colors"
                >
                  Edit name/sector manually?
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Note (Optional)</label>
            <textarea 
              rows={2}
              placeholder="Add a note..." 
              className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-sidebar transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Saving...' : (editingHolding ? 'Save Changes' : 'Add Position')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
