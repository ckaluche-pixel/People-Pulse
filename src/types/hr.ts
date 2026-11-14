export type NavTab =
  | 'employees'
  | 'attendance'
  | 'recruitment'
  | 'performance'
  | 'executive';

export interface EmployeeRecord {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  age: number;
  city: string;
  province: string;
  provinceCode: string;
  department: string;
  jobTitle: string;
  employmentType: string;
  workArrangement: string;
  hireDate: string;
  hireMonth: string;
  terminationDate: string;
  status: 'Active' | 'Terminated' | string;
  salary: number;
  managerId: string;
  performanceRating: number;
  engagementScore: number;
  exitReason: string;
  tenureYears: number;
}

export interface RecruitmentRecord {
  applicationId: string;
  candidateId: string;
  requisitionId: string;
  applicationDate: string;
  applicationMonth: string;
  department: string;
  position: string;
  source: string;
  province: string;
  screeningStatus: string;
  interviewStatus: string;
  offerStatus: string;
  applicationStatus: string;
  hireDate: string;
  recruiterId: string;
  salaryOffered: number | null;
  timeToHireDays: number | null;
  stageReached: 'Applied' | 'Screening' | 'Interviews' | 'Offer' | 'Hired';
}

export interface AttendanceRecord {
  attendanceId: string;
  employeeId: string;
  periodMonth: string;
  scheduledWorkdays: number;
  daysPresent: number;
  absentDays: number;
  approvedLeaveDays: number;
  lateArrivals: number;
  overtimeHours: number;
  attendanceStatus: string;
  attendanceRate: number;
  punctualityRate: number;
  absenteeismRate: number;
}

export interface RawSheetResponse {
  status?: string;
  timestamp?: string;
  data?: {
    Employee_Data?: Record<string, unknown>[];
    Recruitment_Data?: Record<string, unknown>[];
    Attendance_Data?: Record<string, unknown>[];
    [key: string]: Record<string, unknown>[] | undefined;
  };
}

export interface FilterState {
  department: string;
  month: string;
}

export interface SchemaMappingSummary {
  employeeKeys: string[];
  recruitmentKeys: string[];
  attendanceKeys: string[];
}

export type RecommendationPriority = 'Immediate Action' | 'High Impact' | 'Watchlist';

export interface RecommendationItem {
  id: string;
  priority: RecommendationPriority;
  targetArea: string;
  title: string;
  dataInsight: string;
  recommendedAction: string;
  expectedOutcome: string;
  metricTag: string;
}
