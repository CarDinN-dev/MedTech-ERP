import { plainText } from "@/lib/validation";

export const defaultSifSettings = {
  employerEid: "10007230",
  payerIban: "QA58CBQA000000000000123456789",
  payerQid: "",
  payerEid: "10007230",
  payerBankShortName: "CBQ",
  sifVersion: "01"
} as const;

export const sifHeaderColumns = ["Employer EID", "Payer IBAN", "Total Salaries (QAR)", "Payer QID", "Payer EID", "No. Of Records", "Salary Month", "Salary Year", "File Creation Time", "File Creation Date", "SIF Version"] as const;
export const sifRecordColumns = ["Seq", "Name", "Bank", "IBAN", "Net Salary", "Basic Salary", "Extra Hours", "Extra Income", "Deductions", "QID", "Visa ID", "Salary Freq.", "Work Days", "Payment Type", "Remarks", "House Allow.", "Food Allow.", "Transport Allow.", "Overtime Allow.", "Deduction Reason"] as const;

export interface SifSettings {
  employerEid: string;
  payerIban: string;
  payerQid: string;
  payerEid: string;
  payerBankShortName: string;
  sifVersion: string;
}

export interface SifEmployeeMaster {
  employeeCode: string;
  employeeName: string;
  bankShortName: string;
  accountNumber: string;
  iban: string;
  qidOrEmployeeId: string;
  visaId?: string;
}

export interface SifPayrollLine {
  employeeCode: string;
  employeeName: string;
  department: string;
  paidDays: number;
  workingDays: number;
  netSalary: number;
  basicSalary: number;
  extraHours: number;
  extraIncome: number;
  deductions: number;
  remarks: string;
  housingAllowance: number;
  foodAllowance: number;
  transportAllowance: number;
  overtimeAllowance: number;
}

export interface SifRunContext extends SifSettings {
  salaryMonth: string;
  salaryYear: string;
  fileCreationDate: string;
  fileCreationTime: string;
}

export interface SifValidationError {
  employee: string;
  missingField: string;
}

export function validateSifExport(lines: SifPayrollLine[], employees: SifEmployeeMaster[], context: SifRunContext) {
  const byCode = new Map(employees.map(employee => [employee.employeeCode, employee]));
  const errors: SifValidationError[] = [];
  if (!context.employerEid) errors.push({ employee: "Header", missingField: "Employer EID" });
  if (!context.payerIban) errors.push({ employee: "Header", missingField: "Payer IBAN" });
  if (!context.payerEid && !context.payerQid) errors.push({ employee: "Header", missingField: "Payer EID or Payer QID" });
  if (context.payerEid && context.payerQid) errors.push({ employee: "Header", missingField: "Use either Payer EID or Payer QID, not both" });
  if (!context.salaryMonth || !context.salaryYear) errors.push({ employee: "Header", missingField: "Salary Month / Year" });
  if (!lines.length) errors.push({ employee: "Header", missingField: "Payroll lines" });
  lines.forEach(line => {
    const master = byCode.get(line.employeeCode);
    const employee = line.employeeName || line.employeeCode || "Unknown employee";
    if (!line.employeeCode) errors.push({ employee, missingField: "Employee Code" });
    if (!line.employeeName) errors.push({ employee, missingField: "Employee Name" });
    if (!master?.bankShortName) errors.push({ employee, missingField: "Employee Bank Short Name" });
    if (!master?.accountNumber && !master?.iban) errors.push({ employee, missingField: "Employee Account / IBAN" });
    if (!master?.qidOrEmployeeId && !master?.visaId) errors.push({ employee, missingField: "Employee QID or Visa ID" });
    if (line.netSalary < 0) errors.push({ employee, missingField: "Non-negative Net Salary" });
    if (line.netSalary > 0 && line.paidDays <= 0) errors.push({ employee, missingField: "Work Days" });
    if (line.basicSalary <= 0) errors.push({ employee, missingField: "Basic Salary" });
  });
  return errors;
}

export function buildSifCsv(lines: SifPayrollLine[], employees: SifEmployeeMaster[], context: SifRunContext) {
  const total = money(lines.reduce((sum, line) => sum + line.netSalary, 0));
  const headerValues = [context.employerEid, context.payerIban, total, context.payerQid, context.payerEid, lines.length, context.salaryMonth, context.salaryYear, context.fileCreationTime, context.fileCreationDate, context.sifVersion];
  return [
    sifHeaderColumns,
    headerValues,
    sifRecordColumns,
    ...buildSifRows(lines, employees)
  ].map(row => row.map(csvCell).join(",")).join("\r\n");
}

export function buildSifRows(lines: SifPayrollLine[], employees: SifEmployeeMaster[]) {
  const byCode = new Map(employees.map(employee => [employee.employeeCode, employee]));
  return lines.map((line, index) => {
    const master = byCode.get(line.employeeCode);
    return [
      index + 1,
      line.employeeName,
      master?.bankShortName ?? "",
      master?.iban || master?.accountNumber || "",
      money(line.netSalary),
      money(line.basicSalary),
      money(line.extraHours),
      money(line.extraIncome),
      money(line.deductions),
      master?.qidOrEmployeeId ?? "",
      master?.visaId ?? "",
      "M",
      money(line.paidDays),
      "BANK",
      line.remarks,
      money(line.housingAllowance),
      money(line.foodAllowance),
      money(line.transportAllowance),
      money(line.overtimeAllowance),
      deductionReason(line)
    ];
  });
}

export function sifFileName(context: Pick<SifRunContext, "employerEid" | "payerBankShortName" | "fileCreationDate" | "fileCreationTime">) {
  return `SIF_${safePart(context.employerEid)}_${safePart(context.payerBankShortName)}_${context.fileCreationDate}_${context.fileCreationTime}.csv`;
}

function deductionReason(line: SifPayrollLine) {
  return line.deductions > 0 ? "04" : "";
}

function money(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function safePart(value: string) {
  return plainText(value, 40).replace(/[^a-z0-9]+/gi, "") || "NA";
}

function csvCell(value: unknown) {
  const text = plainText(value, 300).replace(/"/g, "\"\"");
  return /[",\r\n]/.test(text) ? `"${text}"` : text;
}
