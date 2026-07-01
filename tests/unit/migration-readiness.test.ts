import { describe, expect, it } from "vitest";
import { getImportTarget, inferImportTarget, validateImportRows } from "@/lib/migration-readiness";

describe("migration readiness imports", () => {
  it("detects import targets from workbook headers", () => {
    const target = inferImportTarget(["PO No", "Supplier", "Total"], "Open POs", "legacy.xlsx");
    expect(target.key).toBe("open_pos");
  });

  it("imports valid rows and reports duplicate keys", () => {
    const target = getImportTarget("customers");
    const result = validateImportRows(target, [
      { "Customer Code": "CUS-1", "Customer Name": "Valid Customer" },
      { "Customer Code": "CUS-1", "Customer Name": "Duplicate Customer" }
    ]);

    expect(result.valid).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.errors[0].message).toBe(`Duplicate ${target.keyColumn}`);
  });

  it("keeps employee extension imports away from Employee Master fields", () => {
    const target = getImportTarget("employee_extensions");
    const result = validateImportRows(target, [
      { "Employee No": "MT-0018", "Extension Type": "Document", "Field Name": "License", "Field Value": "Valid", Department: "Sales" }
    ]);

    expect(result.valid).toHaveLength(0);
    expect(result.errors[0].message).toContain("Employee Master columns are not allowed");
  });
});
