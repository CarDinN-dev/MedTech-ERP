import { describe, expect, it } from "vitest";
import { buildSifCsv, buildSifRows, defaultSifSettings, sifFileName, validateSifExport, type SifRunContext } from "@/lib/sif-export";

const context: SifRunContext = {
  ...defaultSifSettings,
  salaryMonth: "6",
  salaryYear: "2026",
  fileCreationDate: "20260702",
  fileCreationTime: "1130"
};

const employee = { employeeCode: "MT-0018", employeeName: "Fahad", bankShortName: "QNB", accountNumber: "10002934812", iban: "", qidOrEmployeeId: "28763491230" };
const line = {
  employeeCode: "MT-0018",
  employeeName: "Fahad",
  department: "Sales",
  paidDays: 30,
  workingDays: 30,
  netSalary: 19000,
  basicSalary: 14500,
  extraHours: 0,
  extraIncome: 1500,
  deductions: 1000,
  remarks: "Salary advance",
  housingAllowance: 4000,
  foodAllowance: 0,
  transportAllowance: 1500,
  overtimeAllowance: 0
};

describe("Qatar SIF export", () => {
  it("builds header and salary records in SIF order", () => {
    expect(buildSifRows([line], [employee])[0]).toEqual([
      1, "Fahad", "QNB", "10002934812", 19000, 14500, 0, 1500, 1000, "28763491230", "", "M", 30, "BANK", "Salary advance", 4000, 0, 1500, 0, "04"
    ]);
    expect(buildSifCsv([line], [employee], context).split("\r\n").slice(0, 3)).toEqual([
      "Employer EID,Payer IBAN,Total Salaries (QAR),Payer QID,Payer EID,No. Of Records,Salary Month,Salary Year,File Creation Time,File Creation Date,SIF Version",
      "10007230,QA58CBQA000000000000123456789,19000,,10007230,1,6,2026,1130,20260702,01",
      "Seq,Name,Bank,IBAN,Net Salary,Basic Salary,Extra Hours,Extra Income,Deductions,QID,Visa ID,Salary Freq.,Work Days,Payment Type,Remarks,House Allow.,Food Allow.,Transport Allow.,Overtime Allow.,Deduction Reason"
    ]);
  });

  it("validates SIF header and employee payment fields", () => {
    expect(validateSifExport([{ ...line, employeeCode: "", netSalary: -1, paidDays: 0, basicSalary: 0 }], [employee], { ...context, payerEid: "", payerQid: "" })).toEqual([
      { employee: "Header", missingField: "Payer EID or Payer QID" },
      { employee: "Fahad", missingField: "Employee Code" },
      { employee: "Fahad", missingField: "Employee Bank Short Name" },
      { employee: "Fahad", missingField: "Employee Account / IBAN" },
      { employee: "Fahad", missingField: "Employee QID or Visa ID" },
      { employee: "Fahad", missingField: "Non-negative Net Salary" },
      { employee: "Fahad", missingField: "Basic Salary" }
    ]);
  });

  it("uses the Qatar SIF filename convention", () => {
    expect(sifFileName(context)).toBe("SIF_10007230_CBQ_20260702_1130.csv");
  });
});
