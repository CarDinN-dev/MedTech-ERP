export const employeeImportColumns = [
  "Employee Code", "Employee Category", "First Name", "Last Name", "Full Name", "Work Shift", "Company", "Sponsor Name", "WPS Sponsor",
  "Department", "Designation", "Grade/Band", "Date of Birth", "Joining Date", "Reporting Manager Employee Code/Name", "Family Status (Yes/No)",
  "Leave Policy", "Last Rejoin Date", "Annual Leave Balance (As on Date)", "Annual Leave Balance", "LOP Days (Loss of Pay)", "Business Unit",
  "Working Company Name", "Cost Centre", "Nationality", "RP/ID Number", "RP/ID Profession", "QID Expiry Date", "Visa Type", "Hire Type",
  "Confirmation Date", "ESB Date", "Gender", "Marital Status", "Office Mobile No.", "Personal Mobile No.", "E-Mail ID (Work)", "No. of Dependents",
  "Blood Group", "Local Building/Villa #", "Local Street #", "Local Zone #", "International Apartment", "International Building", "International Floor",
  "International Street", "International State", "International Country", "International Zip Code", "Emergency Contact Name", "Emergency Contact Relationship",
  "Emergency Contact Mobile No.", "Travel Sector", "Travel Cost", "No. of Tickets - Employee (Year)", "Ticket Balance (%)", "No. of Tickets - Family",
  "Salary Pay Type", "Company Accommodation", "Company Transportation", "Overtime Eligible", "Company Food", "Company Fuel Card", "Work Permit No.",
  "Work Permit Issue Date", "Work Permit Expiry Date", "Office File No.", "Access Card No.", "Bank Code", "IBAN No.", "Account No.",
  "Highest Education Qualification", "Year of Passing", "Passport No.", "Passport Place of Issue", "Passport Issue Date", "Passport Expiry Date",
  "License Type", "Driving License No.", "Driving License Expiry Date", "Insurance Card No.", "Insurance Issue Date", "Insurance Expiry Date",
  "Basic", "HRA", "Food Allowance", "Mobile Allowance", "Special Allowance", "Overtime Amount", "Total"
] as const;

export const employeeProfileSections = [
  { title: "Core Employment Details", fields: ["Employee Code", "Employee Category", "Full Name", "Work Shift", "Company", "Department", "Designation", "Grade/Band", "Joining Date", "Reporting Manager Employee Code/Name", "Business Unit", "Working Company Name", "Cost Centre", "Hire Type", "Confirmation Date", "ESB Date"] },
  { title: "Personal & Identity", fields: ["First Name", "Last Name", "Date of Birth", "Gender", "Marital Status", "Family Status (Yes/No)", "No. of Dependents", "Nationality", "Blood Group"] },
  { title: "Residency, Visa & Access", fields: ["Sponsor Name", "WPS Sponsor", "RP/ID Number", "RP/ID Profession", "QID Expiry Date", "Visa Type", "Work Permit No.", "Work Permit Issue Date", "Work Permit Expiry Date", "Office File No.", "Access Card No."] },
  { title: "Contact & Addresses", fields: ["Office Mobile No.", "Personal Mobile No.", "E-Mail ID (Work)", "Local Building/Villa #", "Local Street #", "Local Zone #", "International Apartment", "International Building", "International Floor", "International Street", "International State", "International Country", "International Zip Code"] },
  { title: "Leave, Travel & Benefits", fields: ["Leave Policy", "Last Rejoin Date", "Annual Leave Balance (As on Date)", "Annual Leave Balance", "LOP Days (Loss of Pay)", "Travel Sector", "Travel Cost", "No. of Tickets - Employee (Year)", "Ticket Balance (%)", "No. of Tickets - Family", "Company Accommodation", "Company Transportation", "Overtime Eligible", "Company Food", "Company Fuel Card"] },
  { title: "Bank & Salary", fields: ["Salary Pay Type", "Bank Code", "IBAN No.", "Account No.", "Basic", "HRA", "Food Allowance", "Mobile Allowance", "Special Allowance", "Overtime Amount", "Total"] },
  { title: "Qualifications & Documents", fields: ["Highest Education Qualification", "Year of Passing", "Passport No.", "Passport Place of Issue", "Passport Issue Date", "Passport Expiry Date", "License Type", "Driving License No.", "Driving License Expiry Date", "Insurance Card No.", "Insurance Issue Date", "Insurance Expiry Date"] },
  { title: "Emergency Contact", fields: ["Emergency Contact Name", "Emergency Contact Relationship", "Emergency Contact Mobile No."] }
] as const;

const rawAliases: Record<string, string[]> = {
  "First Name": ["First Name "], "Family Status (Yes/No)": ["Family Status(Yes/No)"], "Last Rejoin Date": ["Last rejoin Date "],
  "Annual Leave Balance (As on Date)": ["Annual Leave Balance (As on date) "], "Annual Leave Balance": ["Annual Leave Balance "],
  "LOP Days (Loss of Pay)": ["LOP days( Loss of pay days)"], "RP/ID Number": ["RP / ID Number"], "Office Mobile No.": ["Office Mobile No."],
  "E-Mail ID (Work)": ["E-Mail ID (Work)"], "Local Building/Villa #": ["(Local)Building/Villa #"], "Local Street #": ["(Local) Street #"],
  "Local Zone #": ["(Local) Zone #"], "International Apartment": ["(International) Apartment"], "International Building": ["(International) Building"],
  "International Floor": ["(International)  Floor"], "International Street": ["(International) Street"], "International State": ["(International) State"],
  "International Country": ["(International) Country"], "International Zip Code": ["(International) Zip Code"],
  "Emergency Contact Relationship": ["Emergency Contact Relationship"], "Emergency Contact Mobile No.": ["Emergency Contact Mobile No with country code"],
  "No. of Tickets - Employee (Year)": ["No. of Tickets Employee (YEAR)"], "Ticket Balance (%)": ["Ticket balance (%)"],
  "No. of Tickets - Family": ["No. Of tickets Family "], "Salary Pay Type": ["Salary Pay Type (Cash/Bank Transfer/Pay Card)"],
  "Company Transportation": ["Company  Transportation"], "Overtime Eligible": ["Overtime"], "Highest Education Qualification": ["Highest Education Qualification "],
  "Passport Place of Issue": ["Place Of issue"], "License Type": ["Licenses Type"], "Driving License No.": ["Driving Licenses No"],
  "Passport Issue Date": ["Issue Date"], "Insurance Issue Date": ["Issue Date (2)"], "Passport Expiry Date": ["Expiry Date"],
  "Driving License Expiry Date": ["Expiry Date (2)"], "Insurance Expiry Date": ["Expiry Date (3)"], "Overtime Amount": ["Over time"]
};

export function normalizeEmployeeRow(input: Record<string, unknown>): Record<string, string> {
  const read = (key: string) => {
    const candidates = [key, ...(rawAliases[key] ?? [])];
    for (const candidate of candidates) {
      const value = input[candidate];
      if (value !== undefined && value !== null && String(value).trim() !== "") return formatCell(value);
    }
    return "";
  };
  const exact = Object.fromEntries(employeeImportColumns.map(column => [column, read(column)]));
  const employeeCode = exact["Employee Code"] || read("Employee No");
  const designation = exact.Designation || read("Job Title");
  const joiningDate = exact["Joining Date"] || read("Date Joined");
  const manager = exact["Reporting Manager Employee Code/Name"] || read("Line Manager");
  const workEmail = exact["E-Mail ID (Work)"] || read("Email Address");
  const mobile = exact["Personal Mobile No."] || exact["Office Mobile No."] || read("Mobile No");
  const basic = exact.Basic || read("Basic Salary");
  const hra = exact.HRA || read("Housing Allowance");
  const total = exact.Total || read("Total Salary");
  return {
    ...Object.fromEntries(Object.entries(input).map(([key, value]) => [key, formatCell(value)])),
    ...exact,
    "Employee No": employeeCode,
    "Job Title": designation,
    "Category": exact["Employee Category"] || read("Category") || "Staff",
    "Date Joined": joiningDate,
    "Line Manager": manager,
    "Email Address": workEmail,
    "Mobile No": mobile,
    "Basic Salary": basic,
    "Housing Allowance": hra,
    "Transport Allowance": read("Transport Allowance"),
    "Other Allowance": exact["Food Allowance"] || exact["Mobile Allowance"] || exact["Special Allowance"] ? "See allowance breakdown" : read("Other Allowance"),
    "Total Salary": total,
    "ID/Passport No": exact["RP/ID Number"] || exact["Passport No."] || read("ID/Passport No"),
    "Expiry Date": exact["QID Expiry Date"] || exact["Passport Expiry Date"] || read("Expiry Date"),
    "Bank Name": exact["Bank Code"] || read("Bank Name"),
    "IBAN": exact["IBAN No."] || read("IBAN"),
    "Emergency Contact Relation": exact["Emergency Contact Relationship"] || read("Emergency Contact Relation"),
    "Emergency Contact Number": exact["Emergency Contact Mobile No."] || read("Emergency Contact Number"),
    Status: read("Status") || "Active"
  };
}

function formatCell(value: unknown) {
  if (value instanceof Date) return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  return value === undefined || value === null ? "" : String(value).trim();
}
