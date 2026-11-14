import {
  AttendanceRecord,
  EmployeeRecord,
  RawSheetResponse,
  RecruitmentRecord,
  SchemaMappingSummary,
} from '../types/hr';

const REFERENCE_DATE = new Date('2026-11-13T00:00:00Z');

/**
 * Normalizes keys so variations like "Employee ID", "employee_id", "empId" resolve cleanly.
 */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Dynamically extracts a field from an arbitrary sheet row using candidate column names.
 */
export function resolveField(
  row: Record<string, unknown>,
  candidates: string[],
  fallback: unknown = ''
): unknown {
  const entries = Object.entries(row);
  const normalizedMap = new Map<string, unknown>();
  for (const [k, v] of entries) {
    normalizedMap.set(normalizeKey(k), v);
  }

  for (const candidate of candidates) {
    const val = normalizedMap.get(normalizeKey(candidate));
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return val;
    }
  }

  // Substring fallback if exact normalized key wasn't matched
  for (const candidate of candidates) {
    const target = normalizeKey(candidate);
    for (const [normKey, val] of normalizedMap.entries()) {
      if (
        (normKey.includes(target) || target.includes(normKey)) &&
        val !== undefined &&
        val !== null &&
        String(val).trim() !== ''
      ) {
        return val;
      }
    }
  }

  return fallback;
}

function toNumber(val: unknown, defaultVal = 0): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? defaultVal : parsed;
  }
  return defaultVal;
}

function toNullableNumber(val: unknown): number | null {
  if (val === undefined || val === null || String(val).trim() === '') return null;
  const num = toNumber(val, NaN);
  return Number.isNaN(num) ? null : num;
}

function normalizeLabel(val: unknown, fallback = 'Unspecified'): string {
  const raw = String(val ?? '').trim();
  if (!raw) return fallback;

  const lower = raw.toLowerCase();
  const specialCases: Record<string, string> = {
    it: 'IT',
    hr: 'Human Resources',
    'human resources': 'Human Resources',
    'customer support': 'Customer Support',
    operations: 'Operations',
    finance: 'Finance',
    sales: 'Sales',
    engineering: 'Engineering',
    marketing: 'Marketing',
    linkedin: 'LinkedIn',
    indeed: 'Indeed',
    'company website': 'Company Website',
    'employee referral': 'Employee Referral',
    'recruitment agency': 'Recruitment Agency',
    'in progress': 'In Progress',
    'not passed': 'Not Passed',
    'not offered': 'Not Offered',
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'on-site': 'On-site',
    hybrid: 'Hybrid',
    remote: 'Remote',
    complete: 'Complete',
    active: 'Active',
    terminated: 'Terminated',
    inactive: 'Terminated',
  };

  if (specialCases[lower]) return specialCases[lower];

  return raw
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function parseIsoDate(val: unknown): { iso: string; month: string; dateObj: Date | null } {
  const raw = String(val ?? '').trim();
  if (!raw) return { iso: '', month: '', dateObj: null };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const ymMatch = raw.match(/(\d{4}-\d{2})/);
    return { iso: raw, month: ymMatch ? ymMatch[1] : '', dateObj: null };
  }
  const iso = d.toISOString().slice(0, 10);
  const month = d.toISOString().slice(0, 7);
  return { iso, month, dateObj: d };
}

function computeTenureYears(hireDateObj: Date | null, termDateObj: Date | null): number {
  if (!hireDateObj) return 0;
  const end = termDateObj ?? REFERENCE_DATE;
  const diffMs = Math.max(0, end.getTime() - hireDateObj.getTime());
  return Number((diffMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2));
}

export function mapEmployeeData(rows: Record<string, unknown>[]): EmployeeRecord[] {
  return rows.map((row, idx) => {
    const id = String(resolveField(row, ['Employee_ID', 'Emp_ID', 'ID'], `EMP${String(idx + 1).padStart(4, '0')}`)).trim();
    const firstName = String(resolveField(row, ['First_Name', 'FirstName', 'Given_Name'], 'Team')).trim();
    const lastName = String(resolveField(row, ['Last_Name', 'LastName', 'Surname'], `Member ${idx + 1}`)).trim();
    const fullName = String(resolveField(row, ['Full_Name', 'Name', 'Employee_Name'], `${firstName} ${lastName}`)).trim();

    const hire = parseIsoDate(resolveField(row, ['Hire_Date', 'Start_Date', 'Joined_Date'], ''));
    const term = parseIsoDate(resolveField(row, ['Termination_Date', 'Exit_Date', 'End_Date'], ''));

    const rawStatus = normalizeLabel(resolveField(row, ['Employment_Status', 'Status', 'Employee_Status'], term.iso ? 'Terminated' : 'Active'));
    const status = rawStatus === 'Terminated' || rawStatus === 'Inactive' || rawStatus === 'Exited' ? 'Terminated' : 'Active';

    return {
      id,
      firstName,
      lastName,
      fullName,
      gender: normalizeLabel(resolveField(row, ['Gender'], 'Unspecified')),
      age: toNumber(resolveField(row, ['Age'], 32), 32),
      city: normalizeLabel(resolveField(row, ['City', 'Location'], 'Toronto')),
      province: normalizeLabel(resolveField(row, ['Province', 'State', 'Region'], 'Ontario')),
      provinceCode: String(resolveField(row, ['Province_Code', 'State_Code'], 'ON')).trim().toUpperCase(),
      department: normalizeLabel(resolveField(row, ['Department', 'Dept', 'Division'], 'Operations')),
      jobTitle: String(resolveField(row, ['Job_Title', 'Role', 'Position', 'Title'], 'Specialist')).trim(),
      employmentType: normalizeLabel(resolveField(row, ['Employment_Type', 'Type', 'Contract_Type'], 'Full-time')),
      workArrangement: normalizeLabel(resolveField(row, ['Work_Arrangement', 'Work_Mode', 'Remote_Status'], 'Hybrid')),
      hireDate: hire.iso,
      hireMonth: hire.month,
      terminationDate: term.iso,
      status,
      salary: toNumber(resolveField(row, ['Annual_Salary_CAD', 'Salary', 'Annual_Salary', 'Compensation'], 65000), 65000),
      managerId: String(resolveField(row, ['Manager_ID', 'Supervisor_ID'], '')).trim(),
      performanceRating: toNumber(resolveField(row, ['Performance_Rating', 'Rating', 'Performance_Score'], 3), 3),
      engagementScore: toNumber(resolveField(row, ['Engagement_Score', 'Engagement', 'Satisfaction'], 75), 75),
      exitReason: String(resolveField(row, ['Exit_Reason', 'Termination_Reason'], '')).trim(),
      tenureYears: toNullableNumber(resolveField(row, ['Tenure', 'Tenure_Years'], '')) ?? computeTenureYears(hire.dateObj, term.dateObj),
    };
  });
}

export function mapRecruitmentData(rows: Record<string, unknown>[]): RecruitmentRecord[] {
  return rows.map((row, idx) => {
    const applicationId = String(resolveField(row, ['Application_ID', 'App_ID', 'ID'], `APP${String(idx + 1).padStart(4, '0')}`)).trim();
    const candidateId = String(resolveField(row, ['Candidate_ID', 'Applicant_ID'], `CAN${String(idx + 1).padStart(4, '0')}`)).trim();
    const requisitionId = String(resolveField(row, ['Job_Requisition_ID', 'Requisition_ID', 'Req_ID'], `REQ${String((idx % 20) + 1).padStart(3, '0')}`)).trim();

    const appDate = parseIsoDate(resolveField(row, ['Application_Date', 'Applied_Date', 'Created_Date'], ''));
    const hireDate = parseIsoDate(resolveField(row, ['Hire_Date', 'Start_Date', 'Closed_Date'], ''));

    const screeningStatus = normalizeLabel(resolveField(row, ['Screening_Status', 'Screen_Status'], 'Pending'));
    const interviewStatus = normalizeLabel(resolveField(row, ['Interview_Status', 'Interviews'], 'Pending'));
    const offerStatus = normalizeLabel(resolveField(row, ['Offer_Status', 'Offer'], 'Not Offered'));
    const applicationStatus = normalizeLabel(resolveField(row, ['Application_Status', 'Status', 'Stage'], 'In Progress'));

    let timeToHireDays: number | null = null;
    if (appDate.dateObj && hireDate.dateObj) {
      const diff = Math.round((hireDate.dateObj.getTime() - appDate.dateObj.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 365) {
        timeToHireDays = diff;
      }
    }

    let stageReached: RecruitmentRecord['stageReached'] = 'Applied';
    if (applicationStatus === 'Hired' || offerStatus === 'Accepted') {
      stageReached = 'Hired';
    } else if (offerStatus === 'Declined' || offerStatus === 'Extended' || offerStatus === 'Pending') {
      stageReached = 'Offer';
    } else if (interviewStatus === 'Completed' || interviewStatus === 'Scheduled' || interviewStatus === 'In Progress') {
      stageReached = 'Interviews';
    } else if (screeningStatus === 'Passed') {
      stageReached = 'Screening';
    }

    return {
      applicationId,
      candidateId,
      requisitionId,
      applicationDate: appDate.iso,
      applicationMonth: appDate.month,
      department: normalizeLabel(resolveField(row, ['Department', 'Dept'], 'Operations')),
      position: String(resolveField(row, ['Position_Applied', 'Job_Title', 'Role', 'Position'], 'Specialist')).trim(),
      source: normalizeLabel(resolveField(row, ['Recruitment_Source', 'Source', 'Channel'], 'Company Website')),
      province: normalizeLabel(resolveField(row, ['Candidate_Province', 'Province', 'Location'], 'Ontario')),
      screeningStatus,
      interviewStatus,
      offerStatus,
      applicationStatus,
      hireDate: hireDate.iso,
      recruiterId: String(resolveField(row, ['Recruiter_ID', 'Recruiter'], 'HR01')).trim(),
      salaryOffered: toNullableNumber(resolveField(row, ['Salary_Offered_CAD', 'Salary_Offered', 'Offer_Salary'], '')),
      timeToHireDays,
      stageReached,
    };
  });
}

export function mapAttendanceData(rows: Record<string, unknown>[]): AttendanceRecord[] {
  return rows.map((row, idx) => {
    const attendanceId = String(resolveField(row, ['Attendance_ID', 'ID'], `ATT${String(idx + 1).padStart(5, '0')}`)).trim();
    const employeeId = String(resolveField(row, ['Employee_ID', 'Emp_ID'], '')).trim();
    const periodRaw = String(resolveField(row, ['Period_Month', 'Month', 'Date', 'Period'], '2026-01')).trim();
    const periodMatch = periodRaw.match(/(\d{4}-\d{2})/);
    const periodMonth = periodMatch ? periodMatch[1] : periodRaw.slice(0, 7);

    const scheduledWorkdays = Math.max(1, toNumber(resolveField(row, ['Scheduled_Workdays', 'Workdays', 'Scheduled_Days'], 20), 20));
    const daysPresent = Math.max(0, toNumber(resolveField(row, ['Days_Present', 'Present_Days', 'Attended_Days'], 19), 19));
    const absentDays = Math.max(0, toNumber(resolveField(row, ['Absent_Days', 'Absences', 'Days_Absent'], 0), 0));
    const approvedLeaveDays = Math.max(0, toNumber(resolveField(row, ['Approved_Leave_Days', 'Leave_Days', 'PTO_Days'], 0), 0));
    const lateArrivals = Math.max(0, toNumber(resolveField(row, ['Late_Arrivals', 'Late_Count', 'Late_Days'], 0), 0));
    const overtimeHours = Math.max(0, toNumber(resolveField(row, ['Overtime_Hours', 'Overtime', 'OT_Hours'], 0), 0));
    const attendanceStatus = normalizeLabel(resolveField(row, ['Attendance_Status', 'Status'], 'Complete'));

    const attendanceRate = Math.min(100, Math.round((daysPresent / scheduledWorkdays) * 1000) / 10);
    const punctualityRate =
      daysPresent > 0
        ? Math.max(0, Math.min(100, Math.round(((daysPresent - Math.min(daysPresent, lateArrivals)) / daysPresent) * 1000) / 10))
        : 100;
    const absenteeismRate = Math.min(100, Math.round((absentDays / scheduledWorkdays) * 1000) / 10);

    return {
      attendanceId,
      employeeId,
      periodMonth,
      scheduledWorkdays,
      daysPresent,
      absentDays,
      approvedLeaveDays,
      lateArrivals,
      overtimeHours,
      attendanceStatus,
      attendanceRate,
      punctualityRate,
      absenteeismRate,
    };
  });
}

export function parseSheetPayload(raw: RawSheetResponse): {
  employees: EmployeeRecord[];
  recruitment: RecruitmentRecord[];
  attendance: AttendanceRecord[];
  timestamp: string;
  schema: SchemaMappingSummary;
} {
  const dataObj = raw.data ?? {};
  // Dynamically find keys even if worksheet names vary slightly
  const dataKeys = Object.keys(dataObj);
  const empKey = dataKeys.find((k) => k.toLowerCase().includes('employee')) ?? 'Employee_Data';
  const recKey = dataKeys.find((k) => k.toLowerCase().includes('recruit')) ?? 'Recruitment_Data';
  const attKey = dataKeys.find((k) => k.toLowerCase().includes('attend')) ?? 'Attendance_Data';

  const rawEmp = Array.isArray(dataObj[empKey]) ? dataObj[empKey]! : [];
  const rawRec = Array.isArray(dataObj[recKey]) ? dataObj[recKey]! : [];
  const rawAtt = Array.isArray(dataObj[attKey]) ? dataObj[attKey]! : [];

  return {
    employees: mapEmployeeData(rawEmp),
    recruitment: mapRecruitmentData(rawRec),
    attendance: mapAttendanceData(rawAtt),
    timestamp: raw.timestamp ?? new Date().toISOString(),
    schema: {
      employeeKeys: rawEmp[0] ? Object.keys(rawEmp[0]) : [],
      recruitmentKeys: rawRec[0] ? Object.keys(rawRec[0]) : [],
      attendanceKeys: rawAtt[0] ? Object.keys(rawAtt[0]) : [],
    },
  };
}
