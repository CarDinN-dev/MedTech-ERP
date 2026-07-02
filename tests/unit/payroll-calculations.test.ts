import { describe, expect, it } from "vitest";
import { calculateLeaveSettlement, calculateMonthlyPayrollLine, validateMonthlyPayroll, type MonthlyPayrollLineInput } from "@/lib/payroll-calculations";

const line: MonthlyPayrollLineInput = {
  employeeCode: "MT-0018",
  employeeName: "Fahad Al-Kuwari",
  basicSalary: 14500,
  allowances: 5500,
  grossSalary: 20000,
  workingDays: 26,
  paidDays: 15,
  unpaidDays: 15,
  leaveDays: 0,
  loanDeduction: 2000,
  otherDeductions: 250,
  overtimeHours: 4,
  overtimeAmount: 500,
  salaryAdvanceAmount: 300,
  salaryAdjustmentAmount: -100,
  paidVacationSalaryAmount: 0,
  insuranceRefundAmount: 50,
  airTicketEncashmentAmount: 0,
  leaveSettlementAmount: 1000,
  eosSettlementAmount: 0,
  hasBankDetails: true
};

describe("monthly payroll calculations", () => {
  it("uses calendar days for salary payable", () => {
    expect(calculateMonthlyPayrollLine(line, { salaryCalculationMethod: "calendar_days", configuredWorkingDays: 26 }, 30)).toEqual({
      salaryPayable: 10000,
      totalEarnings: 1550,
      totalDeductions: 2650,
      netPay: 8900
    });
  });

  it("uses configured working days for salary payable", () => {
    expect(calculateMonthlyPayrollLine(line, { salaryCalculationMethod: "working_days", configuredWorkingDays: 25 }, 30).salaryPayable).toBe(12000);
  });

  it("calculates leave settlement from selected salary basis", () => {
    expect(calculateLeaveSettlement(20000, 4.5, { salaryCalculationMethod: "calendar_days", configuredWorkingDays: 26 }, 30)).toEqual({
      salaryRatePerDay: 666.67,
      settlementAmount: 3000.02
    });
  });

  it("blocks finalization issues", () => {
    const bad = { ...line, basicSalary: 0, grossSalary: 0, hasBankDetails: false };
    expect(validateMonthlyPayroll([bad, line, line], [{ salaryPayable: 0, totalEarnings: 0, totalDeductions: 0, netPay: 0 }, { salaryPayable: 1, totalEarnings: 0, totalDeductions: 0, netPay: 1 }, { salaryPayable: 1, totalEarnings: 0, totalDeductions: 0, netPay: -1 }])).toEqual([
      "Fahad Al-Kuwari is missing salary.",
      "Fahad Al-Kuwari is missing bank details.",
      "MT-0018 is duplicated.",
      "MT-0018 is duplicated.",
      "Fahad Al-Kuwari has negative net pay."
    ]);
  });
});
