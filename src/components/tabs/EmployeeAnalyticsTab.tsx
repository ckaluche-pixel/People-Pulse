import React, { useMemo, useState } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  Building2,
  Search,
  ArrowUpDown,
  Briefcase,
  Laptop,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { EmployeeRecord } from '../../types/hr';
import { KPICard } from '../KPICard';
import { StripedBarChart, StripedBarDatum } from '../StripedBarChart';
import { SegmentedProgressList, SegmentedProgressItem } from '../SegmentedProgress';

interface EmployeeAnalyticsTabProps {
  employees: EmployeeRecord[];
  onInspect: () => void;
  onExportCsv: () => void;
}

type SortKey = 'fullName' | 'department' | 'tenureYears' | 'salary' | 'performanceRating';

export const EmployeeAnalyticsTab: React.FC<EmployeeAnalyticsTabProps> = ({
  employees,
  onInspect,
  onExportCsv,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Terminated'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('tenureYears');
  const [sortAsc, setSortAsc] = useState(false);

  const metrics = useMemo(() => {
    const total = employees.length;
    const activeList = employees.filter((e) => e.status === 'Active');
    const terminatedList = employees.filter((e) => e.status === 'Terminated');
    const attritionRate = total > 0 ? (terminatedList.length / total) * 100 : 0;
    const activeRate = total > 0 ? (activeList.length / total) * 100 : 0;
    const avgTenure =
      activeList.length > 0
        ? activeList.reduce((s, e) => s + e.tenureYears, 0) / activeList.length
        : 0;
    const avgSalary =
      activeList.length > 0
        ? activeList.reduce((s, e) => s + e.salary, 0) / activeList.length
        : 0;

    const deptCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    const modeCounts = new Map<string, number>();
    const hireYearCounts = new Map<string, number>();

    employees.forEach((e) => {
      deptCounts.set(e.department, (deptCounts.get(e.department) ?? 0) + 1);
      if (e.status === 'Active') {
        typeCounts.set(e.employmentType, (typeCounts.get(e.employmentType) ?? 0) + 1);
        modeCounts.set(e.workArrangement, (modeCounts.get(e.workArrangement) ?? 0) + 1);
      }
      if (e.hireDate) {
        const yr = e.hireDate.slice(0, 4);
        if (/^\d{4}$/.test(yr)) {
          hireYearCounts.set(yr, (hireYearCounts.get(yr) ?? 0) + 1);
        }
      }
    });

    const deptChart: StripedBarDatum[] = Array.from(deptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        value: count,
        percentageLabel: `${total > 0 ? Math.round((count / total) * 100) : 0}%`,
        subLabel: `${count} staff`,
      }));

    const activeTotal = Math.max(activeList.length, 1);
    const typeItems: SegmentedProgressItem[] = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count], idx) => ({
        label,
        subtitle: `${count} active employees`,
        percentage: (count / activeTotal) * 100,
        color: idx === 0 ? 'green' : idx === 1 ? 'blue' : 'violet',
        icon: <Briefcase className="w-4 h-4" />,
      }));

    const modeItems: SegmentedProgressItem[] = Array.from(modeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count], idx) => ({
        label,
        subtitle: `${count} active employees`,
        percentage: (count / activeTotal) * 100,
        color: idx === 0 ? 'blue' : idx === 1 ? 'green' : 'amber',
        icon: <Laptop className="w-4 h-4" />,
      }));

    const hiringTrend = Array.from(hireYearCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, hires]) => ({ year, hires }));

    const sparklineHires =
      hiringTrend.length >= 5
        ? hiringTrend.slice(-7).map((x) => x.hires)
        : [22, 34, 41, 58, 49, 76, 54];

    return {
      total,
      activeCount: activeList.length,
      terminatedCount: terminatedList.length,
      attritionRate,
      activeRate,
      avgTenure,
      avgSalary,
      deptCount: deptCounts.size,
      deptChart,
      typeItems,
      modeItems,
      hiringTrend,
      sparklineHires,
    };
  }, [employees]);

  const filteredDirectory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = employees.filter((e) => {
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [employees, search, statusFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'fullName' || key === 'department');
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KPICard
          title="Total Headcount"
          value={metrics.activeCount.toLocaleString()}
          deltaText={`${metrics.total.toLocaleString()} total`}
          deltaSubtext="incl. historical exits"
          deltaTone="positive"
          icon={<Users className="w-[18px] h-[18px]" />}
          sparkline={metrics.sparklineHires}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Retention & Attrition"
          value={`${metrics.activeRate.toFixed(1)}%`}
          deltaText={`${metrics.attritionRate.toFixed(1)}% attrition`}
          deltaSubtext={`${metrics.terminatedCount} exits`}
          deltaTone={metrics.attritionRate > 15 ? 'negative' : 'positive'}
          icon={<UserCheck className="w-[18px] h-[18px]" />}
          sparkline={[45, 52, 49, 64, 58, 86, 68]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Average Tenure"
          value={`${metrics.avgTenure.toFixed(1)} yrs`}
          deltaText={`$${Math.round(metrics.avgSalary / 1000)}k CAD`}
          deltaSubtext="avg base salary"
          deltaTone="positive"
          icon={<Clock className="w-[18px] h-[18px]" />}
          sparkline={[30, 42, 54, 66, 72, 92, 61]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
        <KPICard
          title="Active Departments"
          value={metrics.deptCount}
          deltaText={`${metrics.deptChart[0]?.name ?? 'Ops'}`}
          deltaSubtext="largest unit"
          deltaTone="neutral"
          icon={<Building2 className="w-[18px] h-[18px]" />}
          sparkline={[38, 44, 50, 62, 74, 88, 56]}
          onInspect={onInspect}
          onExport={onExportCsv}
        />
      </section>

      {/* Main Bento Chart Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EAECEF] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#111827]">
                Headcount by Department
              </h2>
              <p className="text-[12px] text-[#6B7280] mt-0.5">
                Distribution across normalized organizational divisions
              </p>
            </div>
            <span className="text-xs font-medium text-[#6B7280] tabular-nums">
              {metrics.total} records
            </span>
          </div>
          <StripedBarChart
            data={metrics.deptChart}
            patternId="empDeptStripes"
            accentColor="violet"
            height={260}
            showTopSummaryStrip={metrics.deptChart.length <= 6}
          />
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAECEF] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-[17px] font-bold text-[#111827]">
                  Workforce Composition
                </h2>
                <p className="text-[12px] text-[#6B7280] mt-0.5">
                  Contract classification & work arrangement split
                </p>
              </div>
              <span className="font-display text-lg font-bold text-[#111827] tabular-nums">
                {metrics.activeCount} active
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold text-[#6B7280] mb-2">Employment Type</div>
                <SegmentedProgressList items={metrics.typeItems} showRowCards />
              </div>

              <div>
                <div className="text-xs font-semibold text-[#6B7280] mb-2">Work Arrangement</div>
                <SegmentedProgressList items={metrics.modeItems} showRowCards={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hiring Trend Over Time */}
      <section className="bg-white rounded-2xl border border-[#EAECEF] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-[17px] font-bold text-[#111827]">
              Annual Hiring & Tenure Cohort Trend
            </h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5">
              Historical intake volume by hire year across the active & alumni roster
            </p>
          </div>
          <div className="text-xs text-[#6B7280] tabular-nums">
            {metrics.hiringTrend.length} annual cohorts tracked
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.hiringTrend} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="hireAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEEF2" />
              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
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
                itemStyle={{ color: '#4ADE80' }}
              />
              <Area
                type="monotone"
                dataKey="hires"
                name="Hires"
                stroke="#16A34A"
                strokeWidth={2.5}
                fill="url(#hireAreaGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Searchable, Sortable Employee Directory */}
      <section className="bg-white rounded-2xl border border-[#EAECEF] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#EAECEF] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-[17px] font-bold text-[#111827]">
              Employee Directory
            </h2>
            <p className="text-[12px] text-[#6B7280] mt-0.5 tabular-nums">
              Showing {Math.min(filteredDirectory.length, 60)} of {filteredDirectory.length} matching records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#F6F7F9] rounded-xl border border-[#EAECEF]">
              {(['All', 'Active', 'Terminated'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-white text-[#111827] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID, role, city..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F7F9] border border-[#EAECEF] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111827]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAECEF] bg-[#FAFAFB] text-[12px] font-semibold text-[#6B7280]">
                <th className="py-3 px-5">
                  <button
                    type="button"
                    onClick={() => toggleSort('fullName')}
                    className="inline-flex items-center gap-1 hover:text-[#111827] cursor-pointer"
                  >
                    Employee <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('department')}
                    className="inline-flex items-center gap-1 hover:text-[#111827] cursor-pointer"
                  >
                    Department <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Mode & Location</th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('tenureYears')}
                    className="inline-flex items-center gap-1 hover:text-[#111827] cursor-pointer"
                  >
                    Tenure <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('salary')}
                    className="inline-flex items-center gap-1 hover:text-[#111827] cursor-pointer"
                  >
                    Salary <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('performanceRating')}
                    className="inline-flex items-center gap-1 hover:text-[#111827] cursor-pointer"
                  >
                    Rating <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2F5] text-[13px]">
              {filteredDirectory.slice(0, 60).map((emp) => (
                <tr key={emp.id} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-[#111827]">{emp.fullName}</div>
                    <div className="text-[11px] text-[#6B7280] font-mono-tabular">
                      {emp.id} · {emp.jobTitle}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#374151] font-medium">{emp.department}</td>
                  <td className="py-3 px-4 text-[#6B7280]">
                    {emp.workArrangement} · {emp.city}, {emp.provinceCode}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-[#111827]">
                    {emp.tenureYears.toFixed(1)}y
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-[#111827]">
                    ${emp.salary.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-[#111827]">
                    {emp.performanceRating.toFixed(1)} / 5
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        emp.status === 'Active' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredDirectory.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-[#6B7280]">
                    No employees match the current search or filter criteria.
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
