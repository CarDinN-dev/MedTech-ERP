import { describe, expect, it } from "vitest";
import { applyLoanDeductions, buildLoanSchedule, cancelLoan, loanBalance, loanInstallmentCount, markPayrollInstallmentsDeducted, postponeInstallment } from "@/lib/payroll-loans";

const loan = {
  Loan: "LOAN-1",
  Company: "MedTech",
  Employee: "Omar Nasser",
  "Employee Code": "MT-0072",
  Department: "Warehouse",
  "Loan type": "Employee loan",
  "Loan amount": "QAR 1,000.00",
  "Installment amount": "QAR 300.00",
  "Number of installments": "4",
  "Start month": "11",
  "Start year": "2026",
  Remarks: "",
  Status: "active" as const,
  Schedule: JSON.stringify(buildLoanSchedule(1000, 300, 11, 2026))
};

describe("employee loan payroll integration", () => {
  it("builds monthly schedule with final balance installment", () => {
    const schedule = buildLoanSchedule(1000, 300, 11, 2026);
    expect(loanInstallmentCount(1000, 300)).toBe(4);
    expect(schedule.map(item => [item.dueMonth, item.dueYear, item.amount])).toEqual([
      [11, 2026, 300],
      [12, 2026, 300],
      [1, 2027, 300],
      [2, 2027, 100]
    ]);
  });

  it("deducts only pending installment for payroll period", () => {
    expect(applyLoanDeductions([{ employeeCode: "MT-0072", loanDeduction: 0 }], [loan], 11, 2026)[0].loanDeduction).toBe(300);
  });

  it("marks finalized payroll installments and prevents duplicate pending deduction", () => {
    const finalized = markPayrollInstallmentsDeducted([loan], ["MT-0072"], 11, 2026, "MPR-1");
    expect(loanBalance(finalized[0])).toBe(700);
    expect(applyLoanDeductions([{ employeeCode: "MT-0072", loanDeduction: 0 }], finalized, 11, 2026)[0].loanDeduction).toBe(0);
  });

  it("postpones selected installment to next available month and keeps balance", () => {
    const postponed = postponeInstallment(loan, "INS-1");
    expect(loanBalance(postponed)).toBe(1000);
    expect(JSON.parse(postponed.Schedule).map((item: { status: string; dueMonth: number; dueYear: number; newDueMonth?: number }) => [item.status, item.dueMonth, item.dueYear, item.newDueMonth])).toContainEqual(["postponed", 11, 2026, 3]);
  });

  it("cancels only pending installments", () => {
    expect(JSON.parse(cancelLoan(loan).Schedule).every((item: { status: string }) => item.status === "cancelled")).toBe(true);
  });
});
