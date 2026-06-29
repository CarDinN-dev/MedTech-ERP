import { normalizeEmployeeRow } from "@/lib/hr-employee-fields";

export interface HrView {
  columns: string[];
  rows: Array<Record<string, string>>;
  primaryAction: string;
  formColumns?: string[];
  selectOptions?: Record<string, string[]>;
  defaultValues?: Record<string, string>;
}

export const hrTabs = ["Dashboard", "Employees", "Departments", "Recruitment", "Attendance", "Leave", "Payroll", "Loans & advances", "Gratuity", "Documents", "Approvals", "Reports", "Self service", "Settings"] as const;
export type HrTab = typeof hrTabs[number];

const baseHrEmployees: Array<Record<string, string>> = [
  { "Employee No": "MT-0018", "First Name": "Fahad", "Last Name": "Al-Kuwari", "Full Name": "Fahad Al-Kuwari", "Job Title": "Key Account Manager", "Category": "Staff", "Department": "Sales", "Division": "Commercial", "Location": "Doha HQ", "Line Manager": "Sales Manager", "Date Joined": "12 Mar 2021", "Status": "Active", "Email Address": "f.alkuwari@medtech.qa", "Mobile No": "+974 5512 1840", "Date of Birth": "12 Mar 1987", "Gender": "Male", "Marital Status": "Married", "Nationality": "Qatari", "ID/Passport No": "28763491230", "Expiry Date": "18 Feb 2027", "Bank Name": "QNB", "Account No": "10002934812", "IBAN": "QA** **** 0198", "Basic Salary": "QAR 14,500", "Housing Allowance": "QAR 4,000", "Transport Allowance": "QAR 1,500", "Other Allowance": "QAR 0", "Total Salary": "QAR 20,000", "Emergency Contact Name": "Aisha Al-Kuwari", "Emergency Contact Relation": "Spouse", "Emergency Contact Number": "+974 5555 1234" },
  { "Employee No": "MT-0024", "First Name": "Aisha", "Last Name": "Rahman", "Full Name": "Aisha Rahman", "Job Title": "Senior Accountant", "Category": "Staff", "Department": "Finance", "Division": "Corporate", "Location": "Doha HQ", "Line Manager": "Finance Manager", "Date Joined": "02 Sep 2021", "Status": "Active", "Email Address": "a.rahman@medtech.qa", "Mobile No": "+974 6614 2088", "Date of Birth": "04 Jul 1991", "Gender": "Female", "Marital Status": "Married", "Nationality": "Indian", "ID/Passport No": "29163491230", "Expiry Date": "08 Aug 2026", "Bank Name": "Commercial Bank", "Account No": "10002934813", "IBAN": "QA** **** 4421", "Basic Salary": "QAR 12,800", "Housing Allowance": "QAR 3,500", "Transport Allowance": "QAR 1,200", "Other Allowance": "QAR 0", "Total Salary": "QAR 17,500", "Emergency Contact Name": "Omar Rahman", "Emergency Contact Relation": "Spouse", "Emergency Contact Number": "+974 6666 1234" },
  { "Employee No": "MT-0041", "First Name": "Naveen", "Last Name": "Kumar", "Full Name": "Naveen Kumar", "Job Title": "Biomedical Engineer", "Category": "Staff", "Department": "Service", "Division": "Operations", "Location": "Doha HQ", "Line Manager": "Service Manager", "Date Joined": "17 Jan 2023", "Status": "On leave", "Email Address": "n.kumar@medtech.qa", "Mobile No": "+974 5539 8420", "Date of Birth": "21 Nov 1989", "Gender": "Male", "Marital Status": "Married", "Nationality": "Indian", "ID/Passport No": "28963491230", "Expiry Date": "02 Jul 2026", "Bank Name": "Doha Bank", "Account No": "10002934814", "IBAN": "QA** **** 7304", "Basic Salary": "QAR 11,200", "Housing Allowance": "QAR 3,000", "Transport Allowance": "QAR 1,000", "Other Allowance": "QAR 0", "Total Salary": "QAR 15,200", "Emergency Contact Name": "Priya Kumar", "Emergency Contact Relation": "Spouse", "Emergency Contact Number": "+974 7777 1234" },
  { "Employee No": "MT-0053", "First Name": "Mariam", "Last Name": "Said", "Full Name": "Mariam Said", "Job Title": "Procurement Officer", "Category": "Staff", "Department": "Procurement", "Division": "Operations", "Location": "Doha HQ", "Line Manager": "Procurement Manager", "Date Joined": "08 Nov 2024", "Status": "Active", "Email Address": "m.said@medtech.qa", "Mobile No": "+974 6681 3004", "Date of Birth": "16 Feb 1993", "Gender": "Female", "Marital Status": "Single", "Nationality": "Jordanian", "ID/Passport No": "29363491230", "Expiry Date": "30 Nov 2027", "Bank Name": "QIB", "Account No": "10002934815", "IBAN": "QA** **** 1182", "Basic Salary": "QAR 10,800", "Housing Allowance": "QAR 2,800", "Transport Allowance": "QAR 1,000", "Other Allowance": "QAR 0", "Total Salary": "QAR 14,600", "Emergency Contact Name": "Ahmad Said", "Emergency Contact Relation": "Father", "Emergency Contact Number": "+974 8888 1234" },
  { "Employee No": "MT-0064", "First Name": "Leila", "Last Name": "D'Souza", "Full Name": "Leila D'Souza", "Job Title": "HR Officer", "Category": "Staff", "Department": "Human Resources", "Division": "Corporate", "Location": "Doha HQ", "Line Manager": "HR Manager", "Date Joined": "03 Feb 2025", "Status": "Active", "Email Address": "l.dsouza@medtech.qa", "Mobile No": "+974 5077 9124", "Date of Birth": "29 May 1994", "Gender": "Female", "Marital Status": "Single", "Nationality": "Indian", "ID/Passport No": "29463491230", "Expiry Date": "17 Jan 2027", "Bank Name": "QNB", "Account No": "10002934816", "IBAN": "QA** **** 5409", "Basic Salary": "QAR 9,800", "Housing Allowance": "QAR 2,500", "Transport Allowance": "QAR 900", "Other Allowance": "QAR 0", "Total Salary": "QAR 13,200", "Emergency Contact Name": "Ravi D'Souza", "Emergency Contact Relation": "Father", "Emergency Contact Number": "+974 9999 1234" },
  { "Employee No": "MT-0072", "First Name": "Omar", "Last Name": "Nasser", "Full Name": "Omar Nasser", "Job Title": "Warehouse Supervisor", "Category": "Staff", "Department": "Warehouse", "Division": "Operations", "Location": "Doha HQ", "Line Manager": "Operations Manager", "Date Joined": "14 Sep 2025", "Status": "Active", "Email Address": "o.nasser@medtech.qa", "Mobile No": "+974 5528 6102", "Date of Birth": "09 Sep 1990", "Gender": "Male", "Marital Status": "Married", "Nationality": "Egyptian", "ID/Passport No": "29063491230", "Expiry Date": "28 Jun 2026", "Bank Name": "Dukhan Bank", "Account No": "10002934817", "IBAN": "QA** **** 9075", "Basic Salary": "QAR 8,900", "Housing Allowance": "QAR 2,200", "Transport Allowance": "QAR 800", "Other Allowance": "QAR 0", "Total Salary": "QAR 11,900", "Emergency Contact Name": "Fatima Nasser", "Emergency Contact Relation": "Spouse", "Emergency Contact Number": "+974 3333 1234" }
];

export const hrEmployees = baseHrEmployees.map(normalizeEmployeeRow);


export const hrViews: Record<Exclude<HrTab, "Dashboard">, HrView> = {
  Employees: { primaryAction: "Add employee", columns: ["Employee No", "Full Name", "Department", "Job Title", "Line Manager", "Date Joined", "Status"], rows: hrEmployees },
  Departments: { primaryAction: "Add department", columns: ["Department", "Code", "Cost center", "Department head", "Employees", "Parent", "Status"], rows: [
    { Department: "Sales", Code: "SAL", "Cost center": "CC-400", "Department head": "Fahad Al-Kuwari", Employees: "28", Parent: "Commercial", Status: "Active" },
    { Department: "Service", Code: "SRV", "Cost center": "CC-800", "Department head": "Naveen Kumar", Employees: "24", Parent: "Operations", Status: "Active" },
    { Department: "Human Resources", Code: "HR", "Cost center": "CC-300", "Department head": "HR Manager", Employees: "8", Parent: "Corporate", Status: "Active" },
    { Department: "Finance", Code: "FIN", "Cost center": "CC-200", "Department head": "Aisha Rahman", Employees: "12", Parent: "Corporate", Status: "Active" }
  ]},
  Recruitment: { primaryAction: "New vacancy request", columns: ["Request", "Position", "Department", "Candidates", "Stage", "Owner", "Status"], rows: [
    { Request: "REC-2026-0042", Position: "Service Engineer", Department: "Service", Candidates: "18", Stage: "Interview", Owner: "HR Officer", Status: "Approved" },
    { Request: "REC-2026-0040", Position: "Sales Executive", Department: "Sales", Candidates: "24", Stage: "Screening", Owner: "HR Officer", Status: "In progress" },
    { Request: "REC-2026-0038", Position: "Regulatory Specialist", Department: "Quality", Candidates: "7", Stage: "Offer", Owner: "HR Manager", Status: "Pending approval" }
  ]},
  Attendance: { primaryAction: "Record attendance", columns: ["Employee", "Date", "Check in", "Check out", "Hours", "Overtime", "Status"], rows: [
    { Employee: "Fahad Al-Kuwari", Date: "20 Jun 2026", "Check in": "07:48", "Check out": "17:06", Hours: "9h 18m", Overtime: "18m", Status: "Present" },
    { Employee: "Aisha Rahman", Date: "20 Jun 2026", "Check in": "08:12", "Check out": "17:02", Hours: "8h 50m", Overtime: "-", Status: "Late" },
    { Employee: "Naveen Kumar", Date: "20 Jun 2026", "Check in": "-", "Check out": "-", Hours: "0h", Overtime: "-", Status: "On leave" }
  ]},
  Leave: { primaryAction: "Apply leave", columns: ["Request", "Employee", "Leave type", "From", "To", "Days", "Balance", "Status"], rows: [
    { Request: "LV-2026-00128", Employee: "Naveen Kumar", "Leave type": "Annual leave", From: "20 Jun 2026", To: "24 Jun 2026", Days: "5", Balance: "17 days", Status: "Approved" },
    { Request: "LV-2026-00131", Employee: "Mariam Said", "Leave type": "Sick leave", From: "22 Jun 2026", To: "22 Jun 2026", Days: "1", Balance: "12 days", Status: "Pending approval" },
    { Request: "LV-2026-00134", Employee: "Leila D'Souza", "Leave type": "Emergency leave", From: "25 Jun 2026", To: "26 Jun 2026", Days: "2", Balance: "3 days", Status: "Manager review" }
  ]},
  Payroll: { primaryAction: "Generate payroll", columns: ["Payroll run", "Period", "Employees", "Gross pay", "Deductions", "Net pay", "Status"], rows: [
    { "Payroll run": "PAY-2026-06", Period: "June 2026", Employees: "126", "Gross pay": "QAR 1,284,600", Deductions: "QAR 48,200", "Net pay": "QAR 1,236,400", Status: "Validation" },
    { "Payroll run": "PAY-2026-05", Period: "May 2026", Employees: "122", "Gross pay": "QAR 1,246,300", Deductions: "QAR 42,880", "Net pay": "QAR 1,203,420", Status: "Paid" }
  ]},
  "Loans & advances": { primaryAction: "New loan request", columns: ["Request", "Employee", "Type", "Original amount", "Installment", "Outstanding", "Status"], rows: [
    { Request: "LOAN-2026-0028", Employee: "Omar Nasser", Type: "Employee loan", "Original amount": "QAR 24,000", Installment: "QAR 2,000", Outstanding: "QAR 14,000", Status: "Active" },
    { Request: "ADV-2026-0041", Employee: "Mariam Said", Type: "Salary advance", "Original amount": "QAR 6,000", Installment: "QAR 2,000", Outstanding: "QAR 4,000", Status: "Approved" }
  ]},
  Gratuity: { primaryAction: "Calculate gratuity", columns: ["Employee", "Joining date", "Service years", "Last basic salary", "Estimated liability", "As of", "Status"], rows: [
    { Employee: "Fahad Al-Kuwari", "Joining date": "12 Mar 2021", "Service years": "5.27", "Last basic salary": "QAR 14,500", "Estimated liability": "QAR 53,490", "As of": "20 Jun 2026", Status: "Calculated" },
    { Employee: "Aisha Rahman", "Joining date": "02 Sep 2021", "Service years": "4.80", "Last basic salary": "QAR 12,800", "Estimated liability": "QAR 43,008", "As of": "20 Jun 2026", Status: "Calculated" }
  ]},
  Documents: { primaryAction: "Upload document", columns: ["Document", "Employee", "Category", "Version", "Expiry", "Access", "Status"], rows: [
    { Document: "QID_MT0041.pdf", Employee: "Naveen Kumar", Category: "Qatar ID", Version: "2.0", Expiry: "02 Jul 2026", Access: "HR only", Status: "Expiring soon" },
    { Document: "Employment_Contract_MT0024.pdf", Employee: "Aisha Rahman", Category: "Contract", Version: "1.1", Expiry: "01 Sep 2026", Access: "HR & Employee", Status: "Active" },
    { Document: "Passport_MT0072.pdf", Employee: "Omar Nasser", Category: "Passport", Version: "1.0", Expiry: "19 Apr 2028", Access: "HR only", Status: "Active" }
  ]},
  Approvals: { primaryAction: "New approval request", columns: ["Request", "Type", "Employee / Position", "Requested by", "Amount / Impact", "Submitted", "Status"], rows: [
    { Request: "HR-APR-0188", Type: "Employee creation", "Employee / Position": "Service Engineer", "Requested by": "HR Officer", "Amount / Impact": "New headcount", Submitted: "Today, 09:12", Status: "Pending" },
    { Request: "HR-APR-0184", Type: "Salary revision", "Employee / Position": "MT-0024 - Aisha Rahman", "Requested by": "Finance Manager", "Amount / Impact": "+QAR 1,200", Submitted: "Yesterday", Status: "HR review" },
    { Request: "HR-APR-0179", Type: "Payroll", "Employee / Position": "June 2026 run", "Requested by": "Payroll Manager", "Amount / Impact": "QAR 1.24M", Submitted: "18 Jun 2026", Status: "Management review" }
  ]},
  Reports: { primaryAction: "Build HR report", columns: ["Report", "Category", "Period", "Owner", "Format", "Last run", "Status"], rows: [
    { Report: "Employee directory", Category: "Employee", Period: "Current", Owner: "HR Team", Format: "PDF / Excel", "Last run": "Today, 08:45", Status: "Ready" },
    { Report: "Monthly attendance", Category: "Attendance", Period: "June 2026", Owner: "HR Team", Format: "Excel", "Last run": "Today, 09:30", Status: "Ready" },
    { Report: "Passport & visa expiry", Category: "Compliance", Period: "Next 90 days", Owner: "HR Manager", Format: "PDF / Excel", "Last run": "19 Jun 2026", Status: "Ready" },
    { Report: "Payroll cost", Category: "Payroll", Period: "YTD 2026", Owner: "Payroll Manager", Format: "Dashboard / PDF", "Last run": "18 Jun 2026", Status: "Ready" }
  ]},
  "Self service": {
    primaryAction: "New self-service request",
    columns: ["Request", "Employee Code", "Employee", "Service", "Category", "Submitted", "Owner", "Status"],
    formColumns: ["Request", "Employee Code", "Employee", "Department", "Service", "Category", "Current value", "Requested change", "Available action", "Submitted", "Last update", "Owner", "Status"],
    rows: [
      { Request: "ESS-2026-0104", "Employee Code": "MT-0041", Employee: "Naveen Kumar", Department: "Service", Service: "Leave balance", Category: "Leave", "Current value": "17 annual days", "Requested change": "Review annual leave balance after approved leave", "Available action": "Review balance", Submitted: "20 Jun 2026", "Last update": "20 Jun 2026", Owner: "HR Manager", Status: "In progress" },
      { Request: "ESS-2026-0102", "Employee Code": "MT-0024", Employee: "Aisha Rahman", Department: "Finance", Service: "Payslips", Category: "Payroll", "Current value": "May 2026 payslip available", "Requested change": "Download June payslip when payroll is closed", "Available action": "Download", Submitted: "18 Jun 2026", "Last update": "18 Jun 2026", Owner: "Payroll Manager", Status: "Available" },
      { Request: "ESS-2026-0098", "Employee Code": "MT-0053", Employee: "Mariam Said", Department: "Procurement", Service: "Attendance corrections", Category: "Attendance", "Current value": "0 pending", "Requested change": "Correct missed punch for 17 Jun 2026", "Available action": "Submit correction", Submitted: "17 Jun 2026", "Last update": "18 Jun 2026", Owner: "HR Officer", Status: "Submitted" },
      { Request: "ESS-2026-0094", "Employee Code": "MT-0064", Employee: "Leila D'Souza", Department: "Human Resources", Service: "My profile", Category: "Profile", "Current value": "100% complete", "Requested change": "Update emergency contact mobile number", "Available action": "View / update", Submitted: "16 Jun 2026", "Last update": "18 Jun 2026", Owner: "HR Officer", Status: "Completed" }
    ],
    selectOptions: {
      Service: ["My profile", "Leave balance", "Payslips", "Attendance corrections", "Document request", "Loan request", "HR letter"],
      Category: ["Profile", "Leave", "Payroll", "Attendance", "Documents", "Loans", "Letters"],
      Status: ["Available", "Draft", "Submitted", "In progress", "Completed", "Rejected", "Cancelled"]
    },
    defaultValues: { Request: "Auto generated", Service: "My profile", Category: "Profile", Status: "Draft" }
  },
  Settings: {
    primaryAction: "Add HR setting",
    columns: ["Setting", "Value", "Category", "Effective date", "Updated by", "Status"],
    formColumns: ["Setting", "Value", "Category", "Effective date", "Updated by", "Description", "Applies to", "Approval required", "Status"],
    rows: [
      { Setting: "Annual leave entitlement", Value: "30 calendar days", Category: "Leave", "Effective date": "01 Jan 2026", "Updated by": "HR Manager", Description: "Default annual leave entitlement for eligible employees.", "Applies to": "All staff", "Approval required": "Yes", Status: "Active" },
      { Setting: "Standard work day", Value: "8 hours", Category: "Attendance", "Effective date": "01 Jan 2026", "Updated by": "HR Manager", Description: "Standard daily hours used for attendance and payroll calculations.", "Applies to": "All staff", "Approval required": "No", Status: "Active" },
      { Setting: "Payroll cut-off", Value: "25th of each month", Category: "Payroll", "Effective date": "01 Jan 2026", "Updated by": "Payroll Manager", Description: "Monthly payroll change cut-off date.", "Applies to": "Payroll processing", "Approval required": "Yes", Status: "Active" },
      { Setting: "Salary calculation method", Value: "Calendar days", Category: "Payroll", "Effective date": "01 Jan 2026", "Updated by": "Payroll Manager", Description: "Default payroll day-count basis for salary and unpaid-day calculations.", "Applies to": "MedTech Qatar", "Approval required": "Yes", Status: "Active" },
      { Setting: "Default payable days", Value: "30", Category: "Payroll", "Effective date": "01 Jan 2026", "Updated by": "Payroll Manager", Description: "Fallback payable days when the month-specific run does not override it.", "Applies to": "MedTech Qatar", "Approval required": "Yes", Status: "Active" },
      { Setting: "Leave encashment basis", Value: "Basic salary", Category: "Payroll", "Effective date": "01 Jan 2026", "Updated by": "Payroll Manager", Description: "Salary basis used for leave settlement calculations.", "Applies to": "Leave settlements", "Approval required": "Yes", Status: "Active" },
      { Setting: "WPS export format", Value: "Qatar WPS", Category: "Payroll", "Effective date": "01 Jan 2026", "Updated by": "Payroll Manager", Description: "Bank export profile for monthly salary transfer files.", "Applies to": "Salary account transfer", "Approval required": "Yes", Status: "Active" },
      { Setting: "Probation period", Value: "6 months", Category: "Employment", "Effective date": "01 Jan 2026", "Updated by": "HR Manager", Description: "Default probation duration for new employees.", "Applies to": "New hires", "Approval required": "No", Status: "Active" }
    ],
    selectOptions: {
      Category: ["Leave", "Attendance", "Payroll", "Employment", "Documents", "Approvals", "Self service"],
      "Approval required": ["Yes", "No"],
      Status: ["Draft", "Active", "Inactive", "Pending approval", "Archived"]
    },
    defaultValues: { Category: "Employment", "Approval required": "No", Status: "Draft" }
  }
};

export const hrDepartmentHeadcount = [
  ["Sales", 28], ["Service", 24], ["Warehouse", 18], ["Finance", 12], ["Projects", 14], ["Procurement", 10], ["HR", 8], ["Other", 12]
] as const;
export const hrAttendanceTrend = [91.2, 92.8, 90.6, 94.1, 93.5, 95.2];
export const hrPayrollTrend = [1.08, 1.12, 1.15, 1.18, 1.21, 1.24];

