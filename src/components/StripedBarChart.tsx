import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts';

export interface StripedBarDatum {
  name: string;
  value: number;
  percentageLabel?: string;
  subLabel?: string;
}

interface StripedBarChartProps {
  data: StripedBarDatum[];
  height?: number;
  patternId?: string;
  accentColor?: 'violet' | 'green' | 'blue';
  showTopSummaryStrip?: boolean;
  unitLabel?: string;
}

export const StripedBarChart: React.FC<StripedBarChartProps> = ({
  data,
  height = 290,
  patternId = 'violetDiagonalStripes',
  accentColor = 'violet',
  showTopSummaryStrip = true,
  unitLabel = '',
}) => {
  const palette = {
    violet: {
      base: '#9D4EDD',
      gradientTop: '#A855F7',
      gradientBottom: '#6D28D9',
      stripe: 'rgba(255,255,255,0.42)',
    },
    green: {
      base: '#22C55E',
      gradientTop: '#4ADE80',
      gradientBottom: '#15803D',
      stripe: 'rgba(255,255,255,0.38)',
    },
    blue: {
      base: '#3B82F6',
      gradientTop: '#60A5FA',
      gradientBottom: '#1D4ED8',
      stripe: 'rgba(255,255,255,0.38)',
    },
  }[accentColor];

  return (
    <div className="w-full">
      {showTopSummaryStrip && data.length > 0 && (
        <div
          className="grid gap-3 mb-4 pl-10 pr-2"
          style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
        >
          {data.map((item) => (
            <div key={item.name} className="min-w-0">
              <div className="text-[12px] font-medium text-[#6B7280] truncate">{item.name}</div>
              <div className="font-display text-[20px] font-bold text-[#111827] tabular-nums leading-tight mt-0.5">
                {item.percentageLabel ?? `${item.value}${unitLabel}`}
              </div>
              {item.subLabel && (
                <div className="text-[11px] text-[#9CA3AF] tabular-nums truncate">
                  {item.subLabel}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 12, left: -12, bottom: 4 }} barCategoryGap="18%">
            <defs>
              <linearGradient id={`${patternId}-grad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.gradientTop} />
                <stop offset="100%" stopColor={palette.gradientBottom} />
              </linearGradient>
              <pattern
                id={patternId}
                width="10"
                height="10"
                patternTransform="rotate(42 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <rect width="10" height="10" fill={`url(#${patternId}-grad)`} />
                <line x1="0" y1="0" x2="0" y2="10" stroke={palette.stripe} strokeWidth="3.2" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEEF2" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(139, 92, 246, 0.06)', radius: 10 }}
              contentStyle={{
                backgroundColor: '#121212',
                border: '1px solid #2A2A2A',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '12px',
                padding: '8px 12px',
              }}
              itemStyle={{ color: '#4ADE80', fontWeight: 600 }}
              labelStyle={{ color: '#E5E7EB', marginBottom: '2px', fontWeight: 600 }}
              formatter={(val: unknown) => [`${val}${unitLabel}`, 'Count']}
            />
            <Bar
              dataKey="value"
              fill={`url(#${patternId})`}
              radius={[12, 12, 6, 6]}
              maxBarSize={84}
            >
              {data.map((entry, idx) => (
                <Cell key={`cell-${entry.name}-${idx}`} fill={`url(#${patternId})`} />
              ))}
              {!showTopSummaryStrip && (
                <LabelList
                  dataKey="percentageLabel"
                  position="top"
                  style={{ fill: '#111827', fontSize: 11, fontWeight: 700 }}
                />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
