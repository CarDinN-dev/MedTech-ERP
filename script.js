
const fs = require("fs");
let content = fs.readFileSync("C:/Users/Lenovo/Documents/Codex/2026-06-20/medtech-erp-client-demo/components/hr-workspace.tsx", "utf-8");

// Line 76
content = content.replace(
  `action: onboardingRecord ? "UPDATE EMPLOYEE" : "CREATE EMPLOYEE", module: "Human Resources", record: values["Employee ID"], details: onboardingRecord ? \`\${values.Employee} profile updated\` : \`\${values.Employee} onboarded and portal account prepared\``,
  `action: onboardingRecord ? "UPDATE EMPLOYEE" : "CREATE EMPLOYEE", module: "Human Resources", record: values["Employee No"], details: onboardingRecord ? \`\${values["Full Name"]} profile updated\` : \`\${values["Full Name"]} onboarded and portal account prepared\``
);

// Line 77
content = content.replace(
  `const employee = String(input.Employee || "").trim(); if (!employee) throw new Error("Employee is required");`,
  `const employee = String(input["Full Name"] || "").trim(); if (!employee) throw new Error("Full Name is required");`
);

// Line 84
content = content.replace(
  `!["IBAN", "Basic salary", "Housing allowance", "Transport allowance"].includes(key)`,
  `!["IBAN", "Account No", "Basic Salary", "Housing Allowance", "Transport Allowance", "Other Allowance", "Total Salary"].includes(key)`
);

// Line 85
content = content.replace(
  `partyLabel: first.Employee ? "Employee" : "Human Resources", partyName: first.Employee || first[primaryName] || "MedTech HR"`,
  `partyLabel: first["Full Name"] ? "Employee" : "Human Resources", partyName: first["Full Name"] || first[primaryName] || "MedTech HR"`
);

// Line 99
content = content.replace(
  `column === "Employee" && activeTab === "Employees" ? <button onClick={() => openRecord(record)} className="text-left font-semibold text-[var(--text)] hover:text-teal-600"><span className="block">{record.Employee}</span><span className="text-[10px] font-normal text-slate-400">{record.Email}</span></button> : record[column]`,
  `column === "Full Name" && activeTab === "Employees" ? <button onClick={() => openRecord(record)} className="text-left font-semibold text-[var(--text)] hover:text-teal-600"><span className="block">{record["Full Name"]}</span><span className="text-[10px] font-normal text-slate-400">{record["Email Address"]}</span></button> : record[column]`
);

// Line 131
content = content.replace(
  `{employee.Employee}`,
  `{employee["Full Name"]}`
).replace(
  `{employee.Employee}`,
  `{employee["Full Name"]}`
).replace(
  `{employee.Employee.split(" ").slice(0,2).map(part => part[0]).join("")}`,
  `{(employee["Full Name"] || "A").split(" ").slice(0,2).map(part => part[0]).join("")}`
).replace(
  `{employee.Designation} · {employee["Employee ID"]}`,
  `{employee["Job Title"]} · {employee["Employee No"]}`
);

// Line 132
content = content.replace(
  `const tabs = ["Personal", "Employment", "Salary", "Bank", "Documents", "Timeline"];`,
  `const tabs = ["Personal", "Employment", "Salary", "Bank", "Documents", "Emergency"];`
);

// Line 133
content = content.replace(
  `const fields = tab === "Personal" ? ["Employee","Email","Mobile","Gender","Nationality","Date of birth","Marital status"] : tab === "Employment" ? ["Employee ID","Department","Designation","Manager","Employment type","Joining date","Confirmation date","Status"] : tab === "Salary" ? ["Basic salary","Housing allowance","Transport allowance"] : tab === "Bank" ? ["Bank","IBAN"] : tab === "Documents" ? ["QID expiry","Passport expiry","Visa expiry","Compliance"] : ["Joining date","Confirmation date","Status"];`,
  `const fields = tab === "Personal" ? ["First Name","Last Name","Full Name","Email Address","Mobile No","Date of Birth","Gender","Nationality","Marital Status"] : tab === "Employment" ? ["Employee No","Job Title","Category","Department","Division","Location","Line Manager","Date Joined","Status"] : tab === "Salary" ? ["Basic Salary","Housing Allowance","Transport Allowance","Other Allowance","Total Salary"] : tab === "Bank" ? ["Bank Name","Account No","IBAN"] : tab === "Documents" ? ["ID/Passport No","Expiry Date"] : ["Emergency Contact Name","Emergency Contact Relation","Emergency Contact Number"];`
);

// Line 134
content = content.replace(
  `{tab === "Timeline" && <div className="mt-6 space-y-4 border-l-2 border-teal-100 pl-5">{[["Profile reviewed","Today"],["Contract confirmed",employee["Confirmation date"]],["Employee joined",employee["Joining date"]]].map(item => <div key={item[0]}><b className="text-xs">{item[0]}</b><div className="text-[10px] text-slate-400">{item[1]}</div></div>)}</div>}`,
  ``
);

// Line 140
content = content.replace(
  `{ "Employee ID": employeeNumber, Status: "Active", "Employment type": "Full time", Compliance: "Pending review" }`,
  `{ "Employee No": employeeNumber, Status: "Active", Category: "Staff" }`
);

// Line 142-149
content = content.replace(
  `const stepFields: Array<Array<[string,string]>> = [
    [["Employee","Full name"],["Email","Work email"],["Mobile","Mobile number"],["Nationality","Nationality"],["Date of birth","Date of birth"],["Marital status","Marital status"]],
    [["Employee ID","Employee ID"],["Department","Department"],["Designation","Designation"],["Manager","Reporting manager"],["Employment type","Employment type"],["Joining date","Joining date"]],
    [["Basic salary","Basic salary"],["Housing allowance","Housing allowance"],["Transport allowance","Transport allowance"],["Other allowances","Other allowances"],["Bank","Bank name"],["IBAN","IBAN"]],
    [["QID expiry","Qatar ID expiry"],["Passport expiry","Passport expiry"],["Visa expiry","Visa expiry"],["Documents","Uploaded document summary"]],
    [["Approval route","Approval route"],["Approval note","Approval note"]],
    [["Portal role","Portal role"],["Account email","Account email"],["Welcome message","Welcome message"]]
  ];`,
  `const stepFields: Array<Array<[string,string]>> = [
    [["First Name","First Name"], ["Last Name", "Last Name"], ["Full Name","Full Name"],["Email Address","Work email"],["Mobile No","Mobile number"],["Nationality","Nationality"],["Date of Birth","Date of birth"],["Gender","Gender"],["Marital Status","Marital status"]],
    [["Employee No","Employee No"],["Job Title","Job Title"],["Category","Category"],["Department","Department"],["Division","Division"],["Location","Location"],["Line Manager","Reporting manager"],["Date Joined","Joining date"],["Status","Status"]],
    [["Basic Salary","Basic salary"],["Housing Allowance","Housing allowance"],["Transport Allowance","Transport allowance"],["Other Allowance","Other allowances"],["Total Salary","Total salary"],["Bank Name","Bank name"],["Account No","Account number"],["IBAN","IBAN"]],
    [["ID/Passport No","ID/Passport No"],["Expiry Date","Expiry Date"],["Emergency Contact Name","Emergency Contact Name"],["Emergency Contact Relation","Emergency Contact Relation"],["Emergency Contact Number","Emergency Contact Number"]],
    [["Approval route","Approval route"],["Approval note","Approval note"]],
    [["Portal role","Portal role"],["Account email","Account email"],["Welcome message","Welcome message"]]
  ];`
);

// Line 150
content = content.replace(
  `onComplete({ ...values, Email: values.Email || values["Account email"], Department: values.Department || "Human Resources", Designation: values.Designation || "Employee", Manager: values.Manager || "Department Manager", "Joining date": values["Joining date"] || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), Status: values.Status || "Active", Compliance: values.Compliance || "Pending review", "Confirmation date": values["Confirmation date"] || "Pending" });`,
  `onComplete({ ...values, "Email Address": values["Email Address"] || values["Account email"], Department: values.Department || "Human Resources", "Job Title": values["Job Title"] || "Employee", "Line Manager": values["Line Manager"] || "Department Manager", "Date Joined": values["Date Joined"] || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), Status: values.Status || "Active" });`
);

fs.writeFileSync("C:/Users/Lenovo/Documents/Codex/2026-06-20/medtech-erp-client-demo/components/hr-workspace.tsx", content);
