import { describe, expect, it } from "vitest";
import { readDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { runFinanceAction } from "@/lib/finance-workflow";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { runProjectAction } from "@/lib/project-workflow";

describe("local project workflow", () => {
  it("creates projects from PSO, links inventory/documents, and drafts milestone invoices", () => {
    const setup = runProjectAction("generate-from-pso", "Projects", [], "Project Manager");
    expect(setup).toMatchObject({ targetTab: "Projects" });
    expect(readDemoRecordsSnapshot("projects:Projects", [])[0]).toMatchObject({ Customer: "National Reference Lab", Status: "Budget approval" });
    expect(readDemoRecordsSnapshot("projects:Budgets", [])[0].Margin).toContain("%");
    expect(readDemoRecordsSnapshot("projects:Milestones", []).some(row => row["Billing Type"] === "Retention")).toBe(true);

    const [deliverable] = readDemoRecordsSnapshot("projects:Deliverables", []) as DemoRecord[];
    const delivery = runProjectAction("create-inventory-delivery", "Deliverables", [deliverable], "Project Manager");
    expect(delivery).toMatchObject({ targetModule: "inventory", targetTab: "Stock Movements" });
    expect(readDemoRecordsSnapshot("inventory:Stock Movements", [])[0].Type).toBe("Project delivery dispatch");

    const docs = runProjectAction("create-document-pack", "Deliverables", [deliverable], "Project Manager");
    expect(docs).toMatchObject({ targetTab: "Project Documents" });
    expect(readDemoRecordsSnapshot("documents:Generated Documents", [])[0]["Source module"]).toBe("Projects");

    const [billing] = medtechScopeViews["projects.Milestone Billing"].rows.map(row => ({ ...row, __id: "bill-1" })) as DemoRecord[];
    const invoice = runFinanceAction("generate-project-invoice", [billing], "Finance Manager");
    expect(invoice).toMatchObject({ targetTab: "Advance / Progress / Retention Invoices" });
    expect(readDemoRecordsSnapshot("finance:Advance / Progress / Retention Invoices", [])[0]).toMatchObject({ "Invoice Type": "Progress Invoice", Amount: "QAR 1200000" });
  });
});
