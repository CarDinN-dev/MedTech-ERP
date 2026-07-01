import { describe, expect, it } from "vitest";
import { appendAuditLog, auditSummary } from "@/lib/audit-store";
import { DEFAULT_DEMO_EMAIL, DEFAULT_DEMO_PASSWORD, signInDemo } from "@/lib/demo-auth";

describe("authentication and audit integration", () => {
  it("attributes new audit events to the authenticated user", () => {
    signInDemo(DEFAULT_DEMO_EMAIL, DEFAULT_DEMO_PASSWORD);
    appendAuditLog({ action: "update", module: "Human Resources", record: "MT-0018", details: "Profile reviewed in test" });
    const entries = JSON.parse(localStorage.getItem("medtech-demo:audit:v1") || "[]") as Array<Record<string, string>>;
    expect(entries[0]).toMatchObject({ User: "Kashif", Role: "Super Admin", Action: "UPDATE", Module: "Human Resources", Record: "MT-0018", Result: "success", Severity: "info" });
  });

  it("redacts sensitive fields from audit summaries and details", () => {
    appendAuditLog({ action: "create", module: "Administration", record: "user", details: "password token secret", after: auditSummary({ Email: "user@example.test", Password: "MedTech@2026" }) });
    const [entry] = JSON.parse(localStorage.getItem("medtech-demo:audit:v1") || "[]") as Array<Record<string, string>>;

    expect(entry.Details).toContain("[redacted]");
    expect(entry.After).toContain("Email: user@example.test");
    expect(entry.After).not.toContain("MedTech@2026");
  });
});
