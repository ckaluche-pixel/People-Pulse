import React, { useMemo, useState } from 'react';
import {
  CalendarCheck2,
  Clock4,
  AlertTriangle,
  Timer,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { AttendanceRecord, EmployeeRecord } from '../../types/hr';
import { KPICard } from '../KPICard';
import { StripedBarChart, StripedBarDatum } from '../StripedBarChart';
import { SegmentedProgressList, SegmentedProgressItem } from '../SegmentedProgress';

interface AttendanceAnalyticsTabProps {
  attendance: AttendanceRecord[];
  empMap: Map<string, EmployeeRecord>;
  onInspect: () => void;
  onExportCsv: () => void;
}

type OutlierFilter = 'all' | 'absences' | 'overtime' | 'late';

export const AttendanceAnalyticsTab: React.FC<AttendanceAnalyticsTabProps> = ({
  attendance,
  empMap,
  onInspect,
  onExportCsv,
}) => {
  const [search, setSearch] = useState('');
  const [outlierFilter, setOutlierFilter] = useState<OutlierFilter>('all');

  const stats = useMemo(() => {
    const totalSched = attendance.reduce((s, a) => s + a.scheduledWorkdays, 0);
    const totalPresent = attendance.reduce((s, a) => s + a.daysPresent, 0);
    const totalAbsent = attendance.reduce((s, a) => s + a.absentDays, 0);
    const totalLate = attendance.reduce((s, a) => s + a.lateArrivals, 0);
    const totalLeave = attendance.reduce((s, a) => s + a.approvedLeaveDays, 0);
    const totalOt = attendance.reduce((s, a) => s + a.overtimeHours, 0);

    const attendanceRate = totalSched > 0 ? (totalPresent / totalSched) * 100 : 0;
    const punctualityRate =
      totalPresent > 0 ? Math.max(0, ((totalPresent - Math.min(totalPresent, totalLate)) / totalPresent) * 100) : 0;
    const absenteeismRate = totalSched > 0 ? (totalAbsent / totalSched) * 100 : 0;
    const avgMonthlyOt = attendance.length > 0 ? totalOt / attendance.length : 0;
    const avgDailyHours = 8 + (avgMonthlyOt / 20);

    // Monthly trend
    const monthMap = new Map<
      string,
      { sched: number; present: number; absent: number; late: number; leave: number }
    >();
    attendance.forEach((a) => {
      const cur = monthMap.get(a.periodMonth) ?? {
        sched: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
      };
      cur.sched += a.scheduledWorkdays;
      cur.present += a.daysPresent;
      cur.absent += a.absentDays;
      cur.late += a.lateArrivals;
      cur.leave += a.approvedLeaveDays;
      monthMap.set(a.periodMonth, cur);
    });

    const monthlyTrend = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, m]) => ({
        month,
        presentPct: m.sched > 0 ? Number(((m.present / m.sched) * 100).toFixed(1)) : 0,
        absentDays: m.absent,
        lateArrivals: m.late,
        leaveDays: m.leave,
      }));

    // Department absenteeism comparison
    const deptMap = new Map<string, { sched: number; absent: number; ot: number; count: number }>();
    attendance.forEach((a) => {
      const dept = empMap.get(a.employeeId)?.department ?? 'Operations';
      const cur = deptMap.get(dept) ?? { sched: 0, absent: 0, ot: 0, count: 0 };
      cur.sched += a.scheduledWorkdays;
      cur.absent += a.absentDays;
      cur.ot += a.overtimeHours;
      cur.count += 1;
      deptMap.set(dept, cur);
    });

    const deptAbsentChart: StripedBarDatum[] = Array.from(deptMap.entries())
      .map(([name, d]) => {
        const rate = d.sched > 0 ? Number(((d.absent / d.sched) * 100).toFixed(2)) : 0;
        return {
          name,
          value: rate,
          percentageLabel: `${rate.toFixed(1)}%`,
          subLabel: `${d.absent} absent days`,
        };
      })
      .sort((a, b) => b.value - a.value);

    // Compliance Tiers
    const exemplary = attendance.filter((a) => a.attendanceRate >= 95).length;
    const nominal = attendance.filter((a) => a.attendanceRate >= 90 && a.attendanceRate < 95).length;
    const watchlist = attendance.filter((a) => a.attendanceRate < 90).length;
    const totalLogs = Math.max(attendance.length, 1);

    const complianceItems: SegmentedProgressItem[] = [
      {
        label: 'Exemplary Compliance (≥ 95%)',
        subtitle: `${exemplary.toLocaleString()} employee-month logs`,
        percentage: (exemplary / totalLogs) * 100,
        color: 'green',
        icon: <ShieldCheck className="w-4 h-4" />,
      },
      {
        label: 'Nominal Attendance (90% – 94.9%)',
        subtitle: `${nominal.toLocaleString()} employee-month logs`,
        percentage: (nominal / totalLogs) * 100,
        color: 'blue',
        icon: <CalendarCheck2 className="w-4 h-4" />,
      },
      {
        label: 'Attendance Watchlist (< 90%)',
        subtitle: `${watchlist.toLocaleString()} employee-month logs`,
        percentage: (watchlist / totalLogs) * 100,
        color: 'amber',
        icon: <AlertTriangle className="w-4 h-4" />,
      },
    ];

    const sparkAttendance =
      monthlyTrend.length >= 4
        ? monthlyTrend.slice(-7).map((m) => Math.round(m.presentPct))
        : [91, 93, 92, 95, 94, 97, 93];

    return {
      attendanceRate,
      punctualityRate,
      absenteeismRate,
      avgMonthlyOt,
      avgDailyHours,
      totalAbsent,
      totalLate,
      totalLeave,
      monthlyTrend,
      deptAbsentChart,
      complianceItems,
      sparkAttendance,
    };
  }, [attendance, empMap]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attendance
      .filter((a) => {
        if (outlierFilter === 'absences' && a.absentDays < 2) return false;
        if (outlierFilter === 'overtime' && a.overtimeHours < 6) return false;
        if (outlierFilter === 'late' && a.lateArrivals < 3) return false;
        if (!q) return true;
        const emp = empMap.get(a.employeeId);
        return (
          a.employeeId.toLowerCase().includes(q) ||
          a.periodMonth.toLowerCase().includes(q) ||
          (emp?.fullName.toLowerCase().includes(q) ?? false) ||
          (emp?.department.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => b.absentDays - a.absentDays || b.overtimeHours - a.overtimeHours);
  }, [attendance, empMap, search, outlierFilter]);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KPICard
          title="Overall Attendance Rate"
          value={`${stats.attendanceRate.toFixed(1)}%`}
          deltaText={`${attendance.length.toLocaleString()} logs`}
          deltaSubtext="scheduled vs present"
          deltaTone="positive"
          icon={<CalendarCheck2 className="w-[18px] h-[18px]" />}
          sparkline={stats.sparkAttendance}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Punctuality / On-Time"
          value={`${stats.punctualityRate.toFixed(1)}%`}
          deltaText={`${stats.totalLate.toLocaleString()} late`}
          deltaSubtext="arrivals recorded"
          deltaTone={stats.punctualityRate >= 90 ? 'positive' : 'negative'}
          icon={<Clock4 className="w-[18px] h-[18px]" />}
          sparkline={[72, 78, 76, 84, 81, 93, 86]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Absenteeism Rate"
          value={`${stats.absenteeismRate.toFixed(1)}%`}
          deltaText={`${stats.totalAbsent.toLocaleString()} days`}
          deltaSubtext={`${stats.totalLeave.toLocaleString()} approved leave`}
          deltaTone={stats.absenteeismRate > 5 ? 'negative' : 'positive'}
          icon={<AlertTriangle className="w-[18px] h-[18px]" />}
          sparkline={[32, 38, 44, 52, 60, 88, 46]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Avg Daily Hours & OT"
          value={`${stats.avgDailyHours.toFixed(1)}h`}
          deltaText={`+${stats.avgMonthlyOt.toFixed(1)}h OT`}
          deltaSubtext="per employee-month"
          deltaTone="neutral"
          icon={<Timer className="w-[18px] h-[18px]" />}
          sparkline={[40, 48, 45, 58, 65, 92, 54]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
      </section>

      {/* Monthly Trend + Compliance Tiers */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EAECEF] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#111827]">
                Monthly Attendance & Exception Trend
              </h2>
              <p className="text-[12px] text-[#6B7280] mt-0.5">
                Present percentage alongside monthly absent days & late arrival spikes
              </p>
            </div>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={stats.monthlyTrend}
                margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEEF2" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[80, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#16A34A', fontSize: 11 }}
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
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="absentDays"
                  name="Absent Days"
                  fill="#FF8A00"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                />
                <Bar
                  yAxisId="left"
                  dataKey="lateArrivals"
                  name="Late Arrivals"
                  fill="#8B5CF6"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="presentPct"
                  name="Attendance Rate (%)"
                  stroke="#22C55E"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#22C55E' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAECEF] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-[17px] font-bold text-[#111827]">
                  Compliance Tier Breakdown
                </h2>
                <p className="text-[12px] text-[#6B7280] mt-0.5">
                  Segmented monthly attendance adherence bands
                </p>
              </div>
              <span className="font-display text-xl font-bold text-[#111827] tabular-nums">
                {stats.attendanceRate.toFixed(1)}%
              </span>
            </div>
            <SegmentedProgressList items={stats.complianceItems} showRowCards />
          </div>

          <div className="mt-5 pt-4 border-t border-[#EAECEF] flex items-center justify-between text-xs text-[#6B7280]">
            <span>Approved leave days logged</span>
            <span className="font-mono-tabular font-semibold text-[#111827]">
              {stats.totalLeave.toLocaleString()} days
            </span>
          </div>
        </div>
      </section>

      {/* Department-wise Absenteeism Comparison */}
      <section className="bg-white rounded-2xl border border-[#EAECEF] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-[17px] font-bold text-[#111827]">
              Department-wise Absenteeism Rate (%)
            </h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5">
              Comparing unscheduled absence intensity across teams
            </p>
          </div>
        </div>
        <StripedBarChart
          data={stats.deptAbsentChart}
          patternId="attDeptStripes"
          accentColor="violet"
          height={240}
          unitLabel="%"
          showTopSummaryStrip={stats.deptAbsentChart.length <= 6}
        />
      </section>

      {/* Filterable Attendance Logs Table */}
      <section className="bg-white rounded-2xl border border-[#EAECEF] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#EAECEF] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-[17px] font-bold text-[#111827]">
              Attendance & Outlier Logs
            </h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5 tabular-nums">
              Showing {Math.min(filteredLogs.length, 60)} of {filteredLogs.length.toLocaleString()} matching records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#F6F7F9] rounded-xl border border-[#EAECEF] overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All Logs' },
                  { id: 'absences', label: 'Repeat Absences (2+)' },
                  { id: 'overtime', label: 'Overtime Outliers (6h+)' },
                  { id: 'late', label: 'Late Spikes (3+)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOutlierFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    outlierFilter === tab.id
                      ? 'bg-white text-[#111827] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[210px]">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, employee, month..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F7F9] border border-[#EAECEF] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111827]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAECEF] bg-[#FAFAFB] text-[12px] font-semibold text-[#6B7280]">
                <th className="py-3 px-5">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4 text-right">Present / Sched</th>
                <th className="py-3 px-4 text-right">Absent Days</th>
                <th className="py-3 px-4 text-right">Late</th>
                <th className="py-3 px-4 text-right">Overtime</th>
                <th className="py-3 px-5 text-right">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2F5] text-[13px]">
              {filteredLogs.slice(0, 60).map((log) => {
                const emp = empMap.get(log.employeeId);
                const isRepeatAbs = log.absentDays >= 2;
                const isOtOutlier = log.overtimeHours >= 6;
                return (
                  <tr key={log.attendanceId} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="py-3 px-5">
                      <div className="font-semibold text-[#111827]">
                        {emp?.fullName ?? log.employeeId}
                      </div>
                      <div className="text-[11px] text-[#6B7280] font-mono-tabular">
                        {log.employeeId} · {log.attendanceId}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#374151] font-medium">
                      {emp?.department ?? 'Operations'}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-[#6B7280]">
                      {log.periodMonth}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-[#111827]">
                      {log.daysPresent} / {log.scheduledWorkdays}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-[#111827]">
                      {log.absentDays}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-[#374151]">
                      {log.lateArrivals}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-[#374151]">
                      {log.overtimeHours.toFixed(1)}h
                    </td>
                    <td className="py-3 px-5 text-right text-xs font-semibold whitespace-nowrap">
                      {isRepeatAbs ? (
                        <span className="text-[#DC2626]">Repeat Absence</span>
                      ) : isOtOutlier ? (
                        <span className="text-[#D97706]">Overtime Outlier</span>
                      ) : (
                        <span className="text-[#16A34A]">Nominal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-[#6B7280]">
                    No attendance logs match the selected filter.
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
