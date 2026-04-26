import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, AlertCircle, Loader2, Search, Check } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { fetchCompanyProfile, searchSymbols } from '../services/marketData';
import type { Holding, AssetType, Sector } from '../types';

interface AddPositionFormProps {
  onClose: () => void;
  editingHolding?: Holding;
  preselectedAsset?: { symbol: string, description: string };
}

export const AddPositionForm: React.FC<AddPositionFormProps> = ({ onClose, editingHolding, preselectedAsset }) => {
  const { addPosition, editPosition, isLoading, holdings } = usePortfolio();
  const [formData, setFormData] = useState({
    symbol: editingHolding?.symbol || preselectedAsset?.symbol || '',
    name: editingHolding?.name || preselectedAsset?.description || '',
    assetType: (editingHolding?.assetType || 'Stock') as AssetType,
    sector: (editingHolding?.sector || 'Other') as Sector,
    quantity: editingHolding?.quantity.toString() || '',
    averageCost: editingHolding?.averageCost.toString() || '',
    purchaseDate: editingHolding?.purchaseDate || new Date().toISOString().split('T')[0],
    logo: editingHolding?.logo || '',
    note: editingHolding?.note || '',
  });

  const [searchInput, setSearchInput] = useState(
    editingHolding ? `${editingHolding.symbol} - ${editingHolding.name}` : 
    preselectedAsset ? `${preselectedAsset.symbol} - ${preselectedAsset.description}` : ''
  );
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(!!(editingHolding || preselectedAsset));
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Auto-fetch profile if preselectedAsset is provided
  useEffect(() => {
    if (preselectedAsset && !editingHolding) {
      const fetchProfile = async () => {
        setIsSearching(true);
        try {
          const profile = await fetchCompanyProfile(preselectedAsset.symbol);
          if (profile) {
            setFormData(prev => ({
              ...prev,
              name: profile.name,
              assetType: profile.assetType as AssetType,
              sector: profile.sector as Sector
            }));
          }
        } catch (err) {
          console.error('Initial profile fetch failed', err);
        } finally {
          setIsSearching(false);
        }
      };
      fetchProfile();
    }
  }, [preselectedAsset, editingHolding]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search logic
  useEffect(() => {
    if (editingHolding) return;
    if (searchInput.length < 2) {
      setSuggestions([]);
      return;
    }

    // Only search if input doesn't look like a selected item (which contains " - ")
    if (searchInput.includes(' - ') && formData.symbol) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchSymbols(searchInput);
        // Filter out results without symbols and limit to 8
        setSuggestions(results.filter(r => r.symbol && !r.symbol.includes('.')).slice(0, 8));
        setShowSuggestions(true);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, editingHolding, formData.symbol]);

  const handleSelectSuggestion = async (suggestion: any) => {
    setSearchInput(`${suggestion.symbol} - ${suggestion.description}`);
    setShowSuggestions(false);
    setIsSearching(true);
    setError(null);
    
    try {
      const profile = await fetchCompanyProfile(suggestion.symbol);
      if (profile) {
        setFormData(prev => ({
          ...prev,
          symbol: suggestion.symbol,
          name: profile.name,
          assetType: profile.assetType as AssetType,
          sector: profile.sector as Sector,
          logo: profile.logo || ''
        }));
      } else {
        // Fallback if profile fetch fails
        setFormData(prev => ({
          ...prev,
          symbol: suggestion.symbol,
          name: suggestion.description,
          assetType: suggestion.type === 'ETP' ? 'ETF' : (suggestion.type === 'Crypto' ? 'Crypto' : 'Stock'),
          sector: 'Other',
          logo: ''
        }));
      }
    } catch (err) {
      console.error('Profile fetch failed', err);
    } finally {
      setIsSearching(false);
      setShowAdvanced(true); // Show details after selection
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    if (!formData.symbol || !formData.quantity || !formData.averageCost) {
      setError('Please search and select an asset first.');
      return;
    }

    // Check for duplicates
    const isDuplicate = holdings.some(h => h.symbol === formData.symbol.toUpperCase() && h.id !== editingHolding?.id);
    if (isDuplicate) {
      setError(`You already have ${formData.symbol.toUpperCase()} in your portfolio. Please edit the existing position instead.`);
      return;
    }

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
          ...formData,
          quantity,
          averageCost,
          symbol: formData.symbol.toUpperCase()
        });
      } else {
        await addPosition({
          ...formData,
          quantity,
          averageCost,
          symbol: formData.symbol.toUpperCase()
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the position.');
    }
  };

  const assetTypes: AssetType[] = ['Stock', 'ETF', 'Crypto', 'Bitcoin', 'Bond', 'Cash'];
  const sectors: Sector[] = [
    'Technology', 'Healthcare', 'Financials', 'Consumer', 'Energy', 
    'Utilities', 'Communication', 'Industrial', 'Real Estate', 'Materials', 'Crypto', 'Other'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-card border border-border w-full max-w-lg min-h-screen sm:min-h-0 sm:rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-20">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">
            {editingHolding ? 'Edit Position' : 'Add New Position'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-sidebar rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 pb-20 sm:pb-6">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-2 text-danger text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5 relative" ref={suggestionRef}>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Search Asset (Symbol or Name) *</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search e.g. AAPL or Apple" 
                className="w-full bg-sidebar border border-border rounded-lg py-2.5 px-3 pl-10 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (formData.symbol) setFormData({...formData, symbol: ''}); // Reset symbol on new search
                }}
                autoComplete="off"
                disabled={!!editingHolding}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar overflow-x-hidden animate-in slide-in-from-top-2 duration-200">
                {suggestions.map((s) => (
                  <button
                    key={s.symbol}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full flex flex-col px-4 py-3 hover:bg-sidebar text-left transition-colors border-b border-border last:border-0"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-white">{s.symbol}</span>
                      <span className="text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                        {s.type || 'Stock'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 truncate">{s.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(showAdvanced || editingHolding) && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 p-4 bg-sidebar/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-success/20 p-1 rounded-full">
                  <Check className="w-3 h-3 text-success" />
                </div>
                <span className="text-xs font-bold text-success uppercase">Asset Selected</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                <input 
                  type="text" 
                  className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset Type</label>
                  <select 
                    className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    value={formData.assetType}
                    onChange={(e) => setFormData({ ...formData, assetType: e.target.value as AssetType })}
                  >
                    {assetTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sector</label>
                  <select 
                    className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value as Sector })}
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase Date</label>
            <input 
              type="date" 
              className="w-full bg-sidebar border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            />
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
              disabled={isLoading || (!editingHolding && !formData.symbol)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
