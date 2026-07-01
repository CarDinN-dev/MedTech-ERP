import { beforeEach, describe, expect, it } from "vitest";
import { approvalRequired, decideApprovalRequest, submitApprovalRequest } from "@/lib/approval-matrix";
import { demoRecordsStorageKey, readDemoRecordsSnapshot } from "@/lib/demo-store";
import { issueDocumentNumber } from "@/lib/document-control";
import { hasPermission, permissionError } from "@/lib/erp-security";
import { validateJournal, writeFinanceJournalDraft } from "@/lib/finance-workflow";
import { calculateNetPay, estimateQatarGratuity } from "@/lib/hr-calculations";
import { runInventoryAction, stockSeeds } from "@/lib/inventory-workflow";
import { runLocalDemoAutomations } from "@/lib/local-workflows";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { runProcurementAction } from "@/lib/procurement-workflow";
import { calculateLine, costingSummary, seedCostingSheets } from "@/lib/sales-costing";
import { getSalesCrmConfig } from "@/lib/sales-crm";
import { generateWorkflowDocument, seedSalesWorkflows, validateStageExit } from "@/lib/sales-workflow";
import type { DemoRecord } from "@/lib/demo-store";

describe("critical ERP journey QA", () => {
  beforeEach(() => localStorage.clear());

  it("validates Universal Enquiry Pool BANT scoring", () => {
    const config = getSalesCrmConfig("sales", "Universal Enquiry Pool")!;
    const lead = config.prepareSave({
      Source: "Website",
      "Received Date": "2026-06-20",
      "Contact Name": "QA Lead",
      Organization: "QA Hospital",
      Email: "qa@example.com",
      "Product Interest": "Patient Monitor",
      "Suggested BU": "Medical Equipment",
      "BANT Budget Score": "3",
      "BANT Authority Score": "2",
      "BANT Need Score": "2",
      "BANT Timeline Score": "1"
    }, []);

    expect(lead).toMatchObject({ "BANT Total": "8", "Qualification Result": "Qualified" });
  });

  it("validates costing calculations and approval thresholds", () => {
    const sheet = seedCostingSheets()[0];
    const line = calculateLine({ ...sheet.lines[0], Quantity: 2, "Native Unit Cost": 100, "Exchange Rate": 3.64, "Margin %": 25, "Discount %": 5 });

    expect(line["Line Total Selling Price"]).toBeGreaterThan(line["Landed Cost"]);
    expect(costingSummary({ lines: [line] })["Gross Margin %"]).toBeGreaterThan(0);
    expect(approvalRequired({ sourceModule: "Procurement", sourceRecord: "PO-50K", requestType: "Purchase order", requestedBy: "QA", amount: 50000 }).required).toBe(false);
    expect(approvalRequired({ sourceModule: "Procurement", sourceRecord: "PO-50K-1", requestType: "Purchase order", requestedBy: "QA", amount: 50001 }).rule?.id).toBe("APR-PO-50000");
  });

  it("validates sales stage transitions before document generation", () => {
    const record = { ...seedSalesWorkflows()[0], approvalStatus: "Approved" as const, stageIndex: 9 };

    expect(validateStageExit(record)).toContain("sales order");
    expect(validateStageExit(generateWorkflowDocument(record, "Sales Order").record)).toBe("");
  });

  it("runs the procurement PR to RFQ to PO to approved GRN draft helper flow", () => {
    const [pr] = medtechScopeViews["procurement.Purchase Requests"].rows.map(row => ({ ...row, __id: "pr-qa" })) as DemoRecord[];

    expect(runProcurementAction("generate-rfq", [pr], "QA")).toMatchObject({ targetTab: "RFQs" });
    const [rfq] = readDemoRecordsSnapshot("procurement:RFQs", []);
    expect(runProcurementAction("compare-supplier", [rfq], "QA")).toMatchObject({ targetTab: "Supplier Comparison" });
    const [comparison] = readDemoRecordsSnapshot("procurement:Supplier Comparison", []);
    comparison.Price = "QAR 94,750";
    expect(runProcurementAction("generate-po", [comparison], "QA")).toMatchObject({ targetTab: "Purchase Orders" });
    const [po] = readDemoRecordsSnapshot("procurement:Purchase Orders", []);

    expect(runProcurementAction("generate-grn", [po], "QA")).toMatchObject({ error: expect.stringContaining("approved") });
    const approval = submitApprovalRequest({ sourceModule: "Procurement", sourceRecord: po["PO No"], requestType: "Purchase order", requestedBy: "QA", amount: 94750, businessUnit: "Diagnostics" }).request!;
    decideApprovalRequest(approval["Approval Request No"], "Approved", "Aisha Rahman", "ok");
    expect(runProcurementAction("generate-grn", [po], "QA")).toMatchObject({ targetTab: "Goods Receipts" });
  });

  it("validates inventory FEFO, expiry, and movement helpers", () => {
    const released = stockSeeds().filter(row => row.SKU === "DX-TRP-100" && row["QC Status"] === "Released" && row["Expiry Date"]).sort((a, b) => a["Expiry Date"].localeCompare(b["Expiry Date"]))[0] as DemoRecord;
    const result = runInventoryAction("fefo-reserve", [{ ...released, __id: "stock-qa" }], "QA");
    const [reservation] = readDemoRecordsSnapshot("inventory:Reservations", []);

    expect(result).toMatchObject({ targetTab: "Reservations" });
    expect(reservation).toMatchObject({ "FEFO Suggested": "Yes", "Lot/Batch/Serial": released["Lot/Batch/Serial"] });
  });

  it("validates finance double-entry rules", () => {
    expect(validateJournal({ "Debit Lines": "1200 AR=QAR 100", "Credit Lines": "4000 Sales=QAR 99", "Total Debit": "QAR 100", "Total Credit": "QAR 99" })).toBe("Journal is not balanced.");
    expect(writeFinanceJournalDraft({ sourceModule: "QA", sourceRecord: "QA-JRN", amount: "QAR 100", debit: "1200 AR", credit: "4000 Sales" }).Validation).toBe("Balanced");
  });

  it("validates payroll and EOS helper calculations", () => {
    expect(calculateNetPay({ baseSalary: 12000, deductedAbsenceDays: 1.5, items: [{ effect: "Earning", amount: 500 }, { effect: "Deduction", amount: 200 }] })).toMatchObject({ absenceDeduction: 600, netPay: 11700 });
    expect(estimateQatarGratuity("2023-01-01", "2026-01-01", 12000).amount).toBeGreaterThan(25000);
  });

  it("generates controlled document numbers and safely reads migrated localStorage", () => {
    expect(issueDocumentNumber("Quotation")).toBe("QTN-2026-0001");
    expect(issueDocumentNumber("Quotation")).toBe("QTN-2026-0002");

    localStorage.setItem(demoRecordsStorageKey("sales:Customer Master"), "{bad");
    expect(readDemoRecordsSnapshot("sales:Customer Master", [{ Name: "Seed", Status: "Active" }])[0].Name).toBe("Seed");
    localStorage.removeItem(demoRecordsStorageKey("sales:Customer Master"));
    localStorage.setItem("medtech-demo:sales:Customer Master:records:v1", JSON.stringify([{ Name: "Old customer" }]));
    expect(readDemoRecordsSnapshot("sales:Customer Master", [{ Name: "", Status: "Active" }])[0]).toMatchObject({ Name: "Old customer", Status: "" });
  });

  it("validates permission checks and automation trigger generation", () => {
    expect(hasPermission("Read-only Auditor", "Finance", "view")).toBe(true);
    expect(permissionError({ name: "Audit", email: "audit@example.com", role: "Read-only Auditor", department: "Audit", initials: "A" }, "Finance", "edit")).toContain("cannot edit");

    const triggers = runLocalDemoAutomations("QA Automation");
    expect(triggers).toHaveLength(17);
    expect(triggers.every(row => row.Notes.includes("no external service called"))).toBe(true);
    expect(readDemoRecordsSnapshot("admin:Automation Monitor", []).filter(row => row["Run By"] === "QA Automation")).toHaveLength(17);
  });
});
