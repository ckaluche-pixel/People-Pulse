import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  ChevronDown,
  Download,
  Printer,
  RotateCcw,
} from 'lucide-react';
import {
  AttendanceRecord,
  EmployeeRecord,
  FilterState,
  NavTab,
  RawSheetResponse,
  RecruitmentRecord,
  SchemaMappingSummary,
} from './types/hr';
import { parseSheetPayload } from './utils/dataMapper';
import { getFallbackSheetPayload } from './data/fallbackData';
import {
  exportTabCsv,
  filterDatasets,
  getUniqueDepartments,
  getUniqueMonths,
} from './utils/analyticsEngine';
import { Shell } from './components/Shell';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { EmployeeAnalyticsTab } from './components/tabs/EmployeeAnalyticsTab';
import { AttendanceAnalyticsTab } from './components/tabs/AttendanceAnalyticsTab';
import { RecruitmentAnalyticsTab } from './components/tabs/RecruitmentAnalyticsTab';
import { PerformanceAnalysisTab } from './components/tabs/PerformanceAnalysisTab';
import { ExecutiveSummaryTab } from './components/tabs/ExecutiveSummaryTab';
import { InsightsAndBriefModal } from './components/InsightsAndBriefModal';

const GOOGLE_SHEETS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycby0KPiB7YBkbanDWLsVsUSzVIGz_lRBXV04eJXKJbuVr30rxVDo3xE7GLil8q25bPjD/exec';

const TAB_TITLES: Record<NavTab, { heading: string; subtitle: string }> = {
  employees: {
    heading: 'PEOPLE PULSE ANALYTICS',
    subtitle: "Here's what's happening with your workforce today",
  },
  attendance: {
    heading: 'ATTENDANCE & PUNCTUALITY',
    subtitle: 'Real-time adherence, absenteeism patterns, and overtime signals',
  },
  recruitment: {
    heading: 'RECRUITMENT PIPELINE',
    subtitle: 'Track candidate velocity, stage conversion, and sourcing ROI',
  },
  performance: {
    heading: 'PERFORMANCE ANALYSIS',
    subtitle: 'Cross-referencing output ratings against attendance reliability',
  },
  executive: {
    heading: 'EXECUTIVE SUMMARY',
    subtitle: 'Decision-support insights and prioritized leadership actions',
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('employees');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [recruitment, setRecruitment] = useState<RecruitmentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [schema, setSchema] = useState<SchemaMappingSummary>({
    employeeKeys: [],
    recruitmentKeys: [],
    attendanceKeys: [],
  });
  const [lastSynced, setLastSynced] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    department: 'All Departments',
    month: 'All Months',
  });
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true);
  const [briefModalOpen, setBriefModalOpen] = useState<boolean>(false);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    if (exportMenuOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [exportMenuOpen]);

  const fetchLiveWorkforceData = useCallback(async () => {
    setIsLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);

    try {
      const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Endpoint returned HTTP ${response.status}`);
      }

      const json = (await response.json()) as RawSheetResponse;
      if (!json || !json.data) {
        throw new Error('Unexpected JSON shape returned from Google Sheets endpoint.');
      }

      const parsed = parseSheetPayload(json);
      setEmployees(parsed.employees);
      setRecruitment(parsed.recruitment);
      setAttendance(parsed.attendance);
      setSchema(parsed.schema);
      setLastSynced(parsed.timestamp || new Date().toISOString());
      setFallbackReason(null);
    } catch (err) {
      const fallback = parseSheetPayload(getFallbackSheetPayload());
      setEmployees(fallback.employees);
      setRecruitment(fallback.recruitment);
      setAttendance(fallback.attendance);
      setSchema(fallback.schema);
      setLastSynced(new Date().toISOString());
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Live Google Sheets sync timed out after 14s.'
          : err instanceof Error
            ? err.message
            : 'Unable to reach Google Sheets endpoint.';
      setFallbackReason(msg);
    } finally {
      clearTimeout(timer);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveWorkforceData();
  }, [fetchLiveWorkforceData]);

  const departments = useMemo(
    () => getUniqueDepartments(employees, recruitment),
    [employees, recruitment]
  );

  const months = useMemo(
    () => getUniqueMonths(attendance, recruitment),
    [attendance, recruitment]
  );

  const { filteredEmployees, filteredRecruitment, filteredAttendance, empMap } = useMemo(
    () => filterDatasets(employees, recruitment, attendance, filters),
    [employees, recruitment, attendance, filters]
  );

  const hasActiveFilters =
    filters.department !== 'All Departments' || filters.month !== 'All Months';

  const handleExportCsv = () => {
    exportTabCsv(activeTab, filteredEmployees, filteredRecruitment, filteredAttendance);
    setExportMenuOpen(false);
  };

  const handlePrint = () => {
    setExportMenuOpen(false);
    window.print();
  };

  const currentHero = TAB_TITLES[activeTab];

  return (
    <Shell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      lastSynced={lastSynced}
      isLoading={isLoading}
      onRefresh={fetchLiveWorkforceData}
      onExportCsv={handleExportCsv}
      onOpenBriefModal={() => setBriefModalOpen(true)}
      onToggleFilters={() => setFiltersOpen((prev) => !prev)}
      filtersOpen={filtersOpen}
    >
      {/* Graceful Fallback Warning Banner */}
      {fallbackReason && (
        <div
          role="status"
          className="no-print mb-5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#92400E]"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Offline Snapshot Active:</strong> {fallbackReason} Displaying realistic sample workforce data matching your sheet schema.
            </span>
          </div>
          <button
            type="button"
            onClick={fetchLiveWorkforceData}
            className="px-3 py-1.5 rounded-full bg-[#92400E] text-white font-semibold hover:bg-[#78350F] transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            Retry Live Sync
          </button>
        </div>
      )}

      {/* Workspace Hero Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-[26px] sm:text-[28px] font-extrabold tracking-tight text-[#111827] uppercase leading-tight">
            {currentHero.heading}
          </h1>
          <p className="text-[14px] italic text-[#6B7280] mt-1">{currentHero.subtitle}</p>
        </div>

        <div className="no-print flex items-center gap-3 shrink-0">
          {/* Export Report Outlined Pill with CSV & Print Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-[#FAFAFB] border border-[#E5E7EB] text-[13px] font-semibold text-[#111827] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <span>Export Report</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-[#EAECEF] shadow-lg py-1.5 z-30">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#111827] hover:bg-[#F6F7F9] flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#6B7280]" />
                  Download CSV ({activeTab})
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#111827] hover:bg-[#F6F7F9] flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
                  Print / Save PDF
                </button>
              </div>
            )}
          </div>

          {/* Primary Black Pill CTA */}
          <button
            type="button"
            onClick={() => setBriefModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-[#121212] hover:bg-[#242424] text-white text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            View Detailed Insights
          </button>
        </div>
      </div>

      {/* Global Workspace Filter Toolbar */}
      {filtersOpen && (
        <div className="no-print mb-6 bg-white rounded-2xl border border-[#EAECEF] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Department Filter */}
            <label className="flex items-center gap-2 text-xs text-[#6B7280]">
              <Building2 className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="font-medium">Department</span>
              <select
                value={filters.department}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, department: e.target.value }))
                }
                className="bg-[#F6F7F9] border border-[#EAECEF] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#111827] cursor-pointer"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </label>

            {/* Month / Period Filter */}
            <label className="flex items-center gap-2 text-xs text-[#6B7280]">
              <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="font-medium">Period / Month</span>
              <select
                value={filters.month}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, month: e.target.value }))
                }
                className="bg-[#F6F7F9] border border-[#EAECEF] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#111827] font-mono-tabular focus:outline-none focus:border-[#111827] cursor-pointer"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() =>
                  setFilters({ department: 'All Departments', month: 'All Months' })
                }
                className="px-3 py-1.5 rounded-xl bg-[#F6F7F9] hover:bg-[#ECEEF2] text-xs font-medium text-[#111827] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="text-xs text-[#6B7280] tabular-nums">
            <span>{filteredEmployees.length.toLocaleString()} Employees</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{filteredRecruitment.length.toLocaleString()} Candidates</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{filteredAttendance.length.toLocaleString()} Attendance Logs</span>
          </div>
        </div>
      )}

      {/* Active Workspace View */}
      {isLoading && employees.length === 0 ? (
        <LoadingSkeleton />
      ) : (
        <>
          {activeTab === 'employees' && (
            <EmployeeAnalyticsTab
              employees={filteredEmployees}
              onInspect={() => setBriefModalOpen(true)}
              onExportCsv={handleExportCsv}
            />
          )}
          {activeTab === 'attendance' && (
            <AttendanceAnalyticsTab
              attendance={filteredAttendance}
              empMap={empMap}
              onInspect={() => setBriefModalOpen(true)}
              onExportCsv={handleExportCsv}
            />
          )}
          {activeTab === 'recruitment' && (
            <RecruitmentAnalyticsTab
              recruitment={filteredRecruitment}
              onInspect={() => setBriefModalOpen(true)}
              onExportCsv={handleExportCsv}
            />
          )}
          {activeTab === 'performance' && (
            <PerformanceAnalysisTab
              employees={filteredEmployees}
              attendance={filteredAttendance}
              onInspect={() => setBriefModalOpen(true)}
              onExportCsv={handleExportCsv}
            />
          )}
          {activeTab === 'executive' && (
            <ExecutiveSummaryTab
              employees={filteredEmployees}
              recruitment={filteredRecruitment}
              attendance={filteredAttendance}
              empMap={empMap}
              filters={filters}
              onInspect={() => setBriefModalOpen(true)}
              onExportCsv={handleExportCsv}
            />
          )}
        </>
      )}

      {/* Detailed Insights & Brief Modal */}
      <InsightsAndBriefModal
        open={briefModalOpen}
        onClose={() => setBriefModalOpen(false)}
        employees={filteredEmployees}
        recruitment={filteredRecruitment}
        attendance={filteredAttendance}
        empMap={empMap}
        filters={filters}
        schema={schema}
        isFallback={Boolean(fallbackReason)}
      />
    </Shell>
  );
}
