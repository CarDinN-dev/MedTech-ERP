"use client";

import type { DemoSession } from "@/lib/demo-auth";

export const erpActions = ["view", "create", "edit", "delete/archive", "approve", "reject", "export", "import", "generate PDF", "reset demo data", "finalize/post/lock"] as const;
export const erpModules = ["Sales", "CRM", "Costing", "Procurement", "Inventory", "Finance", "Service", "Projects", "HR", "Payroll", "Documents", "Reports", "Admin", "Setup", "Approvals"] as const;
export const erpRoles = ["Super Admin", "Management", "Finance Manager", "HR Manager", "HR Officer", "Payroll Manager", "Department Manager", "Employee", "Sales Manager", "Sales Executive", "Shipping Team", "Warehouse Team", "Procurement Team", "Service Engineer", "Project Manager", "Read-only Auditor"] as const;

export type ErpAction = typeof erpActions[number];
export type ErpModule = typeof erpModules[number];
export type ErpRole = typeof erpRoles[number];

const all = new Set<ErpAction>(erpActions);
const read = new Set<ErpAction>(["view", "export"]);
const work = new Set<ErpAction>(["view", "create", "edit", "export", "import", "generate PDF"]);
const decision = new Set<ErpAction>(["view", "approve", "reject", "export", "generate PDF"]);
const post = new Set<ErpAction>(["view", "create", "edit", "approve", "reject", "export", "import", "generate PDF", "finalize/post/lock"]);

export const rolePermissions: Record<ErpRole, Partial<Record<ErpModule, Set<ErpAction>>>> = {
  "Super Admin": Object.fromEntries(erpModules.map(module => [module, all])) as Record<ErpModule, Set<ErpAction>>,
  Management: { Sales: decision, Procurement: decision, Inventory: decision, Finance: decision, Service: decision, Projects: decision, HR: decision, Payroll: decision, Reports: read, Approvals: decision },
  "Finance Manager": { Finance: post, Procurement: decision, Costing: decision, Payroll: decision, Reports: read, Approvals: decision },
  "HR Manager": { HR: post, Payroll: decision, Documents: work, Reports: read, Approvals: decision },
  "HR Officer": { HR: work, Documents: work, Reports: read },
  "Payroll Manager": { Payroll: post, HR: read, Finance: read, Reports: read, Approvals: work },
  "Department Manager": { Sales: decision, Procurement: decision, Inventory: read, Service: decision, Projects: decision, HR: decision, Reports: read, Approvals: decision },
  Employee: { HR: read, Documents: read },
  "Sales Manager": { Sales: post, CRM: post, Costing: decision, Reports: read, Approvals: decision },
  "Sales Executive": { Sales: work, CRM: work, Costing: work, Documents: work, Reports: read },
  "Shipping Team": { Sales: read, Inventory: work, Procurement: read, Documents: work, Reports: read },
  "Warehouse Team": { Inventory: post, Procurement: work, Documents: work, Reports: read, Approvals: work },
  "Procurement Team": { Procurement: work, Inventory: read, Finance: read, Documents: work, Reports: read, Approvals: work },
  "Service Engineer": { Service: work, Inventory: read, Documents: work, Reports: read },
  "Project Manager": { Projects: post, Sales: read, Costing: decision, Procurement: decision, Finance: read, Documents: work, Reports: read, Approvals: decision },
  "Read-only Auditor": Object.fromEntries(erpModules.map(module => [module, new Set<ErpAction>(["view"])])) as Record<ErpModule, Set<ErpAction>>
};

export function normalizeRole(role?: string): ErpRole {
  return erpRoles.find(item => item.toLowerCase() === String(role || "").toLowerCase()) ?? "Read-only Auditor";
}

export function permissionModule(moduleKey: string, tab = ""): ErpModule {
  if (moduleKey === "sales" && ["Universal Enquiry Pool", "BANT Qualification", "Lead Claims", "Opportunities", "Customers", "Customer Master"].includes(tab)) return "CRM";
  if (moduleKey === "sales" && tab === "Estimation / Costing") return "Costing";
  if (moduleKey === "hr" && tab.toLowerCase().includes("payroll")) return "Payroll";
  if (moduleKey === "admin" && ["Master Setup", "Business Units", "Departments", "Cost Centers", "Document Sequences", "Approval Thresholds", "Currencies", "Payment Terms", "Workflow Statuses", "Numbering"].includes(tab)) return "Setup";
  const map: Record<string, ErpModule> = { sales: "Sales", procurement: "Procurement", inventory: "Inventory", finance: "Finance", service: "Service", projects: "Projects", hr: "HR", documents: "Documents", reports: "Reports", admin: "Admin", approvals: "Approvals", shipping: "Inventory" };
  return map[moduleKey] ?? "Reports";
}

export function hasPermission(role: string | undefined, moduleName: ErpModule, action: ErpAction) {
  return Boolean(rolePermissions[normalizeRole(role)][moduleName]?.has(action));
}

export function permissionError(session: DemoSession | null, moduleName: ErpModule, action: ErpAction) {
  return hasPermission(session?.role, moduleName, action) ? "" : `${normalizeRole(session?.role)} cannot ${action} in ${moduleName}.`;
}

export function segregationWarning(input: { action: ErpAction; moduleName: ErpModule; record?: Record<string, string> | null; session?: DemoSession | null }) {
  const name = input.session?.name || "";
  const role = normalizeRole(input.session?.role);
  const record = input.record ?? {};
  const requester = record["Requested By"] || record["Requested by"] || record["Created by"] || record["Prepared By"] || record["Generated By"] || record.Owner || record.Salesperson || "";
  if (role === "Read-only Auditor" && input.action !== "view") return "Read-only Auditor is view-only.";
  if (["approve", "reject"].includes(input.action) && requester && requester === name) return "Requester cannot approve or reject their own request.";
  if (input.moduleName === "Payroll" && input.action === "approve" && (role === "Payroll Manager" || requester === "Payroll Manager" || requester === name)) return "Payroll preparer cannot be the final approver.";
  if (input.moduleName === "Procurement" && input.action === "approve" && requester && requester === name) return "PO creator cannot be the sole approver.";
  if (input.moduleName === "Finance" && ["approve", "finalize/post/lock"].includes(input.action) && requester && requester === name) return "Finance posting approval should be separate from the creator.";
  return "";
}

export function rolePermissionRows() {
  return erpRoles.map(role => {
    const modules = Object.entries(rolePermissions[role]).map(([module, actions]) => `${module}: ${Array.from(actions ?? []).join(", ")}`);
    return { Role: role, Users: role === "Super Admin" ? "1" : "0", Modules: modules.map(item => item.split(":")[0]).join(", ") || "None", "Approval rights": modules.filter(item => item.includes("approve")).map(item => item.split(":")[0]).join(", ") || "None", Permissions: modules.join(" | "), "Last changed": "30 Jun 2026", Status: "Active" };
  });
}
