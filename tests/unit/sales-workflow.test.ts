import { describe, expect, it } from "vitest";
import { advanceWorkflow, approveWorkflow, generateWorkflowDocument, seedSalesWorkflows, validateStageExit, workflowTotals } from "@/lib/sales-workflow";

describe("local sales workflow", () => {
  it("blocks SFS discount stage until approval is approved", () => {
    const record = seedSalesWorkflows()[0];

    expect(validateStageExit(record)).toContain("approval");
    expect(validateStageExit(approveWorkflow(record, "Approved"))).toBe("");
  });

  it("generates required local documents before stage transition", () => {
    const record = { ...approveWorkflow(seedSalesWorkflows()[0], "Approved"), stageIndex: 9 };

    expect(advanceWorkflow(record).error).toContain("sales order");
    const generated = generateWorkflowDocument(record, "Sales Order").record;
    expect(generated.documents[0]).toMatchObject({ type: "Sales Order", status: "Draft" });
    expect(advanceWorkflow(generated).record.stageIndex).toBe(10);
  });

  it("calculates margin from multi-line records", () => {
    const totals = workflowTotals(seedSalesWorkflows()[0]);

    expect(totals.net).toBeGreaterThan(0);
    expect(totals.marginPercent).toBeGreaterThan(0);
    expect(totals.maxDiscountPercent).toBe(12);
  });
});
