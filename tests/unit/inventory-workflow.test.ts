import { describe, expect, it } from "vitest";
import { readApprovalRequests } from "@/lib/approval-matrix";
import { readDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { runInventoryAction } from "@/lib/inventory-workflow";

describe("local inventory workflow", () => {
  it("handles WMS movements, QC block, cycle count approval, engineer consumption, and kit build locally", () => {
    const stock = medtechScopeViews["inventory.Stock On Hand"].rows.map((row, index) => ({ ...row, __id: `stock-${index}` })) as DemoRecord[];
    const released = stock.find(row => row["QC Status"] === "Released" && row.SKU === "DX-TRP-100")!;
    const quarantine = stock.find(row => row["QC Status"] === "Quarantine")!;

    expect(runInventoryAction("dispatch-stock", [quarantine], "Warehouse Team")).toMatchObject({ error: expect.stringContaining("blocked") });
    expect(runInventoryAction("fefo-reserve", [released], "Warehouse Team")).toMatchObject({ targetTab: "Reservations" });
    expect(readDemoRecordsSnapshot("inventory:Reservations", [])[0]["FEFO Suggested"]).toBe("Yes");

    const [count] = medtechScopeViews["inventory.Cycle Counts"].rows.map(row => ({ ...row, __id: "count-1" })) as DemoRecord[];
    const cycle = runInventoryAction("post-cycle-count", [count], "Warehouse Team");
    expect(cycle).toMatchObject({ targetTab: "Stock Movements" });
    expect("sourceUpdates" in cycle ? (cycle as { sourceUpdates?: Record<string, string>[] }).sourceUpdates?.[0]["Approval Status"] : "").toBe("Pending approval");
    expect(readApprovalRequests().some(request => request["Source Record"] === count["Count No"] && request["Request Type"] === "Cycle count variance")).toBe(true);

    const [engineer] = medtechScopeViews["inventory.Engineer Stock"].rows.map(row => ({ ...row, __id: "eng-1" })) as DemoRecord[];
    expect(runInventoryAction("consume-engineer-stock", [engineer], "Naveen Kumar")).toMatchObject({ targetTab: "Stock Movements" });

    const [kit] = medtechScopeViews["inventory.Bundled Kits"].rows.map(row => ({ ...row, __id: "kit-1" })) as DemoRecord[];
    const built = runInventoryAction("build-kit", [kit], "Warehouse Team");
    expect(built).toMatchObject({ targetTab: "Stock Movements" });
    expect("sourceUpdates" in built ? (built as { sourceUpdates?: Record<string, string>[] }).sourceUpdates?.[0]["Build Status"] : "").toBe("Built");
    expect(readDemoRecordsSnapshot("inventory:Stock On Hand", []).some(row => row.SKU === kit["Bundle SKU"])).toBe(true);
  });
});
