import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  color: string;
  width?: number | string;
  height?: number | string;
}

export const Sparkline: React.FC<SparklineProps> = ({ data, color, width = 60, height = 30 }) => {
  const chartData = data.map((val, i) => ({ value: val, id: i }));

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
