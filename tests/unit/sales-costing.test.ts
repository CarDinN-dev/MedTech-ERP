import { describe, expect, it } from "vitest";
import { approvalReasons, calculateLine, costingSummary, costingWarnings, seedCostingSheets } from "@/lib/sales-costing";

describe("sales costing", () => {
  it("calculates landed cost, selling price and gross margin", () => {
    const sheet = seedCostingSheets()[0];
    const summary = costingSummary(sheet);

    expect(summary["Total Cost QAR"]).toBeGreaterThan(0);
    expect(summary["Total Landed Cost"]).toBeGreaterThan(summary["Total Cost QAR"]);
    expect(summary["Final Quotation Value"]).toBeGreaterThan(summary["Total Landed Cost"]);
    expect(summary["Gross Margin %"]).toBeGreaterThan(0);
  });

  it("applies discount after margin price calculation", () => {
    const line = calculateLine({ ...seedCostingSheets()[0].lines[0], "Margin %": 25, "Discount %": 10 });

    expect(line["Selling Unit Price"]).toBeGreaterThan(line["Final Unit Price"]);
    expect(line["Gross Profit"]).toBeCloseTo(line["Line Total Selling Price"] - line["Landed Cost"], 2);
  });

  it("flags low margin, tender and controlled-product approvals", () => {
    const tender = seedCostingSheets()[1];

    expect(approvalReasons(tender)).toContain("Pharma Tender special pricing");
    expect(costingWarnings(tender).some(warning => warning.includes("expiry-controlled") || warning.includes("batch-tracked"))).toBe(true);
  });
});
