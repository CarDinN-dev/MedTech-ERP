import { describe, expect, it } from "vitest";
import { calculateNetPay, calculatePayrollItem, estimateQatarGratuity, inclusiveLeaveDays } from "@/lib/hr-calculations";

describe("HR payroll and leave calculations", () => {
  it("uses fixed override and signs payroll effects", () => {
    expect(calculatePayrollItem({ quantity: 12, rateAmount: 125, effect: "Earning" })).toEqual({ calculatedAmount: 1500, netEffect: 1500 });
    expect(calculatePayrollItem({ quantity: 1, rateAmount: 0, fixedAmount: 2000, effect: "Deduction" })).toEqual({ calculatedAmount: 2000, netEffect: -2000 });
    expect(calculatePayrollItem({ quantity: 4, rateAmount: 500, effect: "Neutral" }).netEffect).toBe(0);
  });

  it("combines salary, earnings, deductions and absence using the payroll month length", () => {
    expect(calculateNetPay({ baseSalary: 14500, items: [{ effect: "Earning", amount: 1500 }, { effect: "Deduction", amount: 2000 }], deductedAbsenceDays: 1, periodDays: 31 })).toEqual({ baseSalary: 14500, dailyRate: 467.74, earnings: 1500, deductions: 2000, absenceDeduction: 467.74, netPay: 13532.26 });
    expect(calculateNetPay({ baseSalary: 14500, items: [], deductedAbsenceDays: 1, periodDays: 28 }).absenceDeduction).toBe(517.86);
  });

  it("calculates inclusive leave days and rejects reversed dates", () => {
    expect(inclusiveLeaveDays("2026-06-20", "2026-06-24")).toBe(5);
    expect(inclusiveLeaveDays("2026-06-24", "2026-06-20")).toBe(0);
  });

  it("estimates gratuity from service years and 21 days per year", () => {
    const result = estimateQatarGratuity("2021-06-20", "2026-06-20", 12000);
    expect(result.serviceYears).toBeCloseTo(5, 1);
    expect(result.eligibleDays).toBeCloseTo(105, 0);
    expect(result.amount).toBeCloseTo(42000, -2);
  });
});
