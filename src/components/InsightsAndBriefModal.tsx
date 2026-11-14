import React, { useState } from 'react';
import { X, Copy, Check, Database, Printer } from 'lucide-react';
import {
  AttendanceRecord,
  EmployeeRecord,
  FilterState,
  RecruitmentRecord,
  SchemaMappingSummary,
} from '../types/hr';
import {
  buildExecutiveBriefText,
  generateExecutiveRecommendations,
} from '../utils/analyticsEngine';

interface InsightsAndBriefModalProps {
  open: boolean;
  onClose: () => void;
  employees: EmployeeRecord[];
  recruitment: RecruitmentRecord[];
  attendance: AttendanceRecord[];
  empMap: Map<string, EmployeeRecord>;
  filters: FilterState;
  schema: SchemaMappingSummary;
  isFallback: boolean;
}

export const InsightsAndBriefModal: React.FC<InsightsAndBriefModalProps> = ({
  open,
  onClose,
  employees,
  recruitment,
  attendance,
  empMap,
  filters,
  schema,
  isFallback,
}) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const recommendations = generateExecutiveRecommendations(
    employees,
    recruitment,
    attendance,
    empMap
  );
  const briefText = buildExecutiveBriefText(
    employees,
    recruitment,
    attendance,
    recommendations,
    filters
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(briefText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insights-modal-title"
    >
      <div className="bg-white text-[#111827] rounded-2xl border border-[#EAECEF] shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EAECEF] flex items-center justify-between gap-4">
          <div>
            <h2 id="insights-modal-title" className="font-display text-lg font-bold text-[#111827]">
              Detailed Workforce Insights & Schema Inspector
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Source: {isFallback ? 'Fallback Snapshot' : 'Live Google Sheets Endpoint'} · Scope: {filters.department} ({filters.month})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full border border-[#EAECEF] flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F6F7F9] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Formatted Executive Brief */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#111827]">Leadership Brief Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-full border border-[#EAECEF] text-xs font-medium text-[#374151] hover:bg-[#F6F7F9] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-full bg-[#121212] text-white text-xs font-medium hover:bg-[#242424] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5 text-[#4ADE80]" />}
                  {copied ? 'Copied' : 'Copy Brief'}
                </button>
              </div>
            </div>
            <pre className="p-4 rounded-xl bg-[#F6F7F9] border border-[#EAECEF] text-xs font-mono-tabular text-[#1F2937] whitespace-pre-wrap leading-relaxed">
              {briefText}
            </pre>
          </div>

          {/* Dynamic Column Mapping Inspector */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-[#6B7280]" />
              <h3 className="text-sm font-bold text-[#111827]">
                Dynamic Worksheet Schema Mapping
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-[#EAECEF] bg-[#FAFAFB]">
                <div className="font-semibold text-[#111827] mb-1.5">
                  Employee_Data ({employees.length})
                </div>
                <div className="text-[#6B7280] leading-relaxed break-words">
                  {schema.employeeKeys.join(', ') || 'Mapped'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-[#EAECEF] bg-[#FAFAFB]">
                <div className="font-semibold text-[#111827] mb-1.5">
                  Recruitment_Data ({recruitment.length})
                </div>
                <div className="text-[#6B7280] leading-relaxed break-words">
                  {schema.recruitmentKeys.join(', ') || 'Mapped'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-[#EAECEF] bg-[#FAFAFB]">
                <div className="font-semibold text-[#111827] mb-1.5">
                  Attendance_Data ({attendance.length})
                </div>
                <div className="text-[#6B7280] leading-relaxed break-words">
                  {schema.attendanceKeys.join(', ') || 'Mapped'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
