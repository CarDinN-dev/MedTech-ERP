export interface HrOperationalView {
  primaryAction: string;
  helper: string;
  columns: string[];
  formColumns?: string[];
  rows: Array<Record<string, string>>;
  selectOptions?: Record<string, string[]>;
  defaultValues?: Record<string, string>;
}

export const recruitmentViews: Record<string, HrOperationalView> = {
  "Manpower Planning": {
    primaryAction: "New manpower plan", helper: "Plan headcount, budget and target hiring periods before opening a vacancy.",
    columns: ["Plan", "Department", "Position", "Headcount", "Target period", "Priority", "Budget", "Status"],
    formColumns: ["Plan", "Candidate", "Department", "Position", "Grade/Band", "Position Type", "Headcount", "Basic Salary", "Benefits", "Source", "Target period", "Priority", "Budget", "Prepared Date", "Status"],
    rows: [
      { Plan: "MPP-2026-018", Candidate: "To be confirmed", Department: "Service", Position: "Biomedical Service Engineer", "Grade/Band": "Professional", "Position Type": "New Position", Headcount: "2", "Basic Salary": "QAR 15,000", Benefits: "As per company policy", Source: "Manpower Planning", "Target period": "Q3 2026", Priority: "Critical", Budget: "QAR 360,000", "Prepared Date": "18 Jun 2026", Status: "Approved" },
      { Plan: "MPP-2026-021", Candidate: "To be confirmed", Department: "Sales", Position: "Sales Executive", "Grade/Band": "Professional", "Position Type": "New Position", Headcount: "3", "Basic Salary": "QAR 11,667", Benefits: "As per company policy", Source: "Manpower Planning", "Target period": "Q4 2026", Priority: "High", Budget: "QAR 420,000", "Prepared Date": "20 Jun 2026", Status: "Submitted" }
    ], selectOptions: { "Position Type": ["Replacement", "New Position"], Priority: ["Low", "Normal", "High", "Critical"], Status: ["Draft", "Submitted", "Approved", "On hold", "Closed"] }
  },
  "Vacancy Requests": {
    primaryAction: "New vacancy request", helper: "Request approved positions with headcount, salary budget, justification and target start date.",
    columns: ["Request", "Title", "Department", "Position", "Vacancies", "Employment type", "Target start", "Budgeted salary", "Status"],
    formColumns: ["Request", "Title", "Requested By", "Department", "Position", "Vacancies", "Employment type", "Location", "Reporting To", "Target start", "Reason for Hire", "Previous Employee", "Business Impact", "Budget Availability", "Budgeted salary", "Benefits", "Total Estimated Cost", "Recruitment Timeline", "Recruitment Method", "Key Skills & Experience", "Status"],
    rows: [
      { Request: "REC-2026-0042", Title: "Field service expansion", "Requested By": "Service Manager", Department: "Service", Position: "Service Engineer", Vacancies: "2", "Employment type": "Full-time", Location: "Doha, Qatar", "Reporting To": "Service Manager", "Target start": "01 Sep 2026", "Reason for Hire": "Expansion", "Previous Employee": "Not applicable", "Business Impact": "Increase preventive-maintenance and installation capacity", "Budget Availability": "Yes - CC-800", "Budgeted salary": "QAR 12,500", Benefits: "Medical, annual ticket and leave", "Total Estimated Cost": "QAR 360,000 per year", "Recruitment Timeline": "Within 30 days", "Recruitment Method": "External posting / referral", "Key Skills & Experience": "Biomedical engineering, field service, customer support", Status: "Approved" },
      { Request: "REC-2026-0040", Title: "Commercial growth", "Requested By": "Sales Manager", Department: "Sales", Position: "Sales Executive", Vacancies: "3", "Employment type": "Full-time", Location: "Doha, Qatar", "Reporting To": "Sales Manager", "Target start": "01 Oct 2026", "Reason for Hire": "Expansion", "Previous Employee": "Not applicable", "Business Impact": "Increase hospital and clinic account coverage", "Budget Availability": "Yes - CC-400", "Budgeted salary": "QAR 10,500", Benefits: "Medical, annual ticket and leave", "Total Estimated Cost": "QAR 420,000 per year", "Recruitment Timeline": "Within 30 days", "Recruitment Method": "External posting / agency", "Key Skills & Experience": "Medical equipment sales and Qatar market experience", Status: "Under review" }
    ], selectOptions: { "Employment type": ["Full-time", "Part-time", "Contract", "Temporary", "Internship"], "Reason for Hire": ["New Position", "Replacement", "Expansion"], Status: ["Requested", "Under review", "Approved", "Rejected", "Closed"] }
  },
  "Vacancy Release": {
    primaryAction: "Release vacancy", helper: "Publish approved vacancies to selected hiring channels and track closing dates.",
    columns: ["Release", "Vacancy request", "Position", "Department", "Release date", "Closing date", "Posting channels", "Released by", "Status"],
    rows: [
      { Release: "REL-2026-0038", "Vacancy request": "REC-2026-0042", Position: "Service Engineer", Department: "Service", "Release date": "18 Jun 2026", "Closing date": "18 Jul 2026", "Posting channels": "LinkedIn, careers portal", "Released by": "HR Officer", Status: "Published" }
    ], selectOptions: { Status: ["Draft", "Released", "Published", "Closed", "Cancelled"] }
  },
  Candidates: {
    primaryAction: "Add candidate", helper: "Maintain the CV register, sourcing channel, salary expectation and recruitment stage.",
    columns: ["Candidate", "Email", "Phone", "Applied role", "Department", "Source", "Expected salary", "CV", "Status"],
    rows: [
      { Candidate: "Dr. Lina Qureshi", Email: "lina.q@example.com", Phone: "+974 5000 2101", "Applied role": "Regulatory Specialist", Department: "Quality", Source: "LinkedIn", "Expected salary": "QAR 14,000", CV: "lina-qureshi.pdf", Status: "Interview" },
      { Candidate: "Rashid Khan", Email: "rashid.k@example.com", Phone: "+974 5000 2102", "Applied role": "Sales Executive", Department: "Sales", Source: "Referral", "Expected salary": "QAR 10,500", CV: "rashid-khan.pdf", Status: "Screening" },
      { Candidate: "Noor Al-Hajri", Email: "noor.h@example.com", Phone: "+974 5000 2103", "Applied role": "Service Engineer", Department: "Service", Source: "Agency", "Expected salary": "QAR 12,000", CV: "noor-alhajri.pdf", Status: "Offer" }
    ], selectOptions: { Source: ["Direct", "Referral", "LinkedIn", "Agency", "Job board", "Other"], Status: ["New", "Screening", "Interview", "Shortlisted", "Rejected", "Offer", "Hired"] }
  },
  Interviews: {
    primaryAction: "Schedule interview", helper: "Coordinate interview stages, panel members, scores and decisions.",
    columns: ["Interview", "Candidate", "Stage", "Scheduled", "Panel", "Score", "Decision", "Status"],
    rows: [
      { Interview: "INT-2026-0108", Candidate: "Dr. Lina Qureshi", Stage: "Technical", Scheduled: "24 Jun 2026, 10:00", Panel: "QA Manager, HR Manager", Score: "86/100", Decision: "Proceed", Status: "Completed" },
      { Interview: "INT-2026-0112", Candidate: "Rashid Khan", Stage: "First interview", Scheduled: "25 Jun 2026, 13:30", Panel: "Sales Manager, HR Officer", Score: "Pending", Decision: "Pending", Status: "Scheduled" }
    ], selectOptions: { Stage: ["Screening", "First interview", "Technical", "Final"], Decision: ["Pending", "Proceed", "Hold", "Reject"], Status: ["Scheduled", "Completed", "Cancelled", "No show"] }
  },
  "Offer Letters": {
    primaryAction: "Create offer", helper: "Track compensation, planned start date, issue status and signed offer documents.",
    columns: ["Offer", "Candidate", "Position", "Department", "Offered salary", "Start date", "Offer document", "Status"],
    formColumns: ["Offer", "Candidate", "Position", "Department", "Employee Group", "Basic Salary", "HRA", "Transportation", "Offered salary", "Total package", "Work Timings", "Start date", "Valid until", "Offer document", "Status"],
    rows: [
      { Offer: "OFR-2026-0031", Candidate: "Noor Al-Hajri", Position: "Service Engineer", Department: "Service", "Employee Group": "Staff", "Basic Salary": "QAR 8,000", HRA: "QAR 2,700", Transportation: "QAR 1,500", "Offered salary": "QAR 12,200", "Total package": "QAR 12,200", "Work Timings": "07:30-16:30", "Start date": "01 Aug 2026", "Valid until": "22 Jul 2026", "Offer document": "OFR-2026-0031.pdf", Status: "Sent" }
    ], selectOptions: { Status: ["Draft", "Sent", "Accepted", "Declined", "Withdrawn"] }
  }
};

export const attendanceViews: Record<string, HrOperationalView> = {
  "Daily Attendance": {
    primaryAction: "Record attendance", helper: "Review daily check-in, check-out, worked hours, overtime and attendance status.",
    columns: ["Record", "Employee", "Date", "Shift", "Check in", "Check out", "Hours", "Overtime", "Status"],
    rows: [
      { Record: "ATT-2026-0620-18", Employee: "Fahad Al-Kuwari", Date: "20 Jun 2026", Shift: "General", "Check in": "07:48", "Check out": "17:06", Hours: "9.30", Overtime: "0.30", Status: "Present" },
      { Record: "ATT-2026-0620-24", Employee: "Aisha Rahman", Date: "20 Jun 2026", Shift: "General", "Check in": "08:12", "Check out": "17:02", Hours: "8.83", Overtime: "0", Status: "Late" }
    ], selectOptions: { Status: ["Present", "Late", "Absent", "On leave", "Remote", "Holiday"] }
  },
  "Absence Monitoring": {
    primaryAction: "Record absence", helper: "Record unapproved absence, late arrival, early departure and payroll deduction treatment.",
    columns: ["Absence", "Employee", "Date", "Type", "Days", "Hours", "Reason", "Payroll impact", "Status"],
    rows: [
      { Absence: "ABS-2026-0074", Employee: "Omar Nasser", Date: "18 Jun 2026", Type: "Late arrival", Days: "0", Hours: "1.5", Reason: "Transport delay", "Payroll impact": "QAR 0", Status: "Under review" },
      { Absence: "ABS-2026-0068", Employee: "Mariam Said", Date: "11 Jun 2026", Type: "Unapproved absence", Days: "1", Hours: "8", Reason: "No notice", "Payroll impact": "QAR 360", Status: "Deducted" }
    ], selectOptions: { Type: ["Unapproved absence", "Late arrival", "Early departure", "Sick leave", "Emergency leave", "Other"], Status: ["Recorded", "Under review", "Approved", "Deducted", "Closed"] }
  },
  Corrections: {
    primaryAction: "New correction", helper: "Submit and approve missing punches or incorrect time records with supporting reasons.",
    columns: ["Correction", "Employee", "Attendance date", "Requested in", "Requested out", "Reason", "Submitted", "Approver", "Status"],
    rows: [
      { Correction: "ATC-2026-0041", Employee: "Aisha Rahman", "Attendance date": "17 Jun 2026", "Requested in": "08:01", "Requested out": "17:04", Reason: "Biometric terminal offline", Submitted: "18 Jun 2026", Approver: "Finance Manager", Status: "Approved" }
    ], selectOptions: { Status: ["Draft", "Submitted", "Approved", "Rejected"] }
  }
};

export const leaveViews: Record<string, HrOperationalView> = {
  "Leave Policies": { primaryAction: "Add leave policy", helper: "Configure entitlement, accrual, carry-forward, documentation and encashment rules.", columns: ["Policy", "Leave type", "Entitlement", "Accrual", "Carry forward", "Document required", "Encashment", "Status"], rows: [
    { Policy: "POL-ANNUAL", "Leave type": "Annual leave", Entitlement: "30 days", Accrual: "Monthly", "Carry forward": "10 days", "Document required": "No", Encashment: "Management approval", Status: "Active" },
    { Policy: "POL-SICK", "Leave type": "Sick leave", Entitlement: "14 days", Accrual: "Annual", "Carry forward": "0", "Document required": "Yes", Encashment: "No", Status: "Active" }
  ], selectOptions: { Status: ["Draft", "Active", "Inactive"] } },
  "Annual Planner": { primaryAction: "Plan annual leave", helper: "Plan team leave visibility by department before formal application approval.", columns: ["Plan", "Employee Code", "Employee", "Department", "Leave type", "From", "To", "Days", "Status"], rows: [
    { Plan: "LVP-2026-0088", "Employee Code": "MT-0018", Employee: "Fahad Al-Kuwari", Department: "Sales", "Leave type": "Annual leave", From: "02 Aug 2026", To: "13 Aug 2026", Days: "12", Status: "Planned" },
    { Plan: "LVP-2026-0091", "Employee Code": "MT-0041", Employee: "Naveen Kumar", Department: "Service", "Leave type": "Annual leave", From: "20 Jun 2026", To: "24 Jun 2026", Days: "5", Status: "Planned" },
    { Plan: "LVP-2026-0092", "Employee Code": "MT-0064", Employee: "Leila D'Souza", Department: "Human Resources", "Leave type": "Emergency leave", From: "25 Jun 2026", To: "26 Jun 2026", Days: "2", Status: "Planned" }
  ], selectOptions: { "Leave type": ["Annual leave", "Sick leave", "Emergency leave", "Unpaid leave", "Maternity leave", "Compassionate leave"], Status: ["Planned", "Applied", "Approved", "Rejected"] }, defaultValues: { Plan: "Auto generated", "Leave type": "Annual leave", Days: "1", Status: "Planned" } },
  Applications: {
    primaryAction: "Apply leave",
    helper: "Capture leave period, contact details, travel route, handover and approval routing.",
    columns: ["Request", "Employee Code", "Employee", "Department", "Leave type", "From", "To", "Days", "Available balance", "Remaining balance", "Handover to", "Clearance status", "Status"],
    formColumns: ["Request", "Employee Code", "Employee", "Department", "Designation", "Date of Employment", "Leave type", "From", "To", "Days", "Available balance", "Remaining balance", "Purpose", "Destination", "Travel from", "Travel to", "Handover to code", "Handover to", "Handover notes / tasks", "Clearance checklist", "Clearance status", "Contact", "Email", "Status"],
    rows: [
      { Request: "LV-2026-00128", "Employee Code": "MT-0041", Employee: "Naveen Kumar", Department: "Service", Designation: "Biomedical Engineer", "Date of Employment": "17 Jan 2023", "Leave type": "Annual leave", From: "20 Jun 2026", To: "24 Jun 2026", Days: "5", "Available balance": "22 days", "Remaining balance": "17 days", Balance: "17 days", Purpose: "Annual vacation", Destination: "Bangalore", "Travel from": "Doha", "Travel to": "BLR", "Handover to code": "MT-0064", "Handover to": "Leila D'Souza", "Handover notes / tasks": "PM visits: HMC Lab. Service laptop and toolkit assigned.", "Clearance checklist": "Service schedule covered; equipment handover confirmed", "Clearance status": "cleared", Contact: "+974 5539 8420", Email: "n.kumar@medtech.qa", Status: "Approved" },
      { Request: "LV-2026-00131", "Employee Code": "MT-0053", Employee: "Mariam Said", Department: "Procurement", Designation: "Procurement Officer", "Date of Employment": "08 Nov 2024", "Leave type": "Sick leave", From: "22 Jun 2026", To: "22 Jun 2026", Days: "1", "Available balance": "13 days", "Remaining balance": "12 days", Balance: "12 days", Purpose: "Medical leave", Destination: "Doha", "Travel from": "Doha", "Travel to": "Doha", "Handover to code": "MT-0072", "Handover to": "Omar Nasser", "Handover notes / tasks": "Share procurement inbox and urgent supplier follow-ups.", "Clearance checklist": "Manager review pending", "Clearance status": "pending", Contact: "+974 6681 3004", Email: "m.said@medtech.qa", Status: "Pending approval" }
    ],
    selectOptions: { "Leave type": ["Annual leave", "Sick leave", "Emergency leave", "Unpaid leave", "Maternity leave", "Compassionate leave"], "Clearance status": ["pending", "cleared", "not required"], Status: ["Draft", "Submitted", "Pending approval", "Manager review", "HR review", "Approved", "Rejected", "Cancelled"] },
    defaultValues: { Request: "Auto generated", Status: "Draft", "Leave type": "Annual leave", Days: "1", "Available balance": "0 days", "Remaining balance": "0 days", Balance: "0 days", "Clearance status": "pending" }
  },
  Approvals: {
    primaryAction: "Record decision",
    helper: "Record approved dates, decision, approver notes and balance impact.",
    columns: ["Decision", "Request", "Employee Code", "Employee", "Approved from", "Approved to", "Days", "Approver", "Decision date", "Status"],
    formColumns: ["Decision", "Request", "Employee Code", "Employee", "Approved from", "Approved to", "Days", "Approver", "Decision date", "Approval notes", "Status"],
    rows: [
      { Decision: "LVA-2026-0092", Request: "LV-2026-00128", "Employee Code": "MT-0041", Employee: "Naveen Kumar", "Approved from": "20 Jun 2026", "Approved to": "24 Jun 2026", Days: "5", Approver: "HR Manager", "Decision date": "17 Jun 2026", "Approval notes": "Approved as per leave balance.", Status: "Approved" }
    ],
    selectOptions: { Status: ["Pending approval", "Approved", "Rejected", "Pending more information"] }
  },
  "Leave Handover": {
    primaryAction: "Create handover",
    helper: "Track duties and notes handed over for submitted or approved leave applications.",
    columns: ["Request", "Employee Code", "Employee", "Leave dates", "Handover to code", "Handover to", "Tasks / notes", "Status", "Accepted at"],
    formColumns: ["Request", "Employee Code", "Employee", "Leave dates", "Handover to code", "Handover to", "Tasks / notes", "Attachment", "Status", "Accepted at"],
    rows: [
      { Request: "LV-2026-00128", "Employee Code": "MT-0041", Employee: "Naveen Kumar", "Leave dates": "20 Jun 2026 - 24 Jun 2026", "Handover to code": "MT-0064", "Handover to": "Leila D'Souza", "Tasks / notes": "PM visits: HMC Lab. Service laptop and toolkit assigned.", Attachment: "handover-lv-2026-00128.pdf", Status: "Accepted", "Accepted at": "19 Jun 2026, 15:30" }
    ],
    selectOptions: { Status: ["Draft", "Pending acceptance", "Accepted", "Returned", "Completed"] },
    defaultValues: { Status: "Pending acceptance" }
  },
  Clearance: {
    primaryAction: "Start clearance",
    helper: "Create leave clearance checks for approved leave applications when HR requires confirmation before departure.",
    columns: ["Request", "Employee Code", "Employee", "Department", "Leave dates", "Clearance items", "Responsible person", "Status", "Completed at"],
    formColumns: ["Request", "Employee Code", "Employee", "Department", "Leave dates", "Clearance items", "Responsible person", "Status", "Comments", "Completed at"],
    rows: [
      { Request: "LV-2026-00128", "Employee Code": "MT-0041", Employee: "Naveen Kumar", Department: "Service", "Leave dates": "20 Jun 2026 - 24 Jun 2026", "Clearance items": "Service schedule covered; equipment handover confirmed", "Responsible person": "HR Manager", Status: "cleared", Comments: "Cleared before departure.", "Completed at": "19 Jun 2026, 16:00" }
    ],
    selectOptions: { Status: ["not_required", "pending", "in_progress", "cleared", "blocked"] },
    defaultValues: { Status: "pending", "Responsible person": "HR Manager" }
  },
  Rejoin: {
    primaryAction: "Record rejoin",
    helper: "Track employee return from approved leave applications, delays, HR verification and supporting evidence.",
    columns: ["Request", "Employee Code", "Employee", "Original return date", "Actual rejoin date", "Delay days", "Status", "HR verified by", "Verified at"],
    formColumns: ["Request", "Employee Code", "Employee", "Original return date", "Actual rejoin date", "Delay days", "Reason for delay", "Medical / supporting attachment", "Status", "HR verified by", "Verified at"],
    rows: [
      { Request: "LV-2026-00128", "Employee Code": "MT-0041", Employee: "Naveen Kumar", "Original return date": "25 Jun 2026", "Actual rejoin date": "25 Jun 2026", "Delay days": "0", "Reason for delay": "Not applicable", "Medical / supporting attachment": "None", Status: "verified", "HR verified by": "HR Manager", "Verified at": "25 Jun 2026, 09:15" }
    ],
    selectOptions: { Status: ["pending_rejoin", "rejoined_on_time", "delayed_rejoin", "no_show", "verified"] },
    defaultValues: { Status: "pending_rejoin", "Delay days": "0" }
  }
};

export const payrollModules = ["Salary Records", "Overtime", "Salary Advance", "Salary Adjustment", "Paid Vacation Salary", "Gratuity", "Employee Loan", "Salary Account Transfer", "Insurance Claims / Refund", "Air Ticket Encashment", "Leave Settlement", "Final Settlement"] as const;

const payrollEffect: Record<(typeof payrollModules)[number], "Earning" | "Deduction" | "Neutral"> = {
  "Salary Records": "Neutral", Overtime: "Earning", "Salary Advance": "Deduction", "Salary Adjustment": "Neutral", "Paid Vacation Salary": "Earning", Gratuity: "Earning", "Employee Loan": "Deduction", "Salary Account Transfer": "Neutral", "Insurance Claims / Refund": "Neutral", "Air Ticket Encashment": "Earning", "Leave Settlement": "Neutral", "Final Settlement": "Neutral"
};

const payrollRow = (record: string, employee: string, quantity: string, rate: string, fixed: string, amount: string, effect: "Earning" | "Deduction" | "Neutral", status = "Approved") => ({
  Record: record,
  Employee: employee,
  "Document date": "20 Jun 2026",
  "Payroll period": "June 2026",
  Quantity: quantity,
  Rate: rate,
  "Fixed amount": fixed,
  "Calculated amount": amount,
  "Payroll effect": effect,
  "Net effect": effect === "Deduction" ? `QAR -${amount.replace(/^QAR\s*/, "")}` : effect === "Earning" ? amount : "QAR 0",
  Status: status
});

const payrollDemoRows: Record<string, Array<Record<string, string>>> = {
  "Salary Records": [
    payrollRow("SAL-2026-0018", "Fahad Al-Kuwari", "1", "QAR 0", "QAR 14,500", "QAR 14,500", "Neutral", "Processed"),
    payrollRow("SAL-2026-0024", "Aisha Rahman", "1", "QAR 0", "QAR 12,800", "QAR 12,800", "Neutral", "Processed"),
    payrollRow("SAL-2026-0041", "Naveen Kumar", "1", "QAR 0", "QAR 11,200", "QAR 11,200", "Neutral", "Processed"),
    payrollRow("SAL-2026-0053", "Mariam Said", "1", "QAR 0", "QAR 10,800", "QAR 10,800", "Neutral", "Processed"),
    payrollRow("SAL-2026-0064", "Leila D'Souza", "1", "QAR 0", "QAR 9,800", "QAR 9,800", "Neutral", "Processed"),
    payrollRow("SAL-2026-0072", "Omar Nasser", "1", "QAR 0", "QAR 8,900", "QAR 8,900", "Neutral", "Processed")
  ],
  Overtime: [
    payrollRow("OT-2026-0024", "Aisha Rahman", "12", "QAR 125", "QAR 0", "QAR 1,500", "Earning"),
    payrollRow("OT-2026-0041", "Naveen Kumar", "6", "QAR 100", "QAR 0", "QAR 600", "Earning"),
    payrollRow("OT-2026-0072", "Omar Nasser", "4", "QAR 95", "QAR 0", "QAR 380", "Earning")
  ],
  "Salary Advance": [
    payrollRow("ADV-2026-0018", "Fahad Al-Kuwari", "1", "QAR 0", "QAR 2,000", "QAR 2,000", "Deduction"),
    payrollRow("ADV-2026-0072", "Omar Nasser", "1", "QAR 0", "QAR 1,500", "QAR 1,500", "Deduction")
  ],
  "Salary Adjustment": [
    payrollRow("ADJ-2026-0053", "Mariam Said", "1", "QAR 0", "QAR 350", "QAR 350", "Earning"),
    payrollRow("ADJ-2026-0064", "Leila D'Souza", "1", "QAR 0", "QAR 200", "QAR 200", "Deduction")
  ],
  "Paid Vacation Salary": [
    payrollRow("PVS-2026-0018", "Fahad Al-Kuwari", "3", "QAR 500", "QAR 0", "QAR 1,500", "Earning"),
    payrollRow("PVS-2026-0041", "Naveen Kumar", "2", "QAR 400", "QAR 0", "QAR 800", "Earning")
  ],
  Gratuity: [
    payrollRow("GRT-2026-0072", "Omar Nasser", "1", "QAR 0", "QAR 6,225", "QAR 6,225", "Earning", "Submitted")
  ],
  "Employee Loan": [
    payrollRow("ELN-2026-0018", "Fahad Al-Kuwari", "1", "QAR 0", "QAR 1,000", "QAR 1,000", "Deduction"),
    payrollRow("ELN-2026-0072", "Omar Nasser", "1", "QAR 0", "QAR 2,000", "QAR 2,000", "Deduction")
  ],
  "Salary Account Transfer": [
    payrollRow("SAT-2026-0018", "Fahad Al-Kuwari", "1", "QAR 0", "QAR 0", "QAR 0", "Neutral", "Processed"),
    payrollRow("SAT-2026-0024", "Aisha Rahman", "1", "QAR 0", "QAR 0", "QAR 0", "Neutral", "Processed")
  ],
  "Insurance Claims / Refund": [
    payrollRow("INS-2026-0064", "Leila D'Souza", "1", "QAR 0", "QAR 450", "QAR 450", "Earning"),
    payrollRow("INS-2026-0053", "Mariam Said", "1", "QAR 0", "QAR 275", "QAR 275", "Earning")
  ],
  "Air Ticket Encashment": [
    payrollRow("AIR-2026-0024", "Aisha Rahman", "1", "QAR 0", "QAR 1,500", "QAR 1,500", "Earning"),
    payrollRow("AIR-2026-0041", "Naveen Kumar", "1", "QAR 0", "QAR 1,200", "QAR 1,200", "Earning")
  ],
  "Leave Settlement": [
    payrollRow("LVS-2026-0053", "Mariam Said", "2", "QAR 360", "QAR 0", "QAR 720", "Earning", "Processed")
  ],
  "Final Settlement": [
    payrollRow("EOS-2026-0072", "Omar Nasser", "1", "QAR 0", "QAR 5,625", "QAR 5,625", "Earning", "Processed")
  ]
};

export const payrollViews: Record<string, HrOperationalView> = Object.fromEntries(payrollModules.map((module, index) => [module, {
  primaryAction: `Add ${module.toLowerCase()}`,
  helper: `Create controlled ${module.toLowerCase()} entries with quantity/rate calculation and payroll impact.`,
  columns: ["Record", "Employee", "Document date", "Payroll period", "Quantity", "Rate", "Fixed amount", "Calculated amount", "Payroll effect", "Net effect", "Status"],
  rows: payrollDemoRows[module] || [{ Record: `PCI-2026-${String(180 + index).padStart(4, "0")}`, Employee: "Fahad Al-Kuwari", "Document date": "20 Jun 2026", "Payroll period": "June 2026", Quantity: "1", Rate: "QAR 0", "Fixed amount": "QAR 0", "Calculated amount": "QAR 0", "Payroll effect": payrollEffect[module], "Net effect": "QAR 0", Status: "Approved" }],
  selectOptions: { "Payroll effect": ["Earning", "Deduction", "Neutral"], Status: ["Draft", "Submitted", "Approved", "Processed", "Rejected"] },
  defaultValues: { Record: "Auto generated", "Document date": "20 Jun 2026", "Payroll period": "June 2026", "Payroll effect": payrollEffect[module], Status: "Draft", Quantity: "1", Rate: "QAR 0", "Fixed amount": "QAR 0", "Calculated amount": "QAR 0", "Net effect": "QAR 0" }
}])) as Record<string, HrOperationalView>;
