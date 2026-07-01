import { describe, expect, it } from "vitest";
import { createDemoRecord, readDemoRecordsSnapshot, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { runQualityAction } from "@/lib/quality-workflow";

describe("local quality workflow", () => {
  it("drafts RMA credit notes and quarantines recalled local stock", () => {
    const rma = createDemoRecord({
      "RMA No": "RMA-TEST-1",
      Customer: "Hamad Medical Corporation",
      "Source Invoice / Delivery": "INV-2026-00481 / DO-2026-00281",
      Product: "Troponin I Reagent Kit",
      SKU: "DX-TRP-100",
      "Lot/Batch/Serial": "LOT-TI-2604",
      Quantity: "2",
      Reason: "Temperature excursion claim",
      Condition: "Unopened",
      "Return Date": "2026-06-24",
      "QC Status": "Pending",
      Resolution: "Credit Note",
      Status: "QC pending"
    }) as DemoRecord;

    const credit = runQualityAction("rma-credit-note", "Customer Returns / RMA", [rma], "Quality Team");
    expect(credit).toMatchObject({ targetModule: "finance", targetTab: "Credit Notes" });
    expect(readDemoRecordsSnapshot("finance:Credit Notes", []).some(row => row.Reason.includes("RMA-TEST-1"))).toBe(true);

    writeDemoRecordsSnapshot("inventory:Stock On Hand", medtechScopeViews["inventory.Stock On Hand"].rows.map(createDemoRecord));
    const recall = createDemoRecord({
      "Recall No": "REC-TEST-1",
      Product: "Troponin I Reagent Kit",
      "Batch/Lot": "LOT-TI-2604",
      "Affected Customers": "Pending trace",
      "Affected Stock": "Pending trace",
      "Recall Reason": "Manufacturer notice",
      "Action Required": "Quarantine",
      Status: "Draft"
    }) as DemoRecord;

    const traced = runQualityAction("trace-recall", "Batch Recall", [recall], "Regulatory Affairs");
    expect(traced).toMatchObject({ message: expect.stringContaining("quarantined") });
    const quarantined = readDemoRecordsSnapshot("inventory:Stock On Hand", []).find(row => row["Lot/Batch/Serial"] === "LOT-TI-2604");
    expect(quarantined).toMatchObject({ "QC Status": "Quarantine", Status: "Quarantine", "Available Quantity": "0" });
  });
});
