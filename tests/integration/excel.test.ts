import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import { exportToExcel, parseExcel } from "@/lib/export/excel";
import { employeeImportColumns, normalizeEmployeeRow } from "@/lib/hr-employee-fields";
import { employeeImportSchema } from "@/lib/validation";

async function workbookFile(headers: string[], rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Employees");
  sheet.addRow(headers);
  rows.forEach(row => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer as BlobPart], "employees.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe("Excel employee import", () => {
  it("generates a styled Excel download", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await exportToExcel([{ Employee: "Aisha Rahman", Department: "Finance", Status: "Active" }], "employee-export", "Employees");
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  it("parses valid rows using the production import schema", async () => {
    const file = await workbookFile(
      ["employee_number", "full_name", "work_email", "department", "designation", "join_date", "employment_type"],
      [["MT-9001", "QA Employee", "qa.employee@medtech.qa", "Human Resources", "HR Officer", "2026-06-20", "full_time"]]
    );
    const result = await parseExcel(file, row => employeeImportSchema.parse(row));
    expect(result).toMatchObject({ total: 1, errors: [] });
    expect(result.valid[0]).toMatchObject({ employee_number: "MT-9001", full_name: "QA Employee" });
  });

  it("reports spreadsheet row numbers without rejecting the whole file", async () => {
    const file = await workbookFile(
      ["employee_number", "full_name", "work_email", "department", "designation", "join_date"],
      [["MT-9001", "Valid Employee", "valid@medtech.qa", "HR", "Officer", "2026-06-20"], ["", "X", "invalid", "", "", "20/06/2026"]]
    );
    const result = await parseExcel(file, row => employeeImportSchema.parse(row));
    expect(result.total).toBe(2);
    expect(result.valid).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
  });

  it("returns a controlled error for workbooks without worksheets", async () => {
    const workbook = new ExcelJS.Workbook();
    const buffer = await workbook.xlsx.writeBuffer();
    const file = new File([buffer as BlobPart], "empty.xlsx");
    const result = await parseExcel(file, row => row);
    expect(result).toEqual({ valid: [], errors: [{ row: 0, message: "Workbook has no worksheet" }], total: 0 });
  });

  it("preserves all 90 MedTech employee fields and disambiguates repeated dates", async () => {
    expect(employeeImportColumns).toHaveLength(90);
    const headers = ["Employee Code", "Full Name", "E-Mail ID (Work)", "Expiry Date", "Expiry Date", "Expiry Date", "Issue Date", "Issue Date"];
    const file = await workbookFile(headers, [["MED004", "AFZAL ABDULLA T", "afsal@medtechgroup.com", "2028-01-01", "2029-02-02", "2030-03-03", "2026-01-01", "2027-02-02"]]);
    const result = await parseExcel(file, row => normalizeEmployeeRow(row as Record<string, unknown>));
    expect(result.errors).toEqual([]);
    expect(result.valid[0]).toMatchObject({
      "Employee No": "MED004", "Email Address": "afsal@medtechgroup.com", "Passport Expiry Date": "2028-01-01",
      "Driving License Expiry Date": "2029-02-02", "Insurance Expiry Date": "2030-03-03", "Passport Issue Date": "2026-01-01", "Insurance Issue Date": "2027-02-02"
    });
  });
});
