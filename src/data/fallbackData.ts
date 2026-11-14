import { RawSheetResponse } from '../types/hr';

/**
 * Deterministic fallback dataset matching the exact Google Sheets schema.
 * Used ONLY when the live Apps Script endpoint is unreachable or fails CORS.
 */
export function getFallbackSheetPayload(): RawSheetResponse {
  const departments = ['Operations', 'Sales', 'IT', 'Customer Support', 'Finance', 'Human Resources'];
  const titles: Record<string, string[]> = {
    Operations: ['Operations Specialist', 'Operations Coordinator', 'Logistics Lead'],
    Sales: ['Account Executive', 'Sales Representative', 'Regional Sales Manager'],
    IT: ['IT Analyst', 'Systems Engineer', 'Cloud Architect'],
    'Customer Support': ['Support Specialist', 'Customer Success Lead', 'Technical Support Rep'],
    Finance: ['Financial Analyst', 'Senior Accountant', 'FP&A Manager'],
    'Human Resources': ['HR Generalist', 'Talent Partner', 'People Operations Lead'],
  };
  const cities = [
    { city: 'Toronto', province: 'Ontario', code: 'ON' },
    { city: 'Ottawa', province: 'Ontario', code: 'ON' },
    { city: 'Vancouver', province: 'British Columbia', code: 'BC' },
    { city: 'Calgary', province: 'Alberta', code: 'AB' },
    { city: 'Montréal', province: 'Quebec', code: 'QC' },
  ];
  const firstNames = ['Noah', 'Harper', 'Sarah', 'Fatima', 'Zoe', 'David', 'Aisha', 'Liam', 'Chloe', 'Lucas', 'Maya', 'Ethan', 'Nadia', 'Oliver'];
  const lastNames = ['Ahmed', 'Dubois', 'Moore', 'Scott', 'Campbell', 'Young', 'Patel', 'Chen', 'Tremblay', 'Nguyen', 'Martin', 'Wilson'];
  const workModes = ['Hybrid', 'Remote', 'On-site'];
  const empTypes = ['Full-time', 'Full-time', 'Full-time', 'Part-time', 'Contract'];
  const exitReasons = ['Career Growth', 'Relocation', 'Compensation', 'Personal Reasons'];

  const employees: Record<string, unknown>[] = [];
  for (let i = 1; i <= 120; i++) {
    const dept = departments[i % departments.length];
    const deptTitles = titles[dept];
    const loc = cities[i % cities.length];
    const isTerminated = i % 9 === 0;
    const hireYear = 2018 + (i % 8);
    const hireMonth = String((i % 12) + 1).padStart(2, '0');
    const hireDay = String((i % 25) + 1).padStart(2, '0');
    const rating = i % 11 === 0 ? 2 : i % 4 === 0 ? 5 : i % 3 === 0 ? 4 : 3;
    const engagement = rating >= 4 ? 78 + (i % 18) : rating === 2 ? 44 + (i % 18) : 60 + (i % 22);

    employees.push({
      Employee_ID: `EMP${String(i).padStart(4, '0')}`,
      First_Name: firstNames[i % firstNames.length],
      Last_Name: lastNames[(i * 3) % lastNames.length],
      Gender: i % 5 === 0 ? 'Non-binary' : i % 2 === 0 ? 'Female' : 'Male',
      Age: 24 + (i % 30),
      City: loc.city,
      Province: loc.province,
      Province_Code: loc.code,
      Department: dept,
      Job_Title: deptTitles[i % deptTitles.length],
      Employment_Type: empTypes[i % empTypes.length],
      Work_Arrangement: workModes[i % workModes.length],
      Hire_Date: `${hireYear}-${hireMonth}-${hireDay}T00:00:00.000Z`,
      Termination_Date: isTerminated ? `2026-0${(i % 8) + 1}-15T00:00:00.000Z` : '',
      Employment_Status: isTerminated ? 'Terminated' : 'Active',
      Annual_Salary_CAD: 54000 + (i % 12) * 5500,
      Manager_ID: `EMP${String(((i % 12) + 1)).padStart(4, '0')}`,
      Performance_Rating: rating,
      Engagement_Score: engagement,
      Exit_Reason: isTerminated ? exitReasons[i % exitReasons.length] : '',
    });
  }

  const sources = ['LinkedIn', 'Indeed', 'Company Website', 'Employee Referral', 'Recruitment Agency'];
  const recruitment: Record<string, unknown>[] = [];
  for (let i = 1; i <= 90; i++) {
    const dept = departments[i % departments.length];
    const deptTitles = titles[dept];
    const appMonthNum = ((i % 9) + 1);
    const appDate = `2026-0${appMonthNum}-${String((i % 20) + 5).padStart(2, '0')}T00:00:00.000Z`;
    const passedScreen = i % 5 !== 0;
    const completedInterview = passedScreen && i % 3 !== 0;
    const offered = completedInterview && i % 2 === 0;
    const accepted = offered && i % 4 !== 0;
    const declined = offered && !accepted;

    recruitment.push({
      Application_ID: `APP${String(i).padStart(4, '0')}`,
      Candidate_ID: `CAN${String(i).padStart(4, '0')}`,
      Job_Requisition_ID: `REQ${String((i % 18) + 1).padStart(3, '0')}`,
      Application_Date: appDate,
      Department: dept,
      Position_Applied: deptTitles[i % deptTitles.length],
      Recruitment_Source: sources[i % sources.length],
      Candidate_Province: cities[i % cities.length].province,
      Screening_Status: passedScreen ? 'Passed' : 'Not Passed',
      Interview_Status: completedInterview ? 'Completed' : 'Pending',
      Offer_Status: accepted ? 'Accepted' : declined ? 'Declined' : 'Not Offered',
      Application_Status: accepted
        ? 'Hired'
        : declined
          ? 'Withdrawn'
          : !passedScreen
            ? 'Rejected'
            : 'In Progress',
      Hire_Date: accepted ? `2026-0${Math.min(10, appMonthNum + 1)}-${String((i % 20) + 5).padStart(2, '0')}T00:00:00.000Z` : '',
      Recruiter_ID: `HR0${(i % 5) + 1}`,
      Salary_Offered_CAD: offered ? 62000 + (i % 8) * 4500 : '',
    });
  }

  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
  const attendance: Record<string, unknown>[] = [];
  let attCounter = 1;
  for (const emp of employees.slice(0, 80)) {
    const dept = String(emp.Department);
    const isHighRisk = dept === 'Customer Support' || dept === 'Operations';
    for (const m of months) {
      const scheduled = 20;
      const absent = isHighRisk && (attCounter % 4 === 0) ? 2 : attCounter % 7 === 0 ? 1 : 0;
      const leave = attCounter % 9 === 0 ? 1 : 0;
      const present = Math.max(15, scheduled - absent - leave);
      const late = isHighRisk && (attCounter % 3 === 0) ? 3 : attCounter % 5 === 0 ? 1 : 0;
      const overtime = dept === 'IT' || dept === 'Operations' ? Number(((attCounter % 7) * 1.9).toFixed(1)) : Number(((attCounter % 4) * 0.8).toFixed(1));

      attendance.push({
        Attendance_ID: `ATT${String(attCounter++).padStart(5, '0')}`,
        Employee_ID: emp.Employee_ID,
        Period_Month: m,
        Scheduled_Workdays: scheduled,
        Days_Present: present,
        Absent_Days: absent,
        Approved_Leave_Days: leave,
        Late_Arrivals: late,
        Overtime_Hours: overtime,
        Attendance_Status: 'Complete',
      });
    }
  }

  return {
    status: 'fallback',
    timestamp: new Date().toISOString(),
    data: {
      Employee_Data: employees,
      Recruitment_Data: recruitment,
      Attendance_Data: attendance,
    },
  };
}
