import {
  AttendanceRecord,
  EmployeeRecord,
  FilterState,
  NavTab,
  RecommendationItem,
  RecruitmentRecord,
} from '../types/hr';

export interface JoinedEmployeePerformance {
  employee: EmployeeRecord;
  attendanceRate: number;
  punctualityRate: number;
  absenteeismRate: number;
  totalAbsentDays: number;
  totalLateArrivals: number;
  totalOvertimeHours: number;
  monthsTracked: number;
}

export function getUniqueDepartments(
  employees: EmployeeRecord[],
  recruitment: RecruitmentRecord[]
): string[] {
  const set = new Set<string>();
  employees.forEach((e) => e.department && set.add(e.department));
  recruitment.forEach((r) => r.department && set.add(r.department));
  return ['All Departments', ...Array.from(set).sort()];
}

export function getUniqueMonths(
  attendance: AttendanceRecord[],
  recruitment: RecruitmentRecord[]
): string[] {
  const set = new Set<string>();
  attendance.forEach((a) => a.periodMonth && set.add(a.periodMonth));
  recruitment.forEach((r) => r.applicationMonth && set.add(r.applicationMonth));
  return ['All Months', ...Array.from(set).sort().reverse()];
}

export function filterDatasets(
  employees: EmployeeRecord[],
  recruitment: RecruitmentRecord[],
  attendance: AttendanceRecord[],
  filters: FilterState
) {
  const dept = filters.department;
  const month = filters.month;

  const filteredEmployees = employees.filter((e) => {
    if (dept !== 'All Departments' && e.department !== dept) return false;
    return true;
  });

  const empMap = new Map<string, EmployeeRecord>();
  employees.forEach((e) => empMap.set(e.id, e));

  const filteredRecruitment = recruitment.filter((r) => {
    if (dept !== 'All Departments' && r.department !== dept) return false;
    if (month !== 'All Months' && r.applicationMonth !== month) return false;
    return true;
  });

  const filteredAttendance = attendance.filter((a) => {
    if (month !== 'All Months' && a.periodMonth !== month) return false;
    if (dept !== 'All Departments') {
      const emp = empMap.get(a.employeeId);
      if (!emp || emp.department !== dept) return false;
    }
    return true;
  });

  return {
    filteredEmployees,
    filteredRecruitment,
    filteredAttendance,
    empMap,
  };
}

export function computePearsonCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return Number((num / den).toFixed(2));
}

export function joinPerformanceAndAttendance(
  employees: EmployeeRecord[],
  attendance: AttendanceRecord[]
): JoinedEmployeePerformance[] {
  const grouped = new Map<
    string,
    {
      scheduled: number;
      present: number;
      absent: number;
      late: number;
      overtime: number;
      months: number;
    }
  >();

  for (const rec of attendance) {
    const cur = grouped.get(rec.employeeId) ?? {
      scheduled: 0,
      present: 0,
      absent: 0,
      late: 0,
      overtime: 0,
      months: 0,
    };
    cur.scheduled += rec.scheduledWorkdays;
    cur.present += rec.daysPresent;
    cur.absent += rec.absentDays;
    cur.late += rec.lateArrivals;
    cur.overtime += rec.overtimeHours;
    cur.months += 1;
    grouped.set(rec.employeeId, cur);
  }

  return employees
    .filter((e) => e.status === 'Active')
    .map((emp) => {
      const agg = grouped.get(emp.id);
      if (!agg || agg.scheduled === 0) {
        return {
          employee: emp,
          attendanceRate: 95,
          punctualityRate: 94,
          absenteeismRate: 2.5,
          totalAbsentDays: 0,
          totalLateArrivals: 0,
          totalOvertimeHours: 0,
          monthsTracked: 0,
        };
      }
      const attendanceRate = Math.min(100, Number(((agg.present / agg.scheduled) * 100).toFixed(1)));
      const punctualityRate =
        agg.present > 0
          ? Math.max(0, Math.min(100, Number((((agg.present - Math.min(agg.present, agg.late)) / agg.present) * 100).toFixed(1))))
          : 100;
      const absenteeismRate = Number(((agg.absent / agg.scheduled) * 100).toFixed(1));
      return {
        employee: emp,
        attendanceRate,
        punctualityRate,
        absenteeismRate,
        totalAbsentDays: agg.absent,
        totalLateArrivals: agg.late,
        totalOvertimeHours: Number(agg.overtime.toFixed(1)),
        monthsTracked: agg.months,
      };
    });
}

export function generateExecutiveRecommendations(
  employees: EmployeeRecord[],
  recruitment: RecruitmentRecord[],
  attendance: AttendanceRecord[],
  empMap: Map<string, EmployeeRecord>
): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];

  // 1. Department Absenteeism & Punctuality Anomaly Detection
  const deptAtt = new Map<
    string,
    { scheduled: number; absent: number; present: number; late: number; overtime: number; count: number }
  >();
  let totalScheduled = 0;
  let totalAbsent = 0;

  for (const a of attendance) {
    const emp = empMap.get(a.employeeId);
    const dept = emp?.department ?? 'Operations';
    const cur = deptAtt.get(dept) ?? {
      scheduled: 0,
      absent: 0,
      present: 0,
      late: 0,
      overtime: 0,
      count: 0,
    };
    cur.scheduled += a.scheduledWorkdays;
    cur.absent += a.absentDays;
    cur.present += a.daysPresent;
    cur.late += a.lateArrivals;
    cur.overtime += a.overtimeHours;
    cur.count += 1;
    deptAtt.set(dept, cur);
    totalScheduled += a.scheduledWorkdays;
    totalAbsent += a.absentDays;
  }

  const orgAbsentRate = totalScheduled > 0 ? (totalAbsent / totalScheduled) * 100 : 0;
  let worstDept = '';
  let worstAbsentRate = -1;
  let worstLateAvg = 0;
  let highestOtDept = '';
  let highestOtPerRecord = -1;

  for (const [dept, stats] of deptAtt.entries()) {
    const absRate = stats.scheduled > 0 ? (stats.absent / stats.scheduled) * 100 : 0;
    const otAvg = stats.count > 0 ? stats.overtime / stats.count : 0;
    if (absRate > worstAbsentRate) {
      worstAbsentRate = absRate;
      worstDept = dept;
      worstLateAvg = stats.count > 0 ? stats.late / stats.count : 0;
    }
    if (otAvg > highestOtPerRecord) {
      highestOtPerRecord = otAvg;
      highestOtDept = dept;
    }
  }

  if (worstDept && worstAbsentRate > 0) {
    const deltaPts = (worstAbsentRate - orgAbsentRate).toFixed(1);
    recommendations.push({
      id: 'rec-absenteeism',
      priority: worstAbsentRate > orgAbsentRate * 1.15 ? 'Immediate Action' : 'High Impact',
      targetArea: worstDept,
      title: `Curb Elevated Absenteeism in ${worstDept}`,
      dataInsight: `${worstDept} records a ${worstAbsentRate.toFixed(1)}% absenteeism rate (${Number(deltaPts) >= 0 ? `+${deltaPts} pts` : `${deltaPts} pts`} vs. ${orgAbsentRate.toFixed(1)}% org baseline) and ${worstLateAvg.toFixed(1)} avg monthly late arrivals.`,
      recommendedAction:
        'Audit shift handoffs, introduce flexible morning start windows, and schedule manager 1:1 wellness check-ins for employees with 2+ monthly absences.',
      expectedOutcome: 'Target 1.5–2.2 percentage point absenteeism reduction within 60 days and stabilize SLA coverage.',
      metricTag: `${worstAbsentRate.toFixed(1)}% Absence`,
    });
  }

  // 2. Recruitment Funnel Bottleneck & Offer Acceptance Analysis
  const totalApps = recruitment.length;
  const passedScreening = recruitment.filter((r) => r.screeningStatus === 'Passed').length;
  const completedInterviews = recruitment.filter(
    (r) => r.interviewStatus === 'Completed' || r.stageReached === 'Offer' || r.stageReached === 'Hired'
  ).length;
  const offered = recruitment.filter(
    (r) => r.offerStatus === 'Accepted' || r.offerStatus === 'Declined' || r.stageReached === 'Offer' || r.stageReached === 'Hired'
  ).length;
  const accepted = recruitment.filter((r) => r.offerStatus === 'Accepted' || r.applicationStatus === 'Hired').length;
  const declined = recruitment.filter((r) => r.offerStatus === 'Declined').length;

  const screenToInterviewDrop =
    passedScreening > 0 ? ((passedScreening - completedInterviews) / passedScreening) * 100 : 0;
  const offerAcceptRate = offered > 0 ? (accepted / offered) * 100 : 0;

  if (totalApps > 0) {
    if (offerAcceptRate < 75 && declined > 0) {
      recommendations.push({
        id: 'rec-offer-decline',
        priority: 'Immediate Action',
        targetArea: 'Talent Acquisition',
        title: 'Address Offer Decline Leakage at Final Stage',
        dataInsight: `Out of ${offered} formal offers extended, ${declined} were declined (${offerAcceptRate.toFixed(1)}% offer acceptance rate across ${totalApps} candidates).`,
        recommendedAction:
          'Benchmark compensation bands against Q4 regional market percentiles and implement pre-offer expectation alignment calls before issuing written offers.',
        expectedOutcome: 'Lift offer acceptance above 82% and recover ~12–18 days of wasted recruiter interview capacity.',
        metricTag: `${offerAcceptRate.toFixed(1)}% Acceptance`,
      });
    } else if (screenToInterviewDrop > 25) {
      recommendations.push({
        id: 'rec-interview-bottleneck',
        priority: 'High Impact',
        targetArea: 'Recruitment Pipeline',
        title: 'Eliminate Screening-to-Interview Scheduling Lag',
        dataInsight: `${screenToInterviewDrop.toFixed(1)}% of screened candidates (${passedScreening - completedInterviews} of ${passedScreening}) stall before completing interviews.`,
        recommendedAction:
          'Deploy automated self-scheduling interview slots and enforce a 48-hour hiring manager SLA on candidate scorecards.',
        expectedOutcome: 'Compress average time-to-hire by 6–9 days and reduce candidate withdrawal mid-funnel.',
        metricTag: `${screenToInterviewDrop.toFixed(1)}% Drop-off`,
      });
    }
  }

  // 3. High-Performer Attrition Risk (Performance >= 4 with Low Engagement < 65 or High Overtime)
  const joined = joinPerformanceAndAttendance(employees, attendance);
  const atRiskStars = joined.filter(
    (j) =>
      j.employee.performanceRating >= 4 &&
      (j.employee.engagementScore < 65 || (j.monthsTracked > 0 && j.totalOvertimeHours / j.monthsTracked >= 6))
  );

  const terminatedCount = employees.filter((e) => e.status === 'Terminated').length;
  const attritionRate = employees.length > 0 ? (terminatedCount / employees.length) * 100 : 0;

  if (atRiskStars.length > 0) {
    const topDeptRisk = new Map<string, number>();
    atRiskStars.forEach((s) =>
      topDeptRisk.set(s.employee.department, (topDeptRisk.get(s.employee.department) ?? 0) + 1)
    );
    const primaryRiskDept =
      Array.from(topDeptRisk.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Operations';

    recommendations.push({
      id: 'rec-star-retention',
      priority: 'High Impact',
      targetArea: primaryRiskDept,
      title: 'Retain High-Performing Talent Showing Burnout Signals',
      dataInsight: `${atRiskStars.length} active top performers (Rating ≥ 4.0) exhibit engagement below 65 or >6h/mo overtime, led by ${primaryRiskDept} (${attritionRate.toFixed(1)}% org attrition).`,
      recommendedAction:
        'Rebalance workload distribution in peak teams, fast-track merit/promotion reviews, and assign retention stay-interviews within 14 days.',
      expectedOutcome: 'Prevent regrettable turnover among top-quartile contributors and protect institutional knowledge.',
      metricTag: `${atRiskStars.length} Stars at Risk`,
    });
  }

  // 4. Overtime Capacity & Workload Balancing Watchlist
  if (highestOtDept && highestOtPerRecord > 2) {
    recommendations.push({
      id: 'rec-overtime-load',
      priority: 'Watchlist',
      targetArea: highestOtDept,
      title: `Monitor Overtime Concentration in ${highestOtDept}`,
      dataInsight: `${highestOtDept} averages ${highestOtPerRecord.toFixed(1)} overtime hours per employee-month—the highest intensity across all departments.`,
      recommendedAction:
        'Evaluate contractor buffer hiring or cross-training capacity during peak monthly cycles before fatigue drives unscheduled leave.',
      expectedOutcome: 'Contain overtime spend growth by 15% while maintaining output quality.',
      metricTag: `${highestOtPerRecord.toFixed(1)}h Avg OT`,
    });
  }

  // 5. Underperforming / PIP Coaching Pipeline
  const pipEmployees = employees.filter((e) => e.status === 'Active' && e.performanceRating <= 2);
  if (pipEmployees.length > 0) {
    const avgEngPip =
      pipEmployees.reduce((s, e) => s + e.engagementScore, 0) / pipEmployees.length;
    recommendations.push({
      id: 'rec-pip-enablement',
      priority: 'Watchlist',
      targetArea: 'Performance & L&D',
      title: 'Structured 90-Day Coaching for Underperforming Cohort',
      dataInsight: `${pipEmployees.length} active employees hold a Performance Rating ≤ 2.0 with an average engagement score of ${avgEngPip.toFixed(0)}/100.`,
      recommendedAction:
        'Launch milestone-based 90-day enablement plans paired with peer mentoring and bi-weekly manager calibration.',
      expectedOutcome: 'Convert 40%+ of underperforming staff back to nominal Rating 3+ performance within one quarter.',
      metricTag: `${pipEmployees.length} Active PIP`,
    });
  }

  return recommendations;
}

export function buildExecutiveBriefText(
  employees: EmployeeRecord[],
  recruitment: RecruitmentRecord[],
  attendance: AttendanceRecord[],
  recommendations: RecommendationItem[],
  filters: FilterState
): string {
  const active = employees.filter((e) => e.status === 'Active');
  const terminated = employees.filter((e) => e.status === 'Terminated');
  const attrition = employees.length > 0 ? ((terminated.length / employees.length) * 100).toFixed(1) : '0.0';
  const avgTenure =
    active.length > 0 ? (active.reduce((s, e) => s + e.tenureYears, 0) / active.length).toFixed(1) : '0.0';

  const totalSched = attendance.reduce((s, a) => s + a.scheduledWorkdays, 0);
  const totalPres = attendance.reduce((s, a) => s + a.daysPresent, 0);
  const attRate = totalSched > 0 ? ((totalPres / totalSched) * 100).toFixed(1) : '0.0';

  const offered = recruitment.filter((r) => r.offerStatus === 'Accepted' || r.offerStatus === 'Declined').length;
  const accepted = recruitment.filter((r) => r.offerStatus === 'Accepted' || r.applicationStatus === 'Hired').length;
  const offerAccept = offered > 0 ? ((accepted / offered) * 100).toFixed(1) : '0.0';

  const avgPerf =
    active.length > 0
      ? (active.reduce((s, e) => s + e.performanceRating, 0) / active.length).toFixed(2)
      : '0.00';

  const lines = [
    `PEOPLE PULSE — EXECUTIVE WORKFORCE BRIEF`,
    `Scope: ${filters.department} | Period: ${filters.month}`,
    `Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    ``,
    `KEY WORKFORCE METRICS`,
    `• Active Headcount: ${active.length} (${attrition}% historical attrition, ${avgTenure} yrs avg tenure)`,
    `• Attendance Compliance: ${attRate}% across ${attendance.length.toLocaleString()} monthly logs`,
    `• Recruitment Pipeline: ${recruitment.length} candidates (${offerAccept}% offer acceptance)`,
    `• Performance Index: ${avgPerf} / 5.00 average rating`,
    ``,
    `PRIORITIZED MANAGEMENT ACTIONS`,
    ...recommendations.map(
      (r, idx) =>
        `${idx + 1}. [${r.priority.toUpperCase()} — ${r.targetArea}] ${r.title}\n   Insight: ${r.dataInsight}\n   Action: ${r.recommendedAction}\n   Outcome: ${r.expectedOutcome}`
    ),
  ];

  return lines.join('\n');
}

export function exportTabCsv(
  tab: NavTab,
  employees: EmployeeRecord[],
  recruitment: RecruitmentRecord[],
  attendance: AttendanceRecord[]
) {
  let headers: string[] = [];
  let rows: (string | number)[][] = [];
  let filename = `people-pulse-${tab}.csv`;

  if (tab === 'employees' || tab === 'performance' || tab === 'executive') {
    headers = [
      'Employee ID',
      'Full Name',
      'Department',
      'Job Title',
      'Status',
      'Work Arrangement',
      'Tenure (Yrs)',
      'Salary (CAD)',
      'Performance Rating',
      'Engagement Score',
    ];
    rows = employees.map((e) => [
      e.id,
      e.fullName,
      e.department,
      e.jobTitle,
      e.status,
      e.workArrangement,
      e.tenureYears,
      e.salary,
      e.performanceRating,
      e.engagementScore,
    ]);
  } else if (tab === 'attendance') {
    headers = [
      'Attendance ID',
      'Employee ID',
      'Month',
      'Scheduled Days',
      'Days Present',
      'Absent Days',
      'Leave Days',
      'Late Arrivals',
      'Overtime Hours',
      'Attendance Rate %',
    ];
    rows = attendance.map((a) => [
      a.attendanceId,
      a.employeeId,
      a.periodMonth,
      a.scheduledWorkdays,
      a.daysPresent,
      a.absentDays,
      a.approvedLeaveDays,
      a.lateArrivals,
      a.overtimeHours,
      a.attendanceRate,
    ]);
  } else {
    headers = [
      'Application ID',
      'Candidate ID',
      'Requisition ID',
      'Department',
      'Position',
      'Source',
      'Stage Reached',
      'Screening',
      'Interview',
      'Offer',
      'Application Status',
    ];
    rows = recruitment.map((r) => [
      r.applicationId,
      r.candidateId,
      r.requisitionId,
      r.department,
      r.position,
      r.source,
      r.stageReached,
      r.screeningStatus,
      r.interviewStatus,
      r.offerStatus,
      r.applicationStatus,
    ]);
  }

  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const csvContent = [headers.join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
