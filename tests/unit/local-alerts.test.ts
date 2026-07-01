import { beforeEach, describe, expect, it } from "vitest";
import { readAuditLog } from "@/lib/audit-store";
import { readDemoRecordsSnapshot } from "@/lib/demo-store";
import { runLocalDemoAutomations } from "@/lib/local-workflows";
import { escalateAlert, readLocalAlerts, resolveAlert, snoozeAlert } from "@/lib/local-alerts";

describe("local alerts", () => {
  beforeEach(() => localStorage.clear());

  it("generates local alerts from demo-store data", () => {
    const alerts = readLocalAlerts();
    const types = new Set(alerts.map(row => row["Alert Type"]));

    [
      "Approval pending",
      "Approval overdue",
      "Tender deadline approaching",
      "Quote validity expiring",
      "Product expiry 90/60/30 days",
      "Stock below minimum",
      "AMC renewal due",
      "Service SLA at risk",
      "Contract expiring",
      "Regulatory certificate expiring",
      "Payroll approval pending",
      "EOS approval pending",
      "Costing low margin",
      "Customer credit limit exceeded",
      "Payment overdue",
      "UAT sign-off pending"
    ].forEach(type => expect(types.has(type), type).toBe(true));
    expect(alerts.every(row => row["Alert No"] && row["Created At"])).toBe(true);
    expect(new Set(alerts.map(row => row["Alert No"])).size).toBe(alerts.length);
  });

  it("resolves, snoozes, escalates, and audits alert actions", () => {
    const alertNo = readLocalAlerts()[0]["Alert No"];

    snoozeAlert(alertNo, 7, "Tester");
    expect(readDemoRecordsSnapshot("alerts:Alerts", []).find(row => row["Alert No"] === alertNo)?.Status).toBe("Snoozed");

    escalateAlert(alertNo, "Tester");
    expect(readDemoRecordsSnapshot("alerts:Alerts", []).find(row => row["Alert No"] === alertNo)?.Status).toBe("Escalated");

    resolveAlert(alertNo, "Tester");
    expect(readDemoRecordsSnapshot("alerts:Alerts", []).find(row => row["Alert No"] === alertNo)?.Status).toBe("Resolved");
    expect(readAuditLog().filter(row => row.Module === "Alerts")).toHaveLength(3);
  });

  it("refreshes alerts when demo automations run", () => {
    runLocalDemoAutomations("Automation Test");

    expect(readDemoRecordsSnapshot("admin:Automation Monitor", []).filter(row => row["Run By"] === "Automation Test")).toHaveLength(17);
    expect(readDemoRecordsSnapshot("alerts:Alerts", []).length).toBeGreaterThan(0);
  });
});
