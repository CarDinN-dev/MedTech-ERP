export type PayrollEffect = "Earning" | "Deduction" | "Neutral";

export interface PayrollItemInput {
  quantity: number;
  rateAmount: number;
  fixedAmount?: number;
  effect: PayrollEffect;
}

export interface PayrollSummaryInput {
  baseSalary: number;
  items: Array<{ effect: PayrollEffect; amount: number }>;
  deductedAbsenceDays?: number;
  periodDays?: number;
}

export function calculatePayrollItem(input: PayrollItemInput) {
  const quantity = Math.max(0, finite(input.quantity));
  const rate = Math.max(0, finite(input.rateAmount));
  const fixed = Math.max(0, finite(input.fixedAmount ?? 0));
  const calculatedAmount = roundMoney(fixed > 0 ? fixed : quantity * rate);
  const netEffect = input.effect === "Earning" ? calculatedAmount : input.effect === "Deduction" ? -calculatedAmount : 0;
  return { calculatedAmount, netEffect };
}

export function calculateNetPay(input: PayrollSummaryInput) {
  const baseSalary = Math.max(0, finite(input.baseSalary));
  const periodDays = Math.max(1, Math.floor(finite(input.periodDays ?? 30)));
  const dailyRate = roundMoney(baseSalary / periodDays);
  const absenceDeduction = roundMoney(Math.max(0, finite(input.deductedAbsenceDays ?? 0)) * dailyRate);
  const earnings = roundMoney(input.items.filter(item => item.effect === "Earning").reduce((sum, item) => sum + Math.max(0, finite(item.amount)), 0));
  const deductions = roundMoney(input.items.filter(item => item.effect === "Deduction").reduce((sum, item) => sum + Math.max(0, finite(item.amount)), 0));
  return { baseSalary, dailyRate, earnings, deductions, absenceDeduction, netPay: roundMoney(baseSalary + earnings - deductions - absenceDeduction) };
}

export function inclusiveLeaveDays(start: string | Date, end: string | Date) {
  const from = toUtcDate(start); const to = toUtcDate(end);
  if (!from || !to || to < from) return 0;
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

export function estimateQatarGratuity(joinDate: string | Date, endDate: string | Date, lastBasicSalary: number) {
  const from = toUtcDate(joinDate); const to = toUtcDate(endDate);
  if (!from || !to || to <= from) return { serviceYears: 0, eligibleDays: 0, amount: 0 };
  const serviceYears = (to.getTime() - from.getTime()) / (365.25 * 86_400_000);
  const eligibleDays = serviceYears * 21;
  const dailyBasic = Math.max(0, finite(lastBasicSalary)) / 30;
  return { serviceYears: Number(serviceYears.toFixed(2)), eligibleDays: Number(eligibleDays.toFixed(2)), amount: roundMoney(eligibleDays * dailyBasic) };
}

function finite(value: number) { return Number.isFinite(value) ? value : 0; }
function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function toUtcDate(value: string | Date) { const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`); return Number.isNaN(date.getTime()) ? null : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
