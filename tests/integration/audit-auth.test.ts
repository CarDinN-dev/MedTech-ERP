import { describe, expect, it } from "vitest";
import { appendAuditLog } from "@/lib/audit-store";
import { DEFAULT_DEMO_EMAIL, DEFAULT_DEMO_PASSWORD, signInDemo } from "@/lib/demo-auth";

describe("authentication and audit integration", () => {
  it("attributes new audit events to the authenticated user", () => {
    signInDemo(DEFAULT_DEMO_EMAIL, DEFAULT_DEMO_PASSWORD);
    appendAuditLog({ action: "update", module: "Human Resources", record: "MT-0018", details: "Profile reviewed in test" });
    const entries = JSON.parse(localStorage.getItem("medtech-demo:audit:v1") || "[]") as Array<Record<string, string>>;
    expect(entries[0]).toMatchObject({ User: "Kashif", Action: "UPDATE", Module: "Human Resources", Record: "MT-0018" });
  });
});
