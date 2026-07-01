import { describe, expect, it } from "vitest";
import { getMasterDataConfig } from "@/lib/master-data";
import type { DemoRecord } from "@/lib/demo-store";

const records: DemoRecord[] = [];

describe("local master data", () => {
  it("generates cascading customer codes", () => {
    const config = getMasterDataConfig("sales", "Customer Master");
    const row = config!.prepareSave({
      "Customer Name": "Al Wakra Hospital - Pharmacy",
      "Organization Name": "Al Wakra Hospital",
      Segment: "Government",
      "Business Unit": "Pharma",
      "Branch / Account": "Main Campus",
      Department: "Pharmacy",
      "Customer Type": "End customer",
      Status: "Active"
    }, records);

    expect(row["Organization Code"]).toBe("ORG-AWH");
    expect(row["Account Code"]).toBe("ORG-AWH-MC");
    expect(row["Department Code"]).toBe("ORG-AWH-MC-PHAR");
    expect(row["Customer Code"]).toBe("ORG-AWH-MC-PHAR-001");
  });

  it("rejects duplicate supplier codes during import", () => {
    const config = getMasterDataConfig("procurement", "Supplier Master")!;
    const seen = new Set<string>();
    const row = { "Supplier Code": "SUP-00099", "Principal / Supplier Name": "Test Principal", Country: "Qatar", "Aligned BU": "Diagnostics", "Product Category / Brand Line": "Reagents", "Agreement Status": "Approved" };

    expect(config.validateImportRow(row, 2, records, seen)["Supplier Code"]).toBe("SUP-00099");
    expect(() => config.validateImportRow(row, 3, records, seen)).toThrow("Duplicate Supplier Code");
  });

  it("rejects products with min stock above max stock", () => {
    const config = getMasterDataConfig("inventory", "Product Master")!;

    expect(() => config.prepareSave({
      "Product Name": "Cold Chain Control Vial",
      "Business Unit": "Diagnostics",
      Category: "Reagents",
      "Supplier Code": "SUP-00019",
      "Supplier Name": "Thermo Fisher Scientific",
      Status: "Active",
      "Min Stock": "50",
      "Max Stock": "10"
    }, records)).toThrow("Min Stock cannot exceed Max Stock");
  });
});
