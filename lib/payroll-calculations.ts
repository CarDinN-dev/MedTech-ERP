export type SalaryCalculationMethod = "calendar_days" | "working_days";

export interface MonthlyPayrollSettings {
  salaryCalculationMethod: SalaryCalculationMethod;
  configuredWorkingDays: number;
}

export interface MonthlyPayrollLineInput {
  employeeCode: string;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  grossSalary: number;
  workingDays: number;
  paidDays: number;
  unpaidDays: number;
  leaveDays: number;
  loanDeduction: number;
  otherDeductions: number;
  leaveSettlementAmount: number;
  eosSettlementAmount: number;
  hasBankDetails: boolean;
}

export interface MonthlyPayrollLineResult {
  salaryPayable: number;
  totalDeductions: number;
  netPay: number;
}

export function calculateSalaryPayable(input: Pick<MonthlyPayrollLineInput, "grossSalary" | "paidDays">, settings: MonthlyPayrollSettings, calendarDays: number) {
  const basis = settings.salaryCalculationMethod === "working_days" ? settings.configuredWorkingDays : calendarDays;
  return money((positive(input.grossSalary) / Math.max(1, positive(basis))) * positive(input.paidDays));
}

export function calculateMonthlyPayrollLine(input: MonthlyPayrollLineInput, settings: MonthlyPayrollSettings, calendarDays: number): MonthlyPayrollLineResult {
  const salaryPayable = calculateSalaryPayable(input, settings, calendarDays);
  const totalDeductions = money(positive(input.loanDeduction) + positive(input.otherDeductions));
  return {
    salaryPayable,
    totalDeductions,
    netPay: money(salaryPayable + positive(input.leaveSettlementAmount) + positive(input.eosSettlementAmount) - totalDeductions)
  };
}

export function calculateLeaveSettlement(salary: number, leaveBalanceDays: number, settings: MonthlyPayrollSettings, calendarDays: number) {
  const basis = settings.salaryCalculationMethod === "working_days" ? settings.configuredWorkingDays : calendarDays;
  const salaryRatePerDay = money(positive(salary) / Math.max(1, positive(basis)));
  return {
    salaryRatePerDay,
    settlementAmount: money(salaryRatePerDay * positive(leaveBalanceDays))
  };
}

export function validateMonthlyPayroll(lines: MonthlyPayrollLineInput[], results: MonthlyPayrollLineResult[]) {
  const errors: string[] = [];
  const seen = new Set<string>();
  lines.forEach((line, index) => {
    if (seen.has(line.employeeCode)) errors.push(`${line.employeeCode} is duplicated.`);
    seen.add(line.employeeCode);
    if (line.basicSalary <= 0 || line.grossSalary <= 0) errors.push(`${line.employeeName} is missing salary.`);
    if (!line.hasBankDetails) errors.push(`${line.employeeName} is missing bank details.`);
    if ((results[index]?.netPay ?? 0) < 0) errors.push(`${line.employeeName} has negative net pay.`);
  });
  return errors;
}

function positive(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
