import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency } from '../utils/calculations';

export const AssetAllocationChart: React.FC = () => {
  const { assetAllocation } = usePortfolio();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-sidebar border border-border p-3 rounded-lg shadow-xl">
          <p className="text-sm font-bold">{payload[0].name}</p>
          <p className="text-sm text-blue-400">{formatCurrency(payload[0].value)}</p>
          <p className="text-xs text-gray-500">{payload[0].payload.percentage.toFixed(1)}% of portfolio</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-border p-6 rounded-xl h-full flex flex-col">
      <h2 className="text-xl font-bold tracking-tight mb-6">Asset Allocation</h2>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={assetAllocation}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {assetAllocation.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {assetAllocation.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-400">{item.name}</span>
              <span className="text-sm font-bold">{item.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SectorBreakdownChart: React.FC = () => {
  const { sectorBreakdown } = usePortfolio();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-sidebar border border-border p-3 rounded-lg shadow-xl">
          <p className="text-sm font-bold">{payload[0].name}</p>
          <p className="text-sm text-blue-400">{formatCurrency(payload[0].value)}</p>
          <p className="text-xs text-gray-500">{payload[0].payload.percentage.toFixed(1)}% of portfolio</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-border p-6 rounded-xl h-full">
      <h2 className="text-xl font-bold tracking-tight mb-6">Sector Breakdown</h2>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sectorBreakdown}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={{ fill: '#9ca3af', fontSize: 12 }} 
              width={100}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2a2a2a' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {sectorBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        {sectorBreakdown.slice(0, 3).map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <span className="text-gray-400">{item.name}</span>
            <span className="font-bold">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
