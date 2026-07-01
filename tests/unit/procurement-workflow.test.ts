import { describe, expect, it } from "vitest";
import { decideApprovalRequest, submitApprovalRequest } from "@/lib/approval-matrix";
import { readDemoRecordsSnapshot } from "@/lib/demo-store";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { runProcurementAction } from "@/lib/procurement-workflow";

describe("local procurement workflow", () => {
  it("runs PR to vendor bill locally and blocks high-value PO before approval", () => {
    const [pr] = medtechScopeViews["procurement.Purchase Requests"].rows;

    expect(runProcurementAction("generate-rfq", [{ ...pr, __id: "pr-1" }], "M. Said")).toMatchObject({ targetTab: "RFQs" });
    const [rfq] = readDemoRecordsSnapshot("procurement:RFQs", []);

    expect(runProcurementAction("compare-supplier", [rfq], "M. Said")).toMatchObject({ targetTab: "Supplier Comparison" });
    const [comparison] = readDemoRecordsSnapshot("procurement:Supplier Comparison", []);
    comparison.Price = "QAR 94,750";

    expect(runProcurementAction("generate-po", [comparison], "M. Said")).toMatchObject({ targetTab: "Purchase Orders" });
    const [po] = readDemoRecordsSnapshot("procurement:Purchase Orders", []);

    expect(runProcurementAction("generate-grn", [po], "M. Said")).toMatchObject({ error: expect.stringContaining("needs approved") });
    const approval = submitApprovalRequest({ sourceModule: "Procurement", sourceRecord: po["PO No"], requestType: "Purchase order", requestedBy: "M. Said", amount: 94750, businessUnit: "Diagnostics" }).request!;
    expect(decideApprovalRequest(approval["Approval Request No"], "Approved", "Aisha Rahman", "ok").request?.Status).toBe("Approved");

    expect(runProcurementAction("generate-grn", [po], "M. Said")).toMatchObject({ targetTab: "Goods Receipts" });
    const [grn] = readDemoRecordsSnapshot("procurement:Goods Receipts", []);

    expect(runProcurementAction("generate-vendor-bill", [grn], "M. Said")).toMatchObject({ targetTab: "Vendor Bills" });
    expect(readDemoRecordsSnapshot("procurement:Vendor Bills", [])[0]["GRN No"]).toBe(grn["GRN No"]);
    expect(readDemoRecordsSnapshot("finance:Vendor Bills", [])[0].Lines).toContain(grn["GRN No"]);
    expect(readDemoRecordsSnapshot("inventory:Stock Movements", [])[0].Type).toBe("Procurement GRN receipt");
  });
});
