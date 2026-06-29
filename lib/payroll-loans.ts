export type LoanStatus = "active" | "completed" | "cancelled";
export type InstallmentStatus = "pending" | "deducted" | "postponed" | "cancelled";

export interface LoanInstallment {
  id: string;
  installmentNo: number;
  dueMonth: number;
  dueYear: number;
  amount: number;
  status: InstallmentStatus;
  payrollRun?: string;
  postponedFromId?: string;
  postponedToId?: string;
  newDueMonth?: number;
  newDueYear?: number;
}

export interface LoanRecord extends Record<string, string> {
  Loan: string;
  Company: string;
  Employee: string;
  "Employee Code": string;
  Department: string;
  "Loan type": string;
  "Loan amount": string;
  "Installment amount": string;
  "Number of installments": string;
  "Start month": string;
  "Start year": string;
  Remarks: string;
  Status: LoanStatus;
  Schedule: string;
}

export interface PayrollLoanLine {
  employeeCode: string;
  loanDeduction: number;
}

export function loanInstallmentCount(loanAmount: number, installmentAmount: number) {
  if (loanAmount <= 0 || installmentAmount <= 0) return 0;
  return Math.ceil(money(loanAmount) / money(installmentAmount));
}

export function addMonths(month: number, year: number, offset: number) {
  const index = year * 12 + (month - 1) + offset;
  return { month: (index % 12) + 1, year: Math.floor(index / 12) };
}

export function buildLoanSchedule(loanAmount: number, installmentAmount: number, startMonth: number, startYear: number): LoanInstallment[] {
  const count = loanInstallmentCount(loanAmount, installmentAmount);
  let remaining = money(loanAmount);
  return Array.from({ length: count }, (_, index) => {
    const due = addMonths(startMonth, startYear, index);
    const amount = money(Math.min(installmentAmount, remaining));
    remaining = money(remaining - amount);
    return {
      id: `INS-${index + 1}`,
      installmentNo: index + 1,
      dueMonth: due.month,
      dueYear: due.year,
      amount,
      status: "pending"
    };
  });
}

export function parseLoanSchedule(value?: string): LoanInstallment[] {
  try {
    return value ? JSON.parse(value) as LoanInstallment[] : [];
  } catch {
    return [];
  }
}

export function loanBalance(loan: Pick<LoanRecord, "Loan amount" | "Schedule">) {
  const paid = parseLoanSchedule(loan.Schedule)
    .filter(item => item.status === "deducted")
    .reduce((sum, item) => sum + item.amount, 0);
  return money(amountValue(loan["Loan amount"]) - paid);
}

export function pendingLoanDeduction(loans: Array<Pick<LoanRecord, "Employee Code" | "Status" | "Schedule">>, employeeCode: string, month: number, year: number) {
  return loans
    .filter(loan => loan["Employee Code"] === employeeCode && loan.Status === "active")
    .flatMap(loan => parseLoanSchedule(loan.Schedule))
    .filter(item => item.status === "pending" && item.dueMonth === month && item.dueYear === year)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function applyLoanDeductions<T extends PayrollLoanLine>(rows: T[], loans: Array<Pick<LoanRecord, "Employee Code" | "Status" | "Schedule">>, month: number, year: number): T[] {
  return rows.map(row => ({ ...row, loanDeduction: pendingLoanDeduction(loans, row.employeeCode, month, year) }));
}

export function markPayrollInstallmentsDeducted<T extends LoanRecord>(loans: T[], employeeCodes: string[], month: number, year: number, payrollRun: string): T[] {
  const employeeSet = new Set(employeeCodes);
  return refreshCompletedLoans(loans.map(loan => {
    if (loan.Status !== "active" || !employeeSet.has(loan["Employee Code"])) return loan;
    const schedule = parseLoanSchedule(loan.Schedule).map(item => item.status === "pending" && item.dueMonth === month && item.dueYear === year
      ? { ...item, status: "deducted" as InstallmentStatus, payrollRun }
      : item);
    return { ...loan, Schedule: JSON.stringify(schedule) };
  }));
}

export function releasePayrollInstallments<T extends LoanRecord>(loans: T[], payrollRun: string): T[] {
  return loans.map(loan => {
    const schedule = parseLoanSchedule(loan.Schedule).map(item => item.payrollRun === payrollRun && item.status === "deducted"
      ? { ...item, status: "pending" as InstallmentStatus, payrollRun: "" }
      : item);
    return { ...loan, Status: loan.Status === "completed" && schedule.some(item => item.status === "pending") ? "active" : loan.Status, Schedule: JSON.stringify(schedule) };
  });
}

export function postponeInstallment<T extends LoanRecord>(loan: T, installmentId: string): T {
  const schedule = parseLoanSchedule(loan.Schedule);
  const target = schedule.find(item => item.id === installmentId);
  if (!target || target.status !== "pending") return loan;
  const latest = schedule.reduce((last, item) => item.dueYear > last.dueYear || (item.dueYear === last.dueYear && item.dueMonth > last.dueMonth) ? item : last, schedule[0]);
  const nextDue = addMonths(latest.dueMonth, latest.dueYear, 1);
  const replacement: LoanInstallment = {
    id: `INS-${Date.now()}`,
    installmentNo: Math.max(...schedule.map(item => item.installmentNo)) + 1,
    dueMonth: nextDue.month,
    dueYear: nextDue.year,
    amount: target.amount,
    status: "pending",
    postponedFromId: target.id
  };
  const nextSchedule = schedule.map(item => item.id === installmentId
    ? { ...item, status: "postponed" as InstallmentStatus, postponedToId: replacement.id, newDueMonth: nextDue.month, newDueYear: nextDue.year }
    : item);
  return { ...loan, Schedule: JSON.stringify([...nextSchedule, replacement]) };
}

export function cancelLoan<T extends LoanRecord>(loan: T): T {
  return {
    ...loan,
    Status: "cancelled",
    Schedule: JSON.stringify(parseLoanSchedule(loan.Schedule).map(item => item.status === "pending" ? { ...item, status: "cancelled" as InstallmentStatus } : item))
  };
}

export function refreshCompletedLoans<T extends LoanRecord>(loans: T[]): T[] {
  return loans.map(loan => {
    if (loan.Status !== "active") return loan;
    return parseLoanSchedule(loan.Schedule).some(item => item.status === "pending") ? loan : { ...loan, Status: "completed" };
  });
}

export function amountValue(value?: string) {
  return Number(String(value || "0").replace(/[^0-9.-]/g, "")) || 0;
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
