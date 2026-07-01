import { beforeEach, describe, expect, it } from "vitest";
import { readApprovalRequests } from "@/lib/approval-matrix";
import { readDemoRecordsSnapshot } from "@/lib/demo-store";
import { runLocalDemoAutomations } from "@/lib/local-workflows";

describe("local demo automation engine", () => {
  beforeEach(() => localStorage.clear());

  it("runs all local automation triggers and creates related demo records", () => {
    const rows = runLocalDemoAutomations("Automation Test");

    expect(rows).toHaveLength(17);
    expect(rows.every(row => row.Notes.includes("Local Demo Only"))).toBe(true);
    expect(rows.every(row => row.Notes.includes("no external service called"))).toBe(true);
    const monitor = readDemoRecordsSnapshot("admin:Automation Monitor", []);
    expect(monitor.filter(row => row["Run By"] === "Automation Test")).toHaveLength(17);
    expect(readDemoRecordsSnapshot("procurement:Purchase Requests", []).some(row => row["PR No"] === "PR-AUTO-STOCK-DXTRP")).toBe(true);
    expect(readDemoRecordsSnapshot("procurement:Vendor Bills", []).some(row => row["Vendor Bill No"] === "BILL-AUTO-GRN-00098")).toBe(true);
    expect(readDemoRecordsSnapshot("hr-enterprise:Payroll Accounting Draft Journal", []).some(row => row["Journal No"] === "PAY-JRN-AUTO-2026-06")).toBe(true);
    expect(readApprovalRequests().some(row => row["Source Record"] === "CC-2026-00092")).toBe(true);
  });
});
