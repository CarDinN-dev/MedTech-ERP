import { describe, expect, it } from "vitest";
import { buildWpsRows, validateWpsExport } from "@/lib/wps-export";

describe("WPS export", () => {
  it("validates required employee payment fields", () => {
    expect(validateWpsExport([
      { employeeCode: "MT-0018", employeeName: "Fahad", paidDays: 0, netSalary: -1, salaryAmount: 0, remarks: "" }
    ], [
      { employeeCode: "MT-0018", employeeName: "Fahad", bankName: "", accountNumber: "", iban: "", qidOrEmployeeId: "" }
    ])).toEqual([
      { employee: "Fahad", missingField: "Bank Name" },
      { employee: "Fahad", missingField: "Account Number / IBAN" },
      { employee: "Fahad", missingField: "QID / Employee ID" },
      { employee: "Fahad", missingField: "Non-negative Net Salary" },
      { employee: "Fahad", missingField: "Paid Days" },
      { employee: "Fahad", missingField: "Salary Amount" }
    ]);
  });

  it("uses configured WPS columns in order", () => {
    expect(buildWpsRows([
      { employeeCode: "MT-0018", employeeName: "Fahad", paidDays: 30, netSalary: 18000, salaryAmount: 20000, remarks: "ok" }
    ], [
      { employeeCode: "MT-0018", employeeName: "Fahad", bankName: "QNB", accountNumber: "123", iban: "QA123", qidOrEmployeeId: "28763491230" }
    ], {
      company: "MedTech",
      department: "Sales",
      month: "June",
      year: "2026",
      payrollRunId: "RUN-1",
      generatedBy: "Kashif",
      generatedAt: "2026-06-29T12:00:00.000Z",
      wpsFormat: "qatar_wps"
    }, ["Employee Code", "Net Salary", "Bank Name"])).toEqual([{ "Employee Code": "MT-0018", "Net Salary": 18000, "Bank Name": "QNB" }]);
  });
});
