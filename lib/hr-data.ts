import { normalizeEmployeeRow } from "@/lib/hr-employee-fields";

export interface HrView {
  columns: string[];
  rows: Array<Record<string, string>>;
  primaryAction: string;
  formColumns?: string[];
  selectOptions?: Record<string, string[]>;
  defaultValues?: Record<string, string>;
}

const coreHrTabs = [
  "Dashboard", "Employees", "Departments", "Contracts",
  "Probation Reviews", "Access Provisioning", "Recruitment", "Attendance", "Attendance Exceptions", "Leave",
  "Business Trips", "Employee Expenses", "Payroll", "Loans & advances", "Performance/Appraisals", "eLearning",
  "EOS / Gratuity / Final Settlement", "Payroll Accounting Draft Journal", "Documents", "Approvals", "Reports",
  "Self service", "Settings"
] as const;

export const hrExpertTabs = [
  "Lifecycle Checklist", "HR Document Expiry", "Salary Revision Approval", "Training Matrix", "Competency Matrix",
  "Manpower Plan", "Loan Control Dashboard", "Payroll Variance Report", "Qatar Labour Compliance", "Exit Checklist"
] as const;

export const hrTabs = [...coreHrTabs, ...hrExpertTabs] as const;
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

const businessTripPurposeOptions = ["Supplier product demo", "Service training", "Training", "Meeting", "Client Visit", "Events", "Exhibitions", "Recruitment", "Supplier Visits"];

export const hrViews: Record<Exclude<HrTab, "Dashboard">, HrView> = {
  Employees: { primaryAction: "Add employee", columns: ["Employee No", "Full Name", "Department", "Job Title", "Line Manager", "Date Joined", "Status"], rows: hrEmployees },
  Departments: { primaryAction: "Add department", columns: ["Department", "Code", "Cost center", "Department head", "Employees", "Parent", "Status"], rows: [
    { Department: "Sales", Code: "SAL", "Cost center": "CC-400", "Department head": "Fahad Al-Kuwari", Employees: "28", Parent: "Commercial", Status: "Active" },
    { Department: "Service", Code: "SRV", "Cost center": "CC-800", "Department head": "Naveen Kumar", Employees: "24", Parent: "Operations", Status: "Active" },
    { Department: "Human Resources", Code: "HR", "Cost center": "CC-300", "Department head": "HR Manager", Employees: "8", Parent: "Corporate", Status: "Active" },
    { Department: "Finance", Code: "FIN", "Cost center": "CC-200", "Department head": "Aisha Rahman", Employees: "12", Parent: "Corporate", Status: "Active" }
  ]},
  Contracts: {
    primaryAction: "Add contract",
    columns: ["Contract No", "Employee Code", "Employee Name", "Contract Type", "Start Date", "End Date", "Renewal Status", "Approval Status", "Document Status"],
    formColumns: ["Contract No", "Employee Code", "Employee Name", "Department", "Contract Type", "Start Date", "End Date", "Probation End Date", "Renewal Status", "Approval Status", "Document Status"],
    rows: [
      { "Contract No": "CON-2026-0018", "Employee Code": "MT-0018", "Employee Name": "Fahad Al-Kuwari", Department: "Sales", "Contract Type": "Unlimited", "Start Date": "12 Mar 2021", "End Date": "", "Probation End Date": "12 Sep 2021", "Renewal Status": "Not required", "Approval Status": "Approved", "Document Status": "Signed" },
      { "Contract No": "CON-2026-0064", "Employee Code": "MT-0064", "Employee Name": "Leila D'Souza", Department: "Human Resources", "Contract Type": "Fixed term", "Start Date": "03 Feb 2025", "End Date": "02 Feb 2027", "Probation End Date": "03 Aug 2025", "Renewal Status": "Review due", "Approval Status": "Approved", "Document Status": "Signed" }
    ],
    selectOptions: { "Contract Type": ["Fixed term", "Unlimited", "Temporary", "Consultant"], "Renewal Status": ["Not required", "Review due", "Renewed", "Non-renewal"], "Approval Status": ["Draft", "Submitted", "Approved", "Rejected"], "Document Status": ["Pending", "Generated", "Signed", "Expired"] },
    defaultValues: { "Contract No": "Auto generated", "Contract Type": "Fixed term", "Renewal Status": "Review due", "Approval Status": "Draft", "Document Status": "Pending" }
  },
  "Probation Reviews": {
    primaryAction: "Add probation review",
    columns: ["Review No", "Employee Code", "Employee Name", "Joining Date", "Probation End Date", "Manager Feedback", "HR Decision", "Status"],
    rows: [
      { "Review No": "PRB-2026-0064", "Employee Code": "MT-0064", "Employee Name": "Leila D'Souza", "Joining Date": "03 Feb 2025", "Probation End Date": "03 Aug 2025", "Manager Feedback": "Meets expectations", "HR Decision": "Confirmed", Status: "Closed" },
      { "Review No": "PRB-2026-0072", "Employee Code": "MT-0072", "Employee Name": "Omar Nasser", "Joining Date": "14 Sep 2025", "Probation End Date": "14 Mar 2026", "Manager Feedback": "Extend review for warehouse controls", "HR Decision": "Extend probation", Status: "HR review" }
    ],
    selectOptions: { "HR Decision": ["Pending", "Confirmed", "Extend probation", "Terminate"], Status: ["Draft", "Manager review", "HR review", "Closed"] },
    defaultValues: { "Review No": "Auto generated", "HR Decision": "Pending", Status: "Draft" }
  },
  "Access Provisioning": {
    primaryAction: "Add access request",
    columns: ["Request No", "Employee Code", "Employee Name", "Company ID", "Requested Access", "ERP Role", "Email Required", "Company Car", "Accommodation", "Desk", "Stationery", "Email", "Business Card", "Laptop Required", "Laptop or PC", "Mobile Required", "Approval Status", "Provisioning Status"],
    formColumns: ["Request No", "Employee Code", "Employee Name", "Company ID", "Requested Access", "ERP Role", "Email Required", "Company Car", "Accommodation", "Desk", "Stationery", "Email", "Business Card", "Laptop Required", "Laptop or PC", "Mobile Required", "Approval Status", "Provisioning Status"],
    rows: [
      { "Request No": "ACC-2026-0018", "Employee Code": "MT-0018", "Employee Name": "Fahad Al-Kuwari", "Company ID": "MT-QA-0018", "Requested Access": "Sales quotations and customer master", "ERP Role": "Sales Manager", "Email Required": "Yes", "Company Car": "Assigned", Accommodation: "Not Assigned", Desk: "Assigned", Stationery: "Assigned", Email: "Assigned", "Business Card": "Assigned", "Laptop Required": "Yes", "Laptop or PC": "Laptop", "Mobile Required": "Yes", "Approval Status": "Approved", "Provisioning Status": "Provisioned" },
      { "Request No": "ACC-2026-0064", "Employee Code": "MT-0064", "Employee Name": "Leila D'Souza", "Company ID": "MT-QA-0064", "Requested Access": "HR self service administration", "ERP Role": "HR Officer", "Email Required": "Yes", "Company Car": "Not Assigned", Accommodation: "Not Assigned", Desk: "Assigned", Stationery: "Assigned", Email: "Assigned", "Business Card": "Not Assigned", "Laptop Required": "Yes", "Laptop or PC": "Laptop", "Mobile Required": "No", "Approval Status": "Submitted", "Provisioning Status": "Pending" }
    ],
    selectOptions: { "ERP Role": ["Employee", "HR Officer", "Payroll Manager", "Finance User", "Sales Manager", "Warehouse User"], "Email Required": ["Yes", "No"], "Company Car": ["Assigned", "Not Assigned"], Accommodation: ["Assigned", "Not Assigned"], Desk: ["Assigned", "Not Assigned"], Stationery: ["Assigned", "Not Assigned"], Email: ["Assigned", "Not Assigned"], "Business Card": ["Assigned", "Not Assigned"], "Laptop Required": ["Yes", "No"], "Laptop or PC": ["Laptop", "PC", "Not Required"], "Mobile Required": ["Yes", "No"], "Approval Status": ["Draft", "Submitted", "Approved", "Rejected"], "Provisioning Status": ["Pending", "Provisioned", "Rejected", "Cancelled"] },
    defaultValues: { "Request No": "Auto generated", "ERP Role": "Employee", "Email Required": "Yes", "Company Car": "Not Assigned", Accommodation: "Not Assigned", Desk: "Not Assigned", Stationery: "Not Assigned", Email: "Not Assigned", "Business Card": "Not Assigned", "Laptop Required": "No", "Laptop or PC": "Not Required", "Mobile Required": "No", "Approval Status": "Draft", "Provisioning Status": "Pending" }
  },
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
  "Attendance Exceptions": {
    primaryAction: "Add attendance exception",
    columns: ["Exception No", "Employee Code", "Employee Name", "Date", "Exception Type", "Reason", "Correction", "Approval Status", "Status"],
    rows: [
      { "Exception No": "AEX-2026-0101", "Employee Code": "MT-0024", "Employee Name": "Aisha Rahman", Date: "20 Jun 2026", "Exception Type": "Late In", Reason: "Traffic delay", Correction: "Accept 08:12 check-in", "Approval Status": "Manager Approved", Status: "Closed" },
      { "Exception No": "AEX-2026-0102", "Employee Code": "MT-0053", "Employee Name": "Mariam Said", Date: "17 Jun 2026", "Exception Type": "Missed Punch", Reason: "Forgot checkout", Correction: "Manual checkout 17:00", "Approval Status": "Submitted", Status: "HR review" }
    ],
    selectOptions: { "Exception Type": ["Late In", "Early Out", "Missed Punch", "Absent", "Duplicate Punch", "Manual Correction", "On Leave Conflict"], "Approval Status": ["Draft", "Submitted", "Manager Approved", "HR Approved", "Rejected"], Status: ["Draft", "Submitted", "HR review", "Closed", "Cancelled"] },
    defaultValues: { "Exception No": "Auto generated", "Exception Type": "Late In", "Approval Status": "Draft", Status: "Draft" }
  },
  Leave: { primaryAction: "Apply leave", columns: ["Request", "Employee", "Leave type", "From", "To", "Days", "Balance", "Status"], rows: [
    { Request: "LV-2026-00128", Employee: "Naveen Kumar", "Leave type": "Annual leave", From: "20 Jun 2026", To: "24 Jun 2026", Days: "5", Balance: "17 days", Status: "Approved" },
    { Request: "LV-2026-00131", Employee: "Mariam Said", "Leave type": "Sick leave", From: "22 Jun 2026", To: "22 Jun 2026", Days: "1", Balance: "12 days", Status: "Pending approval" },
    { Request: "LV-2026-00134", Employee: "Leila D'Souza", "Leave type": "Emergency leave", From: "25 Jun 2026", To: "26 Jun 2026", Days: "2", Balance: "3 days", Status: "Manager review" }
  ]},
  "Business Trips": {
    primaryAction: "Add business trip",
    columns: ["Trip No", "Employee Code", "Employee Name", "Destination", "Purpose", "From", "To", "Estimated Cost", "Status"],
    formColumns: ["Trip No", "Employee Code", "Employee Name", "Department", "Destination", "Purpose", "From", "To", "Estimated Cost", "Advance Required", "Manager", "Status"],
    rows: [
      { "Trip No": "BT-2026-0021", "Employee Code": "MT-0018", "Employee Name": "Fahad Al-Kuwari", Department: "Sales", Destination: "Riyadh", Purpose: "Supplier product demo", From: "08 Jul 2026", To: "10 Jul 2026", "Estimated Cost": "QAR 4,800", "Advance Required": "Yes", Manager: "Sales Manager", Status: "Manager Approved" },
      { "Trip No": "BT-2026-0022", "Employee Code": "MT-0041", "Employee Name": "Naveen Kumar", Department: "Service", Destination: "Dubai", Purpose: "Service training", From: "15 Jul 2026", To: "18 Jul 2026", "Estimated Cost": "QAR 6,200", "Advance Required": "No", Manager: "Service Manager", Status: "HR/Admin Processing" }
    ],
    selectOptions: { Purpose: businessTripPurposeOptions, "Advance Required": ["Yes", "No"], Status: ["Draft", "Submitted", "Manager Approved", "HR/Admin Processing", "Finance Processing", "Travel Completed", "Closed"] },
    defaultValues: { "Trip No": "Auto generated", Purpose: "Training", "Advance Required": "No", Status: "Draft" }
  },
  "Employee Expenses": {
    primaryAction: "Add employee expense",
    columns: ["Expense No", "Employee Code", "Employee Name", "Expense Type", "Claim Date", "Amount", "Project / Trip", "Status"],
    formColumns: ["Expense No", "Employee Code", "Employee Name", "Department", "Expense Type", "Claim Date", "Amount", "Project / Trip", "Receipt Status", "Finance Remarks", "Status"],
    rows: [
      { "Expense No": "EXP-2026-0038", "Employee Code": "MT-0018", "Employee Name": "Fahad Al-Kuwari", Department: "Sales", "Expense Type": "Travel", "Claim Date": "12 Jun 2026", Amount: "QAR 1,240", "Project / Trip": "BT-2026-0021", "Receipt Status": "Attached", "Finance Remarks": "", Status: "Manager Approved" },
      { "Expense No": "EXP-2026-0039", "Employee Code": "MT-0041", "Employee Name": "Naveen Kumar", Department: "Service", "Expense Type": "Tools", "Claim Date": "18 Jun 2026", Amount: "QAR 380", "Project / Trip": "Service call", "Receipt Status": "Attached", "Finance Remarks": "VAT checked", Status: "Finance Validated" }
    ],
    selectOptions: { "Expense Type": ["Travel", "Meals", "Tools", "Training", "Fuel", "Other"], "Receipt Status": ["Pending", "Attached", "Not required"], Status: ["Draft", "Submitted", "Manager Approved", "Finance Validated", "Reimbursed", "Rejected", "Cancelled"] },
    defaultValues: { "Expense No": "Auto generated", "Expense Type": "Travel", "Receipt Status": "Pending", Status: "Draft" }
  },
  Payroll: { primaryAction: "Generate payroll", columns: ["Payroll run", "Period", "Employees", "Gross pay", "Deductions", "Net pay", "Status"], rows: [
    { "Payroll run": "PAY-2026-06", Period: "June 2026", Employees: "126", "Gross pay": "QAR 1,284,600", Deductions: "QAR 48,200", "Net pay": "QAR 1,236,400", Status: "Validation" },
    { "Payroll run": "PAY-2026-05", Period: "May 2026", Employees: "122", "Gross pay": "QAR 1,246,300", Deductions: "QAR 42,880", "Net pay": "QAR 1,203,420", Status: "Paid" }
  ]},
  "Loans & advances": { primaryAction: "New loan request", columns: ["Request", "Employee", "Type", "Original amount", "Installment", "Outstanding", "Status"], rows: [
    { Request: "LOAN-2026-0028", Employee: "Omar Nasser", Type: "Employee loan", "Original amount": "QAR 24,000", Installment: "QAR 2,000", Outstanding: "QAR 14,000", Status: "Active" },
    { Request: "ADV-2026-0041", Employee: "Mariam Said", Type: "Salary advance", "Original amount": "QAR 6,000", Installment: "QAR 2,000", Outstanding: "QAR 4,000", Status: "Approved" }
  ]},
  "Performance/Appraisals": {
    primaryAction: "Add appraisal",
    columns: ["Appraisal No", "Employee Code", "Employee Name", "Cycle", "Goals", "Rating", "Recommendation", "Status"],
    formColumns: ["Appraisal No", "Employee Code", "Employee Name", "Department", "Cycle", "Goals", "Manager Comments", "Rating", "Increment Recommendation", "Promotion Recommendation", "Recommendation", "Status"],
    rows: [
      { "Appraisal No": "APR-2026-0018", "Employee Code": "MT-0018", "Employee Name": "Fahad Al-Kuwari", Department: "Sales", Cycle: "H1 2026", Goals: "Revenue target; customer retention", "Manager Comments": "Strong key account coverage", Rating: "4 - Exceeds", "Increment Recommendation": "8%", "Promotion Recommendation": "No", Recommendation: "Increment", Status: "Manager submitted" },
      { "Appraisal No": "APR-2026-0041", "Employee Code": "MT-0041", "Employee Name": "Naveen Kumar", Department: "Service", Cycle: "H1 2026", Goals: "Service SLA; training completion", "Manager Comments": "Good technical closure rate", Rating: "3 - Meets", "Increment Recommendation": "5%", "Promotion Recommendation": "No", Recommendation: "Increment", Status: "HR review" }
    ],
    selectOptions: { Cycle: ["H1 2026", "FY 2026", "Probation", "Promotion review"], Rating: ["1 - Needs improvement", "2 - Developing", "3 - Meets", "4 - Exceeds", "5 - Outstanding"], "Promotion Recommendation": ["Yes", "No"], Status: ["Draft", "Employee input", "Manager submitted", "HR review", "Closed"] },
    defaultValues: { "Appraisal No": "Auto generated", Cycle: "H1 2026", Rating: "3 - Meets", "Promotion Recommendation": "No", Status: "Draft" }
  },
  eLearning: {
    primaryAction: "Add learning assignment",
    columns: ["Assignment No", "Employee Code", "Employee Name", "Course", "Due Date", "Score", "HR Review", "Completion Status"],
    rows: [
      { "Assignment No": "ELN-2026-0041", "Employee Code": "MT-0041", "Employee Name": "Naveen Kumar", Course: "Biomedical safety refresher", "Due Date": "30 Jun 2026", Score: "92%", "HR Review": "Completed", "Completion Status": "Completed" },
      { "Assignment No": "ELN-2026-0053", "Employee Code": "MT-0053", "Employee Name": "Mariam Said", Course: "Procurement ethics", "Due Date": "15 Jul 2026", Score: "", "HR Review": "Pending", "Completion Status": "Assigned" }
    ],
    selectOptions: { Course: ["Biomedical safety refresher", "Procurement ethics", "ERP user training", "QHSE induction", "Sales compliance"], "HR Review": ["Pending", "Completed", "Needs follow-up"], "Completion Status": ["Assigned", "In progress", "Completed", "Overdue"] },
    defaultValues: { "Assignment No": "Auto generated", Course: "ERP user training", "HR Review": "Pending", "Completion Status": "Assigned" }
  },
  "EOS / Gratuity / Final Settlement": {
    primaryAction: "Add final settlement",
    columns: ["Settlement No", "Employee Code", "Employee Name", "Case Type", "Last Working Day", "Working Days Salary", "Leave Balance Encashment", "Gratuity", "Loan Balance Deduction", "Other Deductions", "Final Payable", "Status"],
    rows: [
      { "Settlement No": "EOS-2026-001", "Employee Code": "MT-0024", "Employee Name": "Aisha Rahman", "Case Type": "Resignation", "Last Working Day": "30 Sep 2026", "Working Days Salary": "QAR 17,500", "Leave Balance Encashment": "QAR 5,200", Gratuity: "QAR 43,008", "Loan Balance Deduction": "QAR 0", "Other Deductions": "QAR 0", "Final Payable": "QAR 65,708", Status: "Draft" },
      { "Settlement No": "EOS-2026-002", "Employee Code": "MT-0072", "Employee Name": "Omar Nasser", "Case Type": "Termination", "Last Working Day": "31 Jul 2026", "Working Days Salary": "QAR 11,900", "Leave Balance Encashment": "QAR 1,850", Gratuity: "QAR 6,225", "Loan Balance Deduction": "QAR 14,000", "Other Deductions": "QAR 350", "Final Payable": "QAR 5,625", Status: "HR review" }
    ],
    selectOptions: { "Case Type": ["Resignation", "Termination", "Contract end"], Status: ["Draft", "Submitted", "HR review", "Finance review", "Approved", "Paid", "Closed"] },
    defaultValues: { "Settlement No": "Auto generated", "Case Type": "Resignation", "Working Days Salary": "QAR 0", "Leave Balance Encashment": "QAR 0", Gratuity: "QAR 0", "Loan Balance Deduction": "QAR 0", "Other Deductions": "QAR 0", Status: "Draft" }
  },
  "Payroll Accounting Draft Journal": {
    primaryAction: "Add draft journal line",
    columns: ["Journal No", "Payroll Run", "Employee Code", "Employee Name", "Cost Center", "Allocation %", "Amount", "Finance Journal Draft", "Status"],
    rows: [
      { "Journal No": "PAY-JRN-2026-001", "Payroll Run": "MPR-MEDTECH-2026-06-Sales", "Employee Code": "MT-0018", "Employee Name": "Fahad Al-Kuwari", "Cost Center": "CC-400-Sales", "Allocation %": "70", Amount: "QAR 14,000", "Finance Journal Draft": "Draft", Status: "Draft" },
      { "Journal No": "PAY-JRN-2026-002", "Payroll Run": "MPR-MEDTECH-2026-06-Sales", "Employee Code": "MT-0018", "Employee Name": "Fahad Al-Kuwari", "Cost Center": "CC-410-Key Accounts", "Allocation %": "30", Amount: "QAR 6,000", "Finance Journal Draft": "Draft", Status: "Draft" }
    ],
    selectOptions: { Status: ["Draft", "Generated", "Cancelled"] },
    defaultValues: { "Journal No": "Auto generated", "Finance Journal Draft": "Draft", Status: "Draft" }
  },
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
  "Lifecycle Checklist": {
    primaryAction: "Add lifecycle checklist",
    columns: ["Checklist", "Employee Code", "Employee Name", "Stage", "Owner", "Due Date", "Completed Items", "Status"],
    rows: [
      { Checklist: "LIFE-2026-0064", "Employee Code": "MT-0064", "Employee Name": "Leila D'Souza", Stage: "Onboarding", Owner: "HR Officer", "Due Date": "2026-07-05", "Completed Items": "8 / 10", Status: "In progress" },
      { Checklist: "LIFE-2026-0072", "Employee Code": "MT-0072", "Employee Name": "Omar Nasser", Stage: "Role transfer", Owner: "HR Manager", "Due Date": "2026-07-12", "Completed Items": "4 / 9", Status: "Manager review" }
    ],
    selectOptions: { Stage: ["Onboarding", "Probation", "Transfer", "Promotion", "Exit"], Status: ["Draft", "In progress", "Manager review", "Completed", "Archived"] },
    defaultValues: { Checklist: "Auto generated", Stage: "Onboarding", "Completed Items": "0 / 10", Status: "Draft" }
  },
  "HR Document Expiry": {
    primaryAction: "Add document expiry",
    columns: ["Tracker", "Employee Code", "Employee Name", "Document", "Expiry Date", "Days Left", "Owner", "Status"],
    rows: [
      { Tracker: "HRDOC-2026-0041", "Employee Code": "MT-0041", "Employee Name": "Naveen Kumar", Document: "Qatar ID", "Expiry Date": "2026-07-02", "Days Left": "1", Owner: "HR Officer", Status: "Urgent" },
      { Tracker: "HRDOC-2026-0072", "Employee Code": "MT-0072", "Employee Name": "Omar Nasser", Document: "Passport", "Expiry Date": "2028-04-19", "Days Left": "657", Owner: "HR Officer", Status: "Active" }
    ],
    selectOptions: { Document: ["Qatar ID", "Passport", "Visa", "Contract", "Certification"], Status: ["Active", "Expiring soon", "Urgent", "Renewed", "Archived"] },
    defaultValues: { Tracker: "Auto generated", Document: "Qatar ID", Status: "Active" }
  },
  "Salary Revision Approval": {
    primaryAction: "Add salary revision",
    columns: ["Revision", "Employee Code", "Employee Name", "Current Salary", "Proposed Salary", "Effective Date", "Approval Route", "Status"],
    rows: [
      { Revision: "SALREV-2026-0024", "Employee Code": "MT-0024", "Employee Name": "Aisha Rahman", "Current Salary": "QAR 17,500", "Proposed Salary": "QAR 18,700", "Effective Date": "2026-07-01", "Approval Route": "Finance Manager -> HR -> Management", Status: "HR review" },
      { Revision: "SALREV-2026-0041", "Employee Code": "MT-0041", "Employee Name": "Naveen Kumar", "Current Salary": "QAR 15,200", "Proposed Salary": "QAR 16,000", "Effective Date": "2026-08-01", "Approval Route": "Service Manager -> HR", Status: "Draft" }
    ],
    selectOptions: { Status: ["Draft", "Submitted", "HR review", "Management review", "Approved", "Rejected"] },
    defaultValues: { Revision: "Auto generated", Status: "Draft" }
  },
  "Training Matrix": {
    primaryAction: "Add training need",
    columns: ["Matrix", "Department", "Role", "Course", "Required", "Completed", "Gap", "Status"],
    rows: [
      { Matrix: "TRN-2026-SRV", Department: "Service", Role: "Biomedical Engineer", Course: "Biomedical safety refresher", Required: "24", Completed: "21", Gap: "3", Status: "Open" },
      { Matrix: "TRN-2026-PROC", Department: "Procurement", Role: "Buyer", Course: "Procurement ethics", Required: "10", Completed: "10", Gap: "0", Status: "Complete" }
    ],
    selectOptions: { Status: ["Open", "In progress", "Complete", "Overdue"] },
    defaultValues: { Matrix: "Auto generated", Status: "Open" }
  },
  "Competency Matrix": {
    primaryAction: "Add competency record",
    columns: ["Competency", "Employee Code", "Employee Name", "Role", "Skill", "Level", "Assessed By", "Status"],
    rows: [
      { Competency: "COMP-2026-0041", "Employee Code": "MT-0041", "Employee Name": "Naveen Kumar", Role: "Biomedical Engineer", Skill: "Patient monitoring", Level: "Expert", "Assessed By": "Service Manager", Status: "Certified" },
      { Competency: "COMP-2026-0053", "Employee Code": "MT-0053", "Employee Name": "Mariam Said", Role: "Procurement Officer", Skill: "Landed cost analysis", Level: "Intermediate", "Assessed By": "Procurement Manager", Status: "Training needed" }
    ],
    selectOptions: { Level: ["Foundation", "Intermediate", "Advanced", "Expert"], Status: ["Certified", "Training needed", "Assessment due", "Expired"] },
    defaultValues: { Competency: "Auto generated", Level: "Foundation", Status: "Assessment due" }
  },
  "Manpower Plan": {
    primaryAction: "Add manpower plan",
    columns: ["Plan", "Department", "Current HC", "Approved HC", "Open Vacancies", "Forecast Need", "Owner", "Status"],
    rows: [
      { Plan: "MP-2026-SRV", Department: "Service", "Current HC": "24", "Approved HC": "27", "Open Vacancies": "2", "Forecast Need": "3 engineers by Q4", Owner: "HR Manager", Status: "Hiring" },
      { Plan: "MP-2026-WHS", Department: "Warehouse", "Current HC": "18", "Approved HC": "18", "Open Vacancies": "0", "Forecast Need": "Temp support for stock count", Owner: "Operations Manager", Status: "Planned" }
    ],
    selectOptions: { Status: ["Draft", "Planned", "Hiring", "On hold", "Closed"] },
    defaultValues: { Plan: "Auto generated", Status: "Draft" }
  },
  "Loan Control Dashboard": {
    primaryAction: "Add loan control",
    columns: ["Control", "Employee Code", "Employee Name", "Original Amount", "Outstanding", "Installment", "Payroll Deduction", "Status"],
    rows: [
      { Control: "LOANCTRL-2026-0028", "Employee Code": "MT-0072", "Employee Name": "Omar Nasser", "Original Amount": "QAR 24,000", Outstanding: "QAR 14,000", Installment: "QAR 2,000", "Payroll Deduction": "June payroll", Status: "Active" },
      { Control: "LOANCTRL-2026-0041", "Employee Code": "MT-0053", "Employee Name": "Mariam Said", "Original Amount": "QAR 6,000", Outstanding: "QAR 4,000", Installment: "QAR 2,000", "Payroll Deduction": "Pending approval", Status: "Approved" }
    ],
    selectOptions: { Status: ["Draft", "Approved", "Active", "Paused", "Settled", "Defaulted"] },
    defaultValues: { Control: "Auto generated", Status: "Draft" }
  },
  "Payroll Variance Report": {
    primaryAction: "Add payroll variance",
    columns: ["Variance", "Payroll Run", "Employee Code", "Employee Name", "Previous Net", "Current Net", "Variance Amount", "Status"],
    rows: [
      { Variance: "PAYVAR-2026-0024", "Payroll Run": "PAY-2026-06", "Employee Code": "MT-0024", "Employee Name": "Aisha Rahman", "Previous Net": "QAR 17,500", "Current Net": "QAR 18,700", "Variance Amount": "+QAR 1,200", Status: "Explained" },
      { Variance: "PAYVAR-2026-0072", "Payroll Run": "PAY-2026-06", "Employee Code": "MT-0072", "Employee Name": "Omar Nasser", "Previous Net": "QAR 11,900", "Current Net": "QAR 9,900", "Variance Amount": "-QAR 2,000", Status: "Loan deduction" }
    ],
    selectOptions: { Status: ["Unexplained", "Explained", "Loan deduction", "Salary revision", "Hold"] },
    defaultValues: { Variance: "Auto generated", Status: "Unexplained" }
  },
  "Qatar Labour Compliance": {
    primaryAction: "Add compliance check",
    columns: ["Check", "Area", "Requirement", "Owner", "Evidence", "Due Date", "Risk", "Status"],
    rows: [
      { Check: "QLC-2026-0018", Area: "WPS", Requirement: "Salary transfer file before cutoff", Owner: "Payroll Manager", Evidence: "June WPS draft", "Due Date": "2026-07-03", Risk: "Medium", Status: "In progress" },
      { Check: "QLC-2026-0014", Area: "Contract", Requirement: "Signed contract available for active employees", Owner: "HR Manager", Evidence: "Document center", "Due Date": "2026-07-10", Risk: "Low", Status: "Compliant" }
    ],
    selectOptions: { Area: ["WPS", "Contract", "Working hours", "Leave", "EOS", "Health card"], Risk: ["Low", "Medium", "High"], Status: ["Compliant", "In progress", "Exception", "Overdue"] },
    defaultValues: { Check: "Auto generated", Area: "WPS", Risk: "Low", Status: "In progress" }
  },
  "Exit Checklist": {
    primaryAction: "Add exit checklist",
    columns: ["Exit", "Employee Code", "Employee Name", "Last Working Day", "Clearance", "EOS Draft", "Asset Return", "Status"],
    rows: [
      { Exit: "EXIT-2026-0024", "Employee Code": "MT-0024", "Employee Name": "Aisha Rahman", "Last Working Day": "2026-09-30", Clearance: "Finance pending", "EOS Draft": "EOS-2026-001", "Asset Return": "Not started", Status: "Open" },
      { Exit: "EXIT-2026-0072", "Employee Code": "MT-0072", "Employee Name": "Omar Nasser", "Last Working Day": "2026-07-31", Clearance: "Warehouse pending", "EOS Draft": "EOS-2026-002", "Asset Return": "Laptop pending", Status: "HR review" }
    ],
    selectOptions: { Status: ["Draft", "Open", "HR review", "Finance review", "Cleared", "Closed"] },
    defaultValues: { Exit: "Auto generated", Clearance: "Not started", "Asset Return": "Not started", Status: "Draft" }
  },
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

