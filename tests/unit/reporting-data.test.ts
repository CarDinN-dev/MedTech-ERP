import { describe, expect, it } from "vitest";
import { buildReportingModel, filterReportRows } from "@/lib/reporting-data";

describe("reporting data", () => {
  it("builds local dashboards and filters by BU", () => {
    const model = buildReportingModel();
    expect(model.dashboards).toHaveLength(15);
    expect(model.rows.some(row => row.KPI === "Revenue by BU vs target")).toBe(true);

    const diagnostics = filterReportRows(model.rows, { bu: "Diagnostics" });
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.every(row => row.BU === "Diagnostics")).toBe(true);
  });
});
