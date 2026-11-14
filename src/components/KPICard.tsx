import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, ArrowUpRight, Download } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  deltaText: string;
  deltaSubtext: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  sparkline?: number[];
  onInspect?: () => void;
  onExport?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  deltaText,
  deltaSubtext,
  deltaTone = 'positive',
  icon,
  sparkline = [36, 48, 42, 68, 56, 95, 62],
  onInspect,
  onExport,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const maxVal = Math.max(...sparkline, 1);
  // Highlight the tallest bar (or second-to-last peak) in warm orange gradient, matching reference
  const peakIdx = sparkline.reduce(
    (bestIdx, val, idx, arr) => (val >= arr[bestIdx] ? idx : bestIdx),
    0
  );

  const deltaColor =
    deltaTone === 'positive'
      ? 'text-[#16A34A]'
      : deltaTone === 'negative'
        ? 'text-[#DC2626]'
        : 'text-[#6B7280]';

  return (
    <div className="relative bg-white rounded-2xl border border-[#EAECEF] p-5 flex flex-col justify-between transition-shadow duration-150 hover:shadow-[0_6px_24px_rgba(17,24,39,0.04)]">
      {/* Top Row: Icon Badge + Three-dot Menu */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-[#F6F7F9] border border-[#EAECEF] flex items-center justify-center text-[#374151]">
          {icon}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={`${title} options`}
            className="w-8 h-8 rounded-full border border-[#EAECEF] bg-white hover:bg-[#F6F7F9] flex items-center justify-center text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white border border-[#EAECEF] shadow-lg py-1.5 z-30">
              {onInspect && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onInspect();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-[#111827] hover:bg-[#F6F7F9] flex items-center gap-2 cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#6B7280]" />
                  View Detailed Insights
                </button>
              )}
              {onExport && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onExport();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-[#111827] hover:bg-[#F6F7F9] flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#6B7280]" />
                  Export View CSV
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Label & Big Metric */}
      <div>
        <p className="text-[13px] font-medium text-[#6B7280] mb-1 truncate">{title}</p>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-[34px] leading-none font-bold text-[#111827] tracking-tight tabular-nums mb-3">
              {value}
            </div>
            <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span className={`font-semibold tabular-nums ${deltaColor}`}>{deltaText}</span>
              <span className="text-[#6B7280] truncate">{deltaSubtext}</span>
            </div>
          </div>

          {/* Signature Gray-to-Orange Mini Bar Sparkline */}
          <div
            className="flex items-end gap-[5px] h-14 pt-1 shrink-0"
            aria-hidden="true"
          >
            {sparkline.map((val, idx) => {
              const heightPct = Math.max(22, Math.round((val / maxVal) * 100));
              const isPeak = idx === peakIdx;
              return (
                <div
                  key={idx}
                  style={{
                    height: `${heightPct}%`,
                    background: isPeak
                      ? 'linear-gradient(180deg, #FF8A00 0%, #FDBA74 100%)'
                      : '#EAECEF',
                  }}
                  className="w-[7px] rounded-t-md rounded-b-sm transition-all duration-300"
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
