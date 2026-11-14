import React from 'react';
import {
  Users,
  CalendarCheck2,
  UserPlus,
  TrendingUp,
  BriefcaseBusiness,
  RefreshCw,
  Download,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';
import { NavTab } from '../types/hr';

interface ShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  lastSynced: string;
  isLoading: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
  onOpenBriefModal: () => void;
  onToggleFilters: () => void;
  filtersOpen: boolean;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: NavTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  {
    id: 'employees',
    label: 'Employee Analytics',
    shortLabel: 'Employees',
    icon: <Users className="w-[18px] h-[18px]" />,
  },
  {
    id: 'attendance',
    label: 'Attendance Analytics',
    shortLabel: 'Attendance',
    icon: <CalendarCheck2 className="w-[18px] h-[18px]" />,
  },
  {
    id: 'recruitment',
    label: 'Recruitment Analytics',
    shortLabel: 'Recruitment',
    icon: <UserPlus className="w-[18px] h-[18px]" />,
  },
  {
    id: 'performance',
    label: 'Performance Analysis',
    shortLabel: 'Performance',
    icon: <TrendingUp className="w-[18px] h-[18px]" />,
  },
  {
    id: 'executive',
    label: 'Executive Summary',
    shortLabel: 'Executive',
    icon: <BriefcaseBusiness className="w-[18px] h-[18px]" />,
  },
];

export const Shell: React.FC<ShellProps> = ({
  activeTab,
  onTabChange,
  lastSynced,
  isLoading,
  onRefresh,
  onExportCsv,
  onOpenBriefModal,
  onToggleFilters,
  filtersOpen,
  children,
}) => {
  const formattedSync = (() => {
    if (!lastSynced) return 'Not synced';
    const d = new Date(lastSynced);
    if (Number.isNaN(d.getTime())) return lastSynced;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  })();

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col">
      {/* Top Matte Obsidian Navigation Bar */}
      <header className="no-print h-[68px] px-4 lg:px-6 flex items-center justify-between gap-4 bg-[#121212] shrink-0">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 13H7L10 5L14 19L17 12H21"
                stroke="#4ADE80"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-display text-[19px] font-bold tracking-tight text-white whitespace-nowrap">
            People Pulse
          </span>
        </div>

        {/* Center Horizontal Pill Navigation Tabs */}
        <nav
          aria-label="Primary analytics navigation"
          className="hidden xl:flex items-center gap-1.5 bg-[#181818] border border-white/[0.06] rounded-full p-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#242424] text-[#4ADE80] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border border-white/10'
                    : 'text-[#A1A1AA] hover:text-white border border-transparent'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Compact Tabs for Tablet / Medium Screens */}
        <nav
          aria-label="Compact analytics navigation"
          className="hidden md:flex xl:hidden items-center gap-1 bg-[#181818] border border-white/[0.06] rounded-full p-1 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#242424] text-[#4ADE80] border border-white/10'
                    : 'text-[#A1A1AA] hover:text-white border border-transparent'
                }`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Sync Timestamp + Refresh Data + Brief + Filter Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1B1B1B] border border-white/[0.07] text-[12px] text-[#A1A1AA]">
            <span>Synced</span>
            <span className="font-mono-tabular text-white font-medium">{formattedSync}</span>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 px-3.5 rounded-full bg-[#242424] hover:bg-[#2E2E2E] border border-white/10 text-[12px] font-medium text-white flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4ADE80] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing' : 'Refresh Data'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenBriefModal}
            title="Executive Brief & Schema Inspector"
            aria-label="Executive Brief & Schema Inspector"
            className="w-9 h-9 rounded-full bg-[#1C1C1C] hover:bg-[#282828] border border-white/10 flex items-center justify-center text-[#D4D4D8] hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleFilters}
            title="Toggle Workspace Filters"
            aria-label="Toggle Workspace Filters"
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              filtersOpen
                ? 'bg-[#242424] border-[#4ADE80]/40 text-[#4ADE80]'
                : 'bg-[#1C1C1C] hover:bg-[#282828] border-white/10 text-[#D4D4D8] hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body Layout: Slim Left Obsidian Rail + Rounded Off-White Workspace */}
      <div className="flex-1 flex min-h-0">
        {/* Slim Left Icon Sidebar Rail */}
        <aside className="no-print hidden md:flex flex-col items-center justify-between w-[68px] py-5 bg-[#121212] shrink-0">
          <div className="flex flex-col items-center gap-3">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#39D353] text-[#0B190E] shadow-[0_6px_20px_rgba(57,211,83,0.35)]'
                      : 'bg-[#1D1D1D] text-[#A1A1AA] hover:text-white hover:bg-[#282828] border border-white/[0.05]'
                  }`}
                >
                  {item.icon}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onExportCsv}
              title="Export Active View CSV"
              aria-label="Export Active View CSV"
              className="w-11 h-11 rounded-xl bg-[#1D1D1D] text-[#A1A1AA] hover:text-white hover:bg-[#282828] border border-white/[0.05] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Download className="w-[18px] h-[18px]" />
            </button>
          </div>
        </aside>

        {/* Main Rounded Off-White Workspace Canvas */}
        <main className="print-canvas flex-1 bg-[#F6F7F9] text-[#111827] md:rounded-tl-3xl overflow-x-hidden min-w-0">
          {/* Mobile Horizontal Tab Switcher */}
          <div className="no-print md:hidden px-4 pt-4 pb-1 flex items-center gap-1.5 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#121212] text-[#4ADE80]'
                      : 'bg-white text-[#4B5563] border border-[#EAECEF]'
                  }`}
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="max-w-[1440px] mx-auto px-4 sm:px-7 py-6 sm:py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
