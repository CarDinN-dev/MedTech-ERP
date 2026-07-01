import { describe, expect, it } from "vitest";
import { expertLayerTabs, getModule, type ModuleKey } from "@/lib/erp-data";
import { getDemoTabView } from "@/lib/demo-tabs";
import { hrExpertTabs, hrViews } from "@/lib/hr-data";
import { buildReportingModel } from "@/lib/reporting-data";

describe("expert department layer coverage", () => {
  it("registers local expert tabs with seeded editable views", () => {
    for (const [moduleKey, tabs] of Object.entries(expertLayerTabs) as Array<[ModuleKey, string[]]>) {
      const erpModule = getModule(moduleKey);
      expect(erpModule, moduleKey).toBeTruthy();

      for (const tab of tabs) {
        expect(erpModule.tabs, `${moduleKey}.${tab}`).toContain(tab);
        const view = getDemoTabView(erpModule, tab);
        expect(view.rows.length, `${moduleKey}.${tab} rows`).toBeGreaterThan(0);
        expect(view.columns, `${moduleKey}.${tab} status`).toContain("Status");
      }
    }
  });

  it("adds HR linked expert tabs without changing Employee Master rows", () => {
    expect(hrViews.Employees.rows).toHaveLength(6);
    expect(hrViews.Employees.columns).toEqual(["Employee No", "Full Name", "Department", "Job Title", "Line Manager", "Date Joined", "Status"]);

    for (const tab of hrExpertTabs) {
      const view = hrViews[tab];
      expect(view.rows.length, tab).toBeGreaterThan(0);
      expect(view.columns, tab).toContain("Status");
    }
  });

  it("surfaces the management expert layer in local reports", () => {
    const model = buildReportingModel();
    const management = model.dashboards.find(dashboard => dashboard.id === "management");

    expect(management).toBeTruthy();
    expect(management?.rows.map(row => row.KPI)).toEqual(expect.arrayContaining([
      "Executive action center",
      "Pending approvals by department",
      "High-risk items",
      "BU profitability",
      "Customer profitability",
      "Product profitability",
      "Department KPI scorecards",
      "Risk register",
      "Decision log"
    ]));
  });
});
