import React from 'react';

export interface SegmentedProgressItem {
  label: string;
  percentage: number;
  subtitle?: string;
  color?: 'green' | 'blue' | 'violet' | 'amber';
  icon?: React.ReactNode;
}

interface SegmentedProgressProps {
  items: SegmentedProgressItem[];
  showRowCards?: boolean;
}

export const SegmentedProgressList: React.FC<SegmentedProgressProps> = ({
  items,
  showRowCards = true,
}) => {
  const fillClass = (color: SegmentedProgressItem['color']) => {
    switch (color) {
      case 'blue':
        return 'stripe-fill-blue';
      case 'violet':
        return 'stripe-fill-violet';
      case 'amber':
        return 'stripe-fill-amber';
      case 'green':
      default:
        return 'stripe-fill-green';
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const clamped = Math.max(0, Math.min(100, Math.round(item.percentage)));
        return (
          <div
            key={item.label}
            className={
              showRowCards
                ? 'rounded-xl border border-[#EAECEF] bg-[#FAFAFB] px-3.5 py-3 flex items-center gap-3.5'
                : 'py-2 flex items-center gap-3.5'
            }
          >
            {item.icon && (
              <div className="w-9 h-9 rounded-lg bg-white border border-[#EAECEF] flex items-center justify-center shrink-0 text-[#374151]">
                {item.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <span className="text-[13px] font-semibold text-[#111827] truncate block">
                    {item.label}
                  </span>
                  {item.subtitle && (
                    <span className="text-[11px] text-[#6B7280] truncate block">
                      {item.subtitle}
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-semibold text-[#111827] tabular-nums shrink-0">
                  {clamped}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#ECEEF2] overflow-hidden p-[1px]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${fillClass(item.color)}`}
                  style={{ width: `${Math.max(clamped, 3)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
