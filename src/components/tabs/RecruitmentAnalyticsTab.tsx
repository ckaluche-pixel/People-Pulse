import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Users,
  CheckCircle2,
  Hourglass,
  FileCheck2,
  UserCheck,
  Award,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { RecruitmentRecord } from '../../types/hr';
import { KPICard } from '../KPICard';
import { StripedBarChart, StripedBarDatum } from '../StripedBarChart';
import { SegmentedProgressList, SegmentedProgressItem } from '../SegmentedProgress';

interface RecruitmentAnalyticsTabProps {
  recruitment: RecruitmentRecord[];
  onInspect: () => void;
  onExportCsv: () => void;
}

export const RecruitmentAnalyticsTab: React.FC<RecruitmentAnalyticsTabProps> = ({
  recruitment,
  onInspect,
  onExportCsv,
}) => {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('All');

  const stats = useMemo(() => {
    const totalCandidates = recruitment.length;
    const reqSet = new Set<string>();
    const openReqSet = new Set<string>();

    recruitment.forEach((r) => {
      reqSet.add(r.requisitionId);
      if (r.applicationStatus === 'In Progress') {
        openReqSet.add(r.requisitionId);
      }
    });

    const appliedCount = totalCandidates;
    const screeningCount = recruitment.filter((r) => r.screeningStatus === 'Passed').length;
    const interviewCount = recruitment.filter(
      (r) => r.interviewStatus === 'Completed' || r.stageReached === 'Offer' || r.stageReached === 'Hired'
    ).length;
    const offerCount = recruitment.filter(
      (r) => r.offerStatus === 'Accepted' || r.offerStatus === 'Declined' || r.stageReached === 'Offer' || r.stageReached === 'Hired'
    ).length;
    const hiredCount = recruitment.filter(
      (r) => r.applicationStatus === 'Hired' || r.offerStatus === 'Accepted'
    ).length;

    const offerAcceptanceRate = offerCount > 0 ? (hiredCount / offerCount) * 100 : 0;

    const tthList = recruitment
      .map((r) => r.timeToHireDays)
      .filter((d): d is number => d !== null && d >= 0);
    const avgTimeToHire =
      tthList.length > 0 ? tthList.reduce((s, d) => s + d, 0) / tthList.length : 34;

    const base = Math.max(appliedCount, 1);
    const funnelData: StripedBarDatum[] = [
      {
        name: 'Applied',
        value: appliedCount,
        percentageLabel: '100%',
        subLabel: `${appliedCount} candidates`,
      },
      {
        name: 'Screening',
        value: screeningCount,
        percentageLabel: `${Math.round((screeningCount / base) * 100)}%`,
        subLabel: `${screeningCount} passed`,
      },
      {
        name: 'Interviews',
        value: interviewCount,
        percentageLabel: `${Math.round((interviewCount / base) * 100)}%`,
        subLabel: `${interviewCount} completed`,
      },
      {
        name: 'Offer',
        value: offerCount,
        percentageLabel: `${Math.round((offerCount / base) * 100)}%`,
        subLabel: `${offerCount} extended`,
      },
      {
        name: 'Hired',
        value: hiredCount,
        percentageLabel: `${Math.round((hiredCount / base) * 100)}%`,
        subLabel: `${hiredCount} accepted`,
      },
    ];

    // Source of Hire breakdown
    const sourceMap = new Map<string, { total: number; hired: number }>();
    recruitment.forEach((r) => {
      const cur = sourceMap.get(r.source) ?? { total: 0, hired: 0 };
      cur.total += 1;
      if (r.applicationStatus === 'Hired' || r.offerStatus === 'Accepted') {
        cur.hired += 1;
      }
      sourceMap.set(r.source, cur);
    });

    const sourceData = Array.from(sourceMap.entries())
      .map(([name, val]) => ({
        name,
        applicants: val.total,
        hired: val.hired,
        conversion: val.total > 0 ? Math.round((val.hired / val.total) * 100) : 0,
      }))
      .sort((a, b) => b.applicants - a.applicants);

    // Onboarding / Pipeline Progress Capsule Card (matching reference)
    const overallConversion = Math.round((hiredCount / base) * 100);
    const progressItems: SegmentedProgressItem[] = [
      {
        label: 'Screening Pass Rate',
        subtitle: `${screeningCount} of ${appliedCount} applicants`,
        percentage: (screeningCount / base) * 100,
        color: 'green',
        icon: <FileCheck2 className="w-4 h-4" />,
      },
      {
        label: 'Interview Completion',
        subtitle: `${interviewCount} candidates interviewed`,
        percentage: screeningCount > 0 ? (interviewCount / screeningCount) * 100 : 0,
        color: 'blue',
        icon: <UserCheck className="w-4 h-4" />,
      },
      {
        label: 'Offer Acceptance',
        subtitle: `${hiredCount} accepted of ${offerCount} offers`,
        percentage: offerAcceptanceRate,
        color: 'green',
        icon: <Award className="w-4 h-4" />,
      },
    ];

    return {
      openReqs: openReqSet.size || reqSet.size,
      totalReqs: reqSet.size,
      totalCandidates,
      offerAcceptanceRate,
      avgTimeToHire,
      hiredCount,
      overallConversion,
      funnelData,
      sourceData,
      progressItems,
    };
  }, [recruitment]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recruitment.filter((r) => {
      if (stageFilter !== 'All' && r.stageReached !== stageFilter) return false;
      if (!q) return true;
      return (
        r.candidateId.toLowerCase().includes(q) ||
        r.position.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.requisitionId.toLowerCase().includes(q)
      );
    });
  }, [recruitment, search, stageFilter]);

  const sourceColors = ['#8B5CF6', '#22C55E', '#3B82F6', '#FF8A00', '#111827'];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KPICard
          title="Open Requisitions"
          value={stats.openReqs}
          deltaText={`${stats.totalReqs} total reqs`}
          deltaSubtext="active pipelines"
          deltaTone="positive"
          icon={<Briefcase className="w-[18px] h-[18px]" />}
          sparkline={[24, 38, 32, 48, 42, 74, 51]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Total Candidates"
          value={stats.totalCandidates.toLocaleString()}
          deltaText={`${stats.hiredCount} hired`}
          deltaSubtext={`${stats.overallConversion}% conversion`}
          deltaTone="positive"
          icon={<Users className="w-[18px] h-[18px]" />}
          sparkline={[34, 42, 56, 62, 68, 94, 72]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Offer Acceptance Rate"
          value={`${stats.offerAcceptanceRate.toFixed(1)}%`}
          deltaText={stats.offerAcceptanceRate >= 75 ? 'Healthy yield' : 'Below 75% target'}
          deltaSubtext="final offer stage"
          deltaTone={stats.offerAcceptanceRate >= 75 ? 'positive' : 'negative'}
          icon={<CheckCircle2 className="w-[18px] h-[18px]" />}
          sparkline={[45, 58, 52, 70, 66, 88, 76]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Avg Time-to-Hire"
          value={`${Math.round(stats.avgTimeToHire)} days`}
          deltaText="End-to-end"
          deltaSubtext="apply to hire date"
          deltaTone="neutral"
          icon={<Hourglass className="w-[18px] h-[18px]" />}
          sparkline={[62, 54, 48, 52, 44, 82, 39]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
      </section>

      {/* Reference-Matched Split: Hiring Pipeline Overview + Onboarding & Pipeline Progress */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EAECEF] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#111827]">
                Hiring Pipeline Overview
              </h2>
              <p className="text-[12px] text-[#6B7280] mt-0.5">
                Stage-by-stage funnel conversion from application to signed offer
              </p>
            </div>
          </div>

          <StripedBarChart
            data={stats.funnelData}
            patternId="recruitFunnelStripes"
            accentColor="violet"
            height={285}
            showTopSummaryStrip
          />
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAECEF] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-[17px] font-bold text-[#111827]">
                Pipeline & Onboarding Progress
              </h2>
            </div>

            <div className="flex items-baseline justify-between mt-3 mb-2">
              <span className="font-display text-[36px] font-bold text-[#111827] tabular-nums leading-none">
                {stats.overallConversion}%
              </span>
              <span className="text-xs font-medium text-[#6B7280]">Hire Completion</span>
            </div>

            <div className="w-full h-4 rounded-full bg-[#ECEEF2] overflow-hidden p-[1px] mb-5">
              <div
                className="h-full rounded-full stripe-fill-green transition-all duration-500"
                style={{ width: `${Math.max(stats.overallConversion, 6)}%` }}
              />
            </div>

            <SegmentedProgressList items={stats.progressItems} showRowCards />
          </div>
        </div>
      </section>

      {/* Source of Hire Breakdown */}
      <section className="bg-white rounded-2xl border border-[#EAECEF] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-[17px] font-bold text-[#111827]">
              Source of Hire & Channel Volume
            </h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5">
              Applicant volume and hired conversions across recruiting channels
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.sourceData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ECEEF2" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid #2A2A2A',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="applicants" name="Applicants" radius={[0, 8, 8, 0]} barSize={20}>
                  {stats.sourceData.map((entry, idx) => (
                    <Cell key={entry.name} fill={sourceColors[idx % sourceColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-5 divide-y divide-[#F0F2F5] border border-[#EAECEF] rounded-xl overflow-hidden">
            {stats.sourceData.map((src) => (
              <div
                key={src.name}
                className="px-4 py-3 flex items-center justify-between bg-[#FAFAFB]"
              >
                <div>
                  <div className="text-[13px] font-semibold text-[#111827]">{src.name}</div>
                  <div className="text-[11px] text-[#6B7280] tabular-nums">
                    {src.applicants} applicants · {src.hired} hired
                  </div>
                </div>
                <span className="font-mono-tabular text-xs font-semibold text-[#16A34A]">
                  {src.conversion}% yield
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Candidate Pipeline Table */}
      <section className="bg-white rounded-2xl border border-[#EAECEF] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#EAECEF] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-[17px] font-bold text-[#111827]">
              Active Recruitment Pipeline
            </h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5 tabular-nums">
              Showing {Math.min(filteredCandidates.length, 50)} of {filteredCandidates.length} applications
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#F6F7F9] rounded-xl border border-[#EAECEF] overflow-x-auto">
              {(['All', 'Applied', 'Screening', 'Interviews', 'Offer', 'Hired'] as const).map(
                (stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setStageFilter(stage)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      stageFilter === stage
                        ? 'bg-white text-[#111827] shadow-sm'
                        : 'text-[#6B7280] hover:text-[#111827]'
                    }`}
                  >
                    {stage}
                  </button>
                )
              )}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search role, source, req..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F7F9] border border-[#EAECEF] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111827]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAECEF] bg-[#FAFAFB] text-[12px] font-semibold text-[#6B7280]">
                <th className="py-3 px-5">Candidate & Req</th>
                <th className="py-3 px-4">Role & Department</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Screening</th>
                <th className="py-3 px-4">Interview</th>
                <th className="py-3 px-4">Offer</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2F5] text-[13px]">
              {filteredCandidates.slice(0, 50).map((rec) => (
                <tr key={rec.applicationId} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-[#111827] font-mono-tabular">
                      {rec.candidateId}
                    </div>
                    <div className="text-[11px] text-[#6B7280] font-mono-tabular">
                      {rec.requisitionId} · {rec.applicationDate || 'N/A'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#111827]">{rec.position}</div>
                    <div className="text-[11px] text-[#6B7280]">{rec.department}</div>
                  </td>
                  <td className="py-3 px-4 text-[#374151]">{rec.source}</td>
                  <td className="py-3 px-4 text-[#374151]">{rec.screeningStatus}</td>
                  <td className="py-3 px-4 text-[#374151]">{rec.interviewStatus}</td>
                  <td className="py-3 px-4 text-[#374151]">{rec.offerStatus}</td>
                  <td className="py-3 px-5 text-right font-semibold text-xs">
                    <span
                      className={
                        rec.applicationStatus === 'Hired'
                          ? 'text-[#16A34A]'
                          : rec.applicationStatus === 'Rejected' || rec.applicationStatus === 'Withdrawn'
                            ? 'text-[#DC2626]'
                            : 'text-[#3B82F6]'
                      }
                    >
                      {rec.applicationStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredCandidates.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-[#6B7280]">
                    No candidates match the selected stage or search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
