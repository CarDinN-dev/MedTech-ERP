import { describe, expect, it } from "vitest";
import { approvalRequest, decideApprovalRequest, writeApprovalRequests } from "@/lib/approval-matrix";
import { buildMyWorkQueue } from "@/lib/my-work";
import { erpRoles, hasPermission, rolePermissionRows } from "@/lib/erp-security";

describe("local ERP security and work queue", () => {
  it("defines every requested ERP role", () => {
    expect(rolePermissionRows().map(row => row.Role)).toEqual([...erpRoles]);
  });

  it("keeps auditor read-only", () => {
    expect(hasPermission("Read-only Auditor", "Finance", "view")).toBe(true);
    expect(hasPermission("Read-only Auditor", "Finance", "edit")).toBe(false);
    expect(hasPermission("Read-only Auditor", "Admin", "reset demo data")).toBe(false);
  });

  it("blocks payroll preparer as final approver", () => {
    const request = approvalRequest({ sourceModule: "Human Resources - Payroll", sourceRecord: "PAY-TEST", requestType: "Payroll finalization", requestedBy: "Payroll Manager", amount: 1000, businessUnit: "Sales" }, "Pending");
    writeApprovalRequests([request]);
    expect(decideApprovalRequest(request["Approval Request No"], "Approved", "Fatima", "final", "Payroll Manager").error).toContain("Payroll preparer");
  });

  it("builds local pending work for the signed-in role", () => {
    const tasks = buildMyWorkQueue({ name: "Aisha Rahman", email: "a.rahman@medtech.qa", role: "Finance Manager", department: "Finance", initials: "AR" });
    expect(tasks.some(task => task["Source Module"] === "Procurement" && task["Action Required"].includes("Approve"))).toBe(true);
  });
});
