import React, { useMemo, useState } from 'react';
import {
  Users,
  CalendarCheck2,
  UserPlus,
  Award,
  Copy,
  Check,
  AlertOctagon,
  Zap,
  Eye,
  ArrowRight,
} from 'lucide-react';
import {
  AttendanceRecord,
  EmployeeRecord,
  FilterState,
  RecommendationItem,
  RecommendationPriority,
  RecruitmentRecord,
} from '../../types/hr';
import { KPICard } from '../KPICard';
import {
  buildExecutiveBriefText,
  generateExecutiveRecommendations,
} from '../../utils/analyticsEngine';

interface ExecutiveSummaryTabProps {
  employees: EmployeeRecord[];
  recruitment: RecruitmentRecord[];
  attendance: AttendanceRecord[];
  empMap: Map<string, EmployeeRecord>;
  filters: FilterState;
  onInspect: () => void;
  onExportCsv: () => void;
}

export const ExecutiveSummaryTab: React.FC<ExecutiveSummaryTabProps> = ({
  employees,
  recruitment,
  attendance,
  empMap,
  filters,
  onInspect,
  onExportCsv,
}) => {
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => {
    const active = employees.filter((e) => e.status === 'Active');
    const terminated = employees.filter((e) => e.status === 'Terminated');
    const attrition = employees.length > 0 ? (terminated.length / employees.length) * 100 : 0;

    const totalSched = attendance.reduce((s, a) => s + a.scheduledWorkdays, 0);
    const totalPres = attendance.reduce((s, a) => s + a.daysPresent, 0);
    const attRate = totalSched > 0 ? (totalPres / totalSched) * 100 : 0;

    const offered = recruitment.filter(
      (r) => r.offerStatus === 'Accepted' || r.offerStatus === 'Declined'
    ).length;
    const hired = recruitment.filter(
      (r) => r.applicationStatus === 'Hired' || r.offerStatus === 'Accepted'
    ).length;
    const offerAccept = offered > 0 ? (hired / offered) * 100 : 0;

    const avgPerf =
      active.length > 0
        ? active.reduce((s, e) => s + e.performanceRating, 0) / active.length
        : 0;
    const avgEng =
      active.length > 0
        ? active.reduce((s, e) => s + e.engagementScore, 0) / active.length
        : 0;

    const recommendations: RecommendationItem[] = generateExecutiveRecommendations(
      employees,
      recruitment,
      attendance,
      empMap
    );

    // Department Cross-Functional Health Matrix
    const deptSet = new Set<string>();
    employees.forEach((e) => deptSet.add(e.department));
    recruitment.forEach((r) => deptSet.add(r.department));

    const deptMatrix = Array.from(deptSet)
      .map((dept) => {
        const dEmps = employees.filter((e) => e.department === dept);
        const dActive = dEmps.filter((e) => e.status === 'Active');
        const dTerm = dEmps.filter((e) => e.status === 'Terminated');
        const dAttr = dEmps.length > 0 ? (dTerm.length / dEmps.length) * 100 : 0;
        const dPerf =
          dActive.length > 0
            ? dActive.reduce((s, e) => s + e.performanceRating, 0) / dActive.length
            : 0;

        const dAtt = attendance.filter((a) => empMap.get(a.employeeId)?.department === dept);
        const dSched = dAtt.reduce((s, a) => s + a.scheduledWorkdays, 0);
        const dPres = dAtt.reduce((s, a) => s + a.daysPresent, 0);
        const dAttRate = dSched > 0 ? (dPres / dSched) * 100 : 0;

        const dOpenApps = recruitment.filter(
          (r) => r.department === dept && r.applicationStatus === 'In Progress'
        ).length;

        return {
          dept,
          activeHeadcount: dActive.length,
          attritionPct: dAttr,
          attendancePct: dAttRate,
          avgPerf: dPerf,
          openPipeline: dOpenApps,
        };
      })
      .sort((a, b) => b.activeHeadcount - a.activeHeadcount);

    return {
      activeCount: active.length,
      attrition,
      attRate,
      hired,
      offerAccept,
      avgPerf,
      avgEng,
      recommendations,
      deptMatrix,
    };
  }, [employees, recruitment, attendance, empMap]);

  const handleCopyBrief = async () => {
    const text = buildExecutiveBriefText(
      employees,
      recruitment,
      attendance,
      summary.recommendations,
      filters
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const priorityBadgeStyle = (priority: RecommendationPriority) => {
    if (priority === 'Immediate Action') {
      return {
        bg: 'bg-[#FEF2F2]',
        text: 'text-[#DC2626]',
        border: 'border-[#FECACA]',
        icon: <AlertOctagon className="w-3.5 h-3.5" />,
      };
    }
    if (priority === 'High Impact') {
      return {
        bg: 'bg-[#FFF7ED]',
        text: 'text-[#D97706]',
        border: 'border-[#FED7AA]',
        icon: <Zap className="w-3.5 h-3.5" />,
      };
    }
    return {
      bg: 'bg-[#EFF6FF]',
      text: 'text-[#2563EB]',
      border: 'border-[#BFDBFE]',
      icon: <Eye className="w-3.5 h-3.5" />,
    };
  };

  return (
    <div className="space-y-6">
      {/* Cross-Functional Synthesis KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KPICard
          title="Active Workforce"
          value={summary.activeCount.toLocaleString()}
          deltaText={`${summary.attrition.toFixed(1)}% attrition`}
          deltaSubtext="across all depts"
          deltaTone={summary.attrition > 15 ? 'negative' : 'positive'}
          icon={<Users className="w-[18px] h-[18px]" />}
          sparkline={[42, 54, 48, 66, 62, 92, 71]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Attendance Compliance"
          value={`${summary.attRate.toFixed(1)}%`}
          deltaText={`${attendance.length.toLocaleString()} records`}
          deltaSubtext="avg adherence"
          deltaTone="positive"
          icon={<CalendarCheck2 className="w-[18px] h-[18px]" />}
          sparkline={[88, 91, 90, 94, 93, 97, 92]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Offer Acceptance"
          value={`${summary.offerAccept.toFixed(1)}%`}
          deltaText={`${summary.hired} hires`}
          deltaSubtext={`${recruitment.length} candidates`}
          deltaTone={summary.offerAccept >= 75 ? 'positive' : 'negative'}
          icon={<UserPlus className="w-[18px] h-[18px]" />}
          sparkline={[35, 42, 56, 60, 74, 88, 68]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Performance & Engagement"
          value={`${summary.avgPerf.toFixed(2)} / 5`}
          deltaText={`${summary.avgEng.toFixed(0)}/100`}
          deltaSubtext="engagement score"
          deltaTone="positive"
          icon={<Award className="w-[18px] h-[18px]" />}
          sparkline={[48, 55, 62, 58, 71, 90, 76]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
      </section>

      {/* Dynamic Actionable Recommendations Engine Header + Copy Brief Button */}
      <section className="bg-white rounded-2xl border border-[#EAECEF] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EAECEF]">
          <div>
            <h2 className="font-display text-[19px] font-bold text-[#111827]">
              Actionable Management Decision Cards
            </h2>
            <p className="text-[13px] text-[#6B7280] mt-0.5">
              Synthesized dynamically from live thresholds across Employee, Attendance, and Recruitment worksheets
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyBrief}
            className="px-4 py-2.5 rounded-full bg-[#121212] hover:bg-[#242424] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#4ADE80]" />
                <span>Executive Brief Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#4ADE80]" />
                <span>Copy Executive Brief</span>
              </>
            )}
          </button>
        </div>

        {/* Decision Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          {summary.recommendations.map((rec) => {
            const badge = priorityBadgeStyle(rec.priority);
            return (
              <article
                key={rec.id}
                className="rounded-2xl border border-[#EAECEF] bg-[#FAFAFB] p-5 flex flex-col justify-between gap-4 hover:bg-white transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.icon}
                        {rec.priority}
                      </span>
                      <span className="text-xs font-semibold text-[#4B5563]">
                        · {rec.targetArea}
                      </span>
                    </div>
                    <span className="font-mono-tabular text-xs font-semibold text-[#111827] whitespace-nowrap">
                      {rec.metricTag}
                    </span>
                  </div>

                  <h3 className="font-display text-[16px] font-bold text-[#111827] mb-3">
                    {rec.title}
                  </h3>

                  <div className="space-y-2.5 text-[13px] leading-relaxed">
                    <div>
                      <span className="font-semibold text-[#111827]">Data Insight: </span>
                      <span className="text-[#4B5563]">{rec.dataInsight}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#111827]">Recommended Action: </span>
                      <span className="text-[#374151]">{rec.recommendedAction}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EAECEF] flex items-start gap-2 text-[12px]">
                  <ArrowRight className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#16A34A]">Expected Outcome: </span>
                    <span className="text-[#374151]">{rec.expectedOutcome}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Cross-Functional Department Health Matrix */}
      <section className="bg-white rounded-2xl border border-[#EAECEF] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#EAECEF]">
          <h2 className="font-display text-[17px] font-bold text-[#111827]">
            Department Cross-Functional Health Matrix
          </h2>
          <p className="text-[12px] text-[#6B7280] mt-0.5">
            Unified scorecard combining headcount, attrition, attendance reliability, rating, and active hiring demand
          </p>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAECEF] bg-[#FAFAFB] text-[12px] font-semibold text-[#6B7280]">
                <th className="py-3 px-5">Department</th>
                <th className="py-3 px-4 text-right">Active Headcount</th>
                <th className="py-3 px-4 text-right">Attrition Rate</th>
                <th className="py-3 px-4 text-right">Attendance Rate</th>
                <th className="py-3 px-4 text-right">Avg Rating</th>
                <th className="py-3 px-5 text-right">Active Candidates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2F5] text-[13px]">
              {summary.deptMatrix.map((row) => (
                <tr key={row.dept} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-[#111827]">{row.dept}</td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular text-[#111827]">
                    {row.activeHeadcount}
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-mono-tabular font-semibold ${
                      row.attritionPct > 15 ? 'text-[#DC2626]' : 'text-[#374151]'
                    }`}
                  >
                    {row.attritionPct.toFixed(1)}%
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-mono-tabular font-semibold ${
                      row.attendancePct < 92 ? 'text-[#D97706]' : 'text-[#16A34A]'
                    }`}
                  >
                    {row.attendancePct > 0 ? `${row.attendancePct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular text-[#111827]">
                    {row.avgPerf > 0 ? `${row.avgPerf.toFixed(2)} / 5` : '—'}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono-tabular text-[#3B82F6] font-semibold">
                    {row.openPipeline}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
