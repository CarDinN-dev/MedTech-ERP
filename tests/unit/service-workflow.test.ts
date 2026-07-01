import { describe, expect, it } from "vitest";
import { readDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { runServiceAction } from "@/lib/service-workflow";

describe("local service workflow", () => {
  it("runs service lifecycle, local spare checks, invoice draft, and audit logging", () => {
    const [request] = medtechScopeViews["service.Service Requests"].rows.map(row => ({ ...row, __id: "req-1" })) as DemoRecord[];

    expect(runServiceAction("customer-check", "Service Requests", [request], "Service Test")).toMatchObject({ sourceUpdates: [{ Status: "Customer checked" }] });
    expect(runServiceAction("create-job", "Service Requests", [request], "Service Test")).toMatchObject({ targetTab: "Job Pool" });

    const [job] = readDemoRecordsSnapshot("service:Job Pool", []) as DemoRecord[];
    expect(job).toMatchObject({ "Request No": request["Request No"], Status: "Job created" });
    expect(runServiceAction("assign-coordinator", "Job Pool", [job], "Service Test")).toMatchObject({ targetTab: "Engineer Dispatch" });

    const [dispatch] = readDemoRecordsSnapshot("service:Engineer Dispatch", []) as DemoRecord[];
    expect(runServiceAction("engineer-accept", "Engineer Dispatch", [dispatch], "Service Test")).toMatchObject({ sourceUpdates: [{ Status: "Accepted" }] });
    expect(runServiceAction("start-sla", "Engineer Dispatch", [dispatch], "Service Test")).toMatchObject({ sourceUpdates: [{ "SLA Status": "Running" }] });
    expect(runServiceAction("schedule-visit", "Engineer Dispatch", [dispatch], "Service Test")).toMatchObject({ sourceUpdates: [{ "SLA Status": "Visit scheduled" }] });

    const [fieldJob] = readDemoRecordsSnapshot("service:Field Service Jobs", []) as DemoRecord[];
    expect(runServiceAction("check-spares", "Field Service Jobs", [fieldJob], "Service Test")).toMatchObject({ targetTab: "Spare Parts Requests" });
    expect(readDemoRecordsSnapshot("service:Spare Parts Requests", [])[0].Status).toContain("Available");

    const missingPart = { __id: "spr-missing", "Spare Request No": "SPR-X", "Job No": job["Job No"], Product: "Unavailable demo spare", SKU: "NO-SUCH-SKU", "Needed Qty": "2" } as DemoRecord;
    expect(runServiceAction("request-procurement", "Spare Parts Requests", [missingPart], "Service Test")).toMatchObject({ targetModule: "procurement" });
    expect(readDemoRecordsSnapshot("procurement:Purchase Requests", [])[0]["Requesting Module"]).toBe("Service");

    expect(runServiceAction("complete-work", "Field Service Jobs", [fieldJob], "Service Test")).toMatchObject({ targetTab: "Customer Sign-Off" });
    const [signoff] = readDemoRecordsSnapshot("service:Customer Sign-Off", []) as DemoRecord[];
    expect(runServiceAction("customer-sign-off", "Customer Sign-Off", [signoff], "Service Test")).toMatchObject({ sourceUpdates: [{ Status: "Signed off" }] });
    expect(runServiceAction("close-job", "Customer Sign-Off", [signoff], "Service Test")).toMatchObject({ sourceUpdates: [{ Status: "Closed" }] });
    expect(runServiceAction("create-invoice-draft", "Customer Sign-Off", [signoff], "Service Test")).toMatchObject({ targetModule: "finance" });

    expect(readDemoRecordsSnapshot("finance:Customer Invoices", [])[0]).toMatchObject({ "Source Module": "Service Closure", Customer: signoff.Customer, Status: "Draft" });
    expect(readDemoRecordsSnapshot("service:Service Invoicing Drafts", [])[0]["Finance Invoice Draft"]).toContain("INV-DRAFT");
    expect(JSON.parse(localStorage.getItem("medtech-demo:audit:v1") || "[]").some((row: Record<string, string>) => row.Module === "Service")).toBe(true);
  });
});
