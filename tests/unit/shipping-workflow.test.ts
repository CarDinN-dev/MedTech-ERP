import { describe, expect, it } from "vitest";
import { readDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { getShippingView, runShippingAction } from "@/lib/shipping-workflow";

describe("local shipping workflow", () => {
  it("creates pick, pack, shipment, POD, and backorder records locally", () => {
    const [order] = getShippingView("Delivery Orders")!.rows.map((row, index) => ({ ...row, __id: `do-${index}` })) as DemoRecord[];

    const pick = runShippingAction("create-pick-list", "Delivery Orders", [order], "Shipping Test");
    expect(pick).toMatchObject({ targetTab: "Pick Lists" });
    const [pickRow] = readDemoRecordsSnapshot("shipping:Pick Lists", []);
    expect(pickRow).toMatchObject({ "Delivery Order No": order["Delivery Order No"], "FEFO Suggestion": "Yes", "QC Status": "Released" });
    expect(readDemoRecordsSnapshot("inventory:Reservations", [])[0]).toMatchObject({ "FEFO Suggested": "Yes", "Dispatch Blocked": "No" });

    const backorder = runShippingAction("partial-backorder", "Pick Lists", [{ ...pickRow, "Quantity Picked": "6" }], "Shipping Test");
    expect(backorder).toMatchObject({ targetTab: "Partial Deliveries / Backorders" });
    expect(readDemoRecordsSnapshot("shipping:Partial Deliveries / Backorders", [])[0]).toMatchObject({ Status: "Open", "Quantity Backordered": "6" });

    const pack = runShippingAction("create-packing-list", "Pick Lists", [pickRow], "Shipping Test");
    expect(pack).toMatchObject({ targetTab: "Packing Lists" });
    const [packRow] = readDemoRecordsSnapshot("shipping:Packing Lists", []);
    expect(packRow["Temperature Controlled Required"]).toBe("Yes");

    const shipment = runShippingAction("create-shipment", "Packing Lists", [packRow], "Shipping Test");
    expect(shipment).toMatchObject({ targetTab: "Shipments" });
    const [shipmentRow] = readDemoRecordsSnapshot("shipping:Shipments", []);
    expect(shipmentRow.Status).toBe("Out for delivery");

    expect(runShippingAction("complete-delivery", "Shipments", [shipmentRow], "Shipping Test")).toMatchObject({ targetTab: "Proof of Delivery" });
    expect(readDemoRecordsSnapshot("shipping:Proof of Delivery", [])[0]).toMatchObject({ Status: "Received", "Receiver Signature Placeholder": "Signature captured locally" });
    expect(readDemoRecordsSnapshot("finance:Customer Invoices", [])[0].Status).toBe("Delivered locally");
  });

  it("blocks packing quarantined picks", () => {
    const badPick = { __id: "pick-bad", "Pick List No": "PICK-BAD", "Delivery Order No": "DO-BAD", "Product Lines": "Troponin I Reagent Kit", "Quantity Ordered": "1", "Quantity Picked": "0", "QC Status": "Quarantine", Status: "Blocked" };
    expect(runShippingAction("create-packing-list", "Pick Lists", [badPick], "Shipping Test")).toMatchObject({ error: expect.stringContaining("blocked") });
  });
});
