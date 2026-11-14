import React, { useMemo } from 'react';
import {
  Award,
  TrendingUp,
  AlertCircle,
  GitCompareArrows,
  Star,
  UserX,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { AttendanceRecord, EmployeeRecord } from '../../types/hr';
import { KPICard } from '../KPICard';
import { SegmentedProgressList, SegmentedProgressItem } from '../SegmentedProgress';
import {
  computePearsonCorrelation,
  joinPerformanceAndAttendance,
} from '../../utils/analyticsEngine';

interface PerformanceAnalysisTabProps {
  employees: EmployeeRecord[];
  attendance: AttendanceRecord[];
  onInspect: () => void;
  onExportCsv: () => void;
}

export const PerformanceAnalysisTab: React.FC<PerformanceAnalysisTabProps> = ({
  employees,
  attendance,
  onInspect,
  onExportCsv,
}) => {
  const analysis = useMemo(() => {
    const joined = joinPerformanceAndAttendance(employees, attendance);
    const activeCount = joined.length;

    const avgPerf =
      activeCount > 0
        ? joined.reduce((s, j) => s + j.employee.performanceRating, 0) / activeCount
        : 0;
    const highPerformers = joined.filter((j) => j.employee.performanceRating >= 4);
    const highPerfPct = activeCount > 0 ? (highPerformers.length / activeCount) * 100 : 0;
    const pipCohort = joined.filter((j) => j.employee.performanceRating <= 2);

    const correlation = computePearsonCorrelation(
      joined.map((j) => j.attendanceRate),
      joined.map((j) => j.employee.performanceRating)
    );

    // Performance Rating Distribution across Departments
    const deptDistMap = new Map<
      string,
      { dept: string; exceeds: number; meets: number; needsSupport: number; avgRating: number; sum: number; count: number }
    >();

    joined.forEach((j) => {
      const dept = j.employee.department;
      const cur = deptDistMap.get(dept) ?? {
        dept,
        exceeds: 0,
        meets: 0,
        needsSupport: 0,
        avgRating: 0,
        sum: 0,
        count: 0,
      };
      if (j.employee.performanceRating >= 4) cur.exceeds += 1;
      else if (j.employee.performanceRating === 3) cur.meets += 1;
      else cur.needsSupport += 1;
      cur.sum += j.employee.performanceRating;
      cur.count += 1;
      cur.avgRating = Number((cur.sum / cur.count).toFixed(2));
      deptDistMap.set(dept, cur);
    });

    const deptDistribution = Array.from(deptDistMap.values()).sort((a, b) => b.count - a.count);

    // Scatter points (sampled cleanly if huge, preserving outliers)
    const scatterData = joined.slice(0, 140).map((j) => ({
      name: j.employee.fullName,
      department: j.employee.department,
      attendanceRate: j.attendanceRate,
      engagementScore: j.employee.engagementScore,
      performanceRating: j.employee.performanceRating,
    }));

    // Top Performers spotlight
    const topPerformers = [...joined]
      .sort(
        (a, b) =>
          b.employee.performanceRating - a.employee.performanceRating ||
          b.employee.engagementScore - a.employee.engagementScore ||
          b.attendanceRate - a.attendanceRate
      )
      .slice(0, 5);

    const topItems: SegmentedProgressItem[] = topPerformers.map((j) => ({
      label: `${j.employee.fullName} · ${j.employee.department}`,
      subtitle: `Rating ${j.employee.performanceRating}/5 · ${j.attendanceRate}% attendance`,
      percentage: j.employee.engagementScore,
      color: 'green',
      icon: <Star className="w-4 h-4 text-[#16A34A]" />,
    }));

    // At-Risk Talent spotlight (low engagement / low rating / high absence)
    const atRisk = [...joined]
      .filter(
        (j) =>
          j.employee.performanceRating <= 2 ||
          (j.employee.performanceRating >= 4 && j.employee.engagementScore < 55) ||
          j.attendanceRate < 88
      )
      .sort((a, b) => a.employee.engagementScore - b.employee.engagementScore)
      .slice(0, 5);

    const atRiskItems: SegmentedProgressItem[] = atRisk.map((j) => ({
      label: `${j.employee.fullName} · ${j.employee.department}`,
      subtitle: `Rating ${j.employee.performanceRating}/5 · ${j.attendanceRate}% att · ${j.totalAbsentDays} abs days`,
      percentage: j.employee.engagementScore,
      color: j.employee.performanceRating <= 2 ? 'amber' : 'blue',
      icon: <UserX className="w-4 h-4 text-[#D97706]" />,
    }));

    return {
      activeCount,
      avgPerf,
      highPerfCount: highPerformers.length,
      highPerfPct,
      pipCount: pipCohort.length,
      correlation,
      deptDistribution,
      scatterData,
      topItems,
      atRiskItems,
    };
  }, [employees, attendance]);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KPICard
          title="Average Performance Score"
          value={`${analysis.avgPerf.toFixed(2)}`}
          deltaText="Out of 5.00"
          deltaSubtext={`${analysis.activeCount} active staff`}
          deltaTone="positive"
          icon={<Award className="w-[18px] h-[18px]" />}
          sparkline={[52, 58, 60, 64, 62, 86, 70]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="High Performers (4–5)"
          value={`${analysis.highPerfPct.toFixed(1)}%`}
          deltaText={`${analysis.highPerfCount} employees`}
          deltaSubtext="exceeding expectations"
          deltaTone="positive"
          icon={<TrendingUp className="w-[18px] h-[18px]" />}
          sparkline={[38, 44, 52, 58, 66, 91, 74]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Underperforming / PIP"
          value={analysis.pipCount}
          deltaText={`${analysis.activeCount > 0 ? ((analysis.pipCount / analysis.activeCount) * 100).toFixed(1) : 0}% of roster`}
          deltaSubtext="rating ≤ 2.0"
          deltaTone={analysis.pipCount > 15 ? 'negative' : 'neutral'}
          icon={<AlertCircle className="w-[18px] h-[18px]" />}
          sparkline={[28, 34, 42, 38, 46, 76, 36]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Attendance Correlation"
          value={analysis.correlation >= 0 ? `+${analysis.correlation.toFixed(2)}` : analysis.correlation.toFixed(2)}
          deltaText={Math.abs(analysis.correlation) >= 0.2 ? 'Notable link' : 'Weak linear link'}
          deltaSubtext="Pearson r (att vs perf)"
          deltaTone={analysis.correlation >= 0 ? 'positive' : 'neutral'}
          icon={<GitCompareArrows className="w-[18px] h-[18px]" />}
          sparkline={[42, 48, 55, 63, 70, 88, 65]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
      </section>

      {/* Department Performance Distribution & Attendance-vs-Performance Scatter */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EAECEF] p-6">
          <div className="mb-4">
            <h2 className="font-display text-[17px] font-bold text-[#111827]">
              Performance Distribution by Department
            </h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5">
              Headcount split across Exceeds (4–5), Meets (3), and PIP Watch (1–2)
            </p>
          </div>
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analysis.deptDistribution}
                margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEEF2" />
                <XAxis
                  dataKey="dept"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid #2A2A2A',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="exceeds" name="High (4–5)" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
                <Bar dataKey="meets" name="Nominal (3)" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="needsSupport" name="PIP (1–2)" stackId="a" fill="#FF8A00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EAECEF] p-6">
          <div className="mb-4">
            <h2 className="font-display text-[17px] font-bold text-[#111827]">
              Attendance Rate vs. Engagement & Rating
            </h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5">
              Cross-referencing Attendance_Data reliability against Engagement Score (bubble = rating)
            </p>
          </div>
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 16, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
                <XAxis
                  type="number"
                  dataKey="attendanceRate"
                  name="Attendance %"
                  domain={[75, 100]}
                  unit="%"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="engagementScore"
                  name="Engagement"
                  domain={[30, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="performanceRating" range={[45, 220]} name="Rating" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid #2A2A2A',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                />
                <Scatter name="Employees" data={analysis.scatterData} fill="#8B5CF6" fillOpacity={0.68} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Top Performers & At-Risk Talent Spotlight Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <div className="bg-white rounded-2xl border border-[#EAECEF] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#111827]">
                Top Performers Spotlight
              </h2>
              <p className="text-[12px] text-[#6B7280] mt-0.5">
                Engagement index for highest-rated contributors
              </p>
            </div>
            <span className="text-xs font-semibold text-[#16A34A] tabular-nums">
              {analysis.highPerfCount} total stars
            </span>
          </div>
          <SegmentedProgressList items={analysis.topItems} showRowCards />
        </div>

        <div className="bg-white rounded-2xl border border-[#EAECEF] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#111827]">
                At-Risk & Coaching Watchlist
              </h2>
              <p className="text-[12px] text-[#6B7280] mt-0.5">
                Low engagement, PIP ratings, or sub-88% attendance reliability
              </p>
            </div>
            <span className="text-xs font-semibold text-[#D97706] tabular-nums">
              Priority coaching
            </span>
          </div>
          {analysis.atRiskItems.length > 0 ? (
            <SegmentedProgressList items={analysis.atRiskItems} showRowCards />
          ) : (
            <div className="py-12 text-center text-sm text-[#6B7280]">
              No active employees fall into the high-risk threshold for this slice.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
