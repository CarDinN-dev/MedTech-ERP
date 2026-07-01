"use client";

import type { DemoSession } from "@/lib/demo-auth";
import { readApprovalRequests } from "@/lib/approval-matrix";
import { readDemoRecordsSnapshot } from "@/lib/demo-store";
import { erpRoles, normalizeRole, type ErpRole } from "@/lib/erp-security";
import { hrViews } from "@/lib/hr-data";
import { COSTING_STORAGE_KEY, seedCostingSheets, type CostingSheet } from "@/lib/sales-costing";
import { medtechScopeViews } from "@/lib/medtech-scope-data";

export interface WorkTask {
  "Task No": string;
  "Source Module": string;
  "Source Record": string;
  Priority: string;
  "Assigned Role": ErpRole;
  "Assigned User": string;
  "Due Date": string;
  Status: string;
  "Action Required": string;
  "Link/Open Record": string;
  Notes: string;
}

export const workTaskColumns = ["Task No", "Source Module", "Source Record", "Priority", "Assigned Role", "Assigned User", "Due Date", "Status", "Action Required", "Link/Open Record", "Notes"] as const;

export function buildMyWorkQueue(session: DemoSession | null): WorkTask[] {
  const role = normalizeRole(session?.role);
  const user = session?.name || "";
  const tasks = [
    ...approvalTasks(),
    ...serviceTasks(),
    ...costingTasks(),
    ...poTasks(),
    ...salesDeadlineTasks(),
    ...contractTasks(),
    ...inventoryTasks(),
    ...payrollTasks(),
    ...uatTasks()
  ].sort((a, b) => priorityRank(a.Priority) - priorityRank(b.Priority) || a["Due Date"].localeCompare(b["Due Date"]));
  if (role === "Super Admin" || role === "Management") return tasks;
  return tasks.filter(task => task["Assigned Role"] === role || task["Assigned User"] === user || task["Assigned User"] === "Any");
}

function approvalTasks(): WorkTask[] {
  return readApprovalRequests()
    .filter(row => ["Pending", "Counter-proposed"].includes(row.Status))
    .map(row => task(`APR-${row["Approval Request No"]}`, row["Source Module"], row["Source Record"], row.Amount.includes("QAR 0") ? "Normal" : "High", safeRole(row["Current Approver Role"]), row["Current Approver Name"], row["Submitted At"], row.Status, `${row["Request Type"]}: approve/reject`, "/approvals", row["Threshold Rule"]));
}

function serviceTasks(): WorkTask[] {
  const jobs = rows("service:Job Pool", "service.Job Pool").filter(row => !["Closed", "Completed"].includes(row.Status));
  const signoffs = rows("service:Customer Sign-Off", "service.Customer Sign-Off").filter(row => row["Work Accepted"] === "Pending" || row.Status.includes("Awaiting"));
  return [
    ...jobs.map(row => task(row["Job No"], "Service", row["Request No"] || row["Job No"], row.Status.includes("SLA") ? "High" : "Normal", "Service Engineer", row.Engineer || "Any", row["SLA Due"] || today(), row.Status, "Complete assigned service job", "/service", `${row.Customer} - ${row.Equipment}`)),
    ...signoffs.map(row => task(row["Sign-Off No"], "Service", row["Job No"], "High", "Service Engineer", "Any", today(), row.Status, "Capture pending UAT/customer sign-off", "/service", row.Customer))
  ];
}

function costingTasks(): WorkTask[] {
  return readCostings()
    .filter(row => row["Approval Status"] === "Pending")
    .map(row => task(row["Costing Sheet No"], "Costing", row["Related Opportunity No"] || row.Customer, "High", "Sales Manager", "Any", row["Validity Date"], row["Approval Status"], "Approve/reject costing sheet", "/sales", row.Notes));
}

function poTasks(): WorkTask[] {
  return rows("procurement:Purchase Orders", "procurement.Purchase Orders")
    .filter(row => row["Approval Status"]?.includes("Pending") || row.Status?.includes("Pending"))
    .map(row => task(row["PO No"], "Procurement", row.Supplier, "High", "Finance Manager", "Aisha Rahman", row["Delivery ETA"] || today(), row.Status, "Approve purchase order", "/procurement", row.Total));
}

function salesDeadlineTasks(): WorkTask[] {
  return rows("sales:Pharma Tender", "sales.Pharma Tender")
    .filter(row => !["Won", "Lost", "Submitted"].includes(row.Status))
    .map(row => task(row.Tender, "Sales", row.Customer, "Critical", "Sales Manager", "Any", isoDate(row.Deadline), row.Status, "Tender deadline review", "/sales", `${row.Stage} - ${row["Bid value"]}`));
}

function contractTasks(): WorkTask[] {
  const hr = rows("hr-enterprise:Contracts", "hr.Contracts").filter(row => row["Renewal Status"] === "Review due" || row["Document Status"] === "Expired");
  const amc = rows("service:AMC Contracts", "service.AMC Contracts").filter(row => row["Renewal Status"] !== "Renewed");
  return [
    ...hr.map(row => task(row["Contract No"], "HR", row["Employee Name"], "Normal", "HR Manager", "Any", isoDate(row["End Date"]) || today(), row["Renewal Status"], "Review expiring employee contract", "/hr", row["Document Status"])),
    ...amc.map(row => task(row["AMC Contract No"], "Service", row.Customer, "Normal", "Service Engineer", "Any", row["Renewal Date"], row["Renewal Status"], "Prepare AMC renewal", "/service", row["Auto-renewal Suggestion"]))
  ];
}

function inventoryTasks(): WorkTask[] {
  const expiry = rows("inventory:Expiry Alerts", "inventory.Expiry Alerts").filter(row => row.Status !== "Closed");
  const low = rows("inventory:Stock On Hand", "inventory.Stock On Hand").filter(row => qty(row["Available Quantity"]) <= qty(row["Min Stock"]));
  return [
    ...expiry.map(row => task(row["Alert No"], "Inventory", row.SKU, Number(row["Days Left"]) <= 30 ? "Critical" : "High", "Warehouse Team", "Any", row["Expiry Date"], row.Status, row.Action || "Review stock expiry", "/inventory", row.Product)),
    ...low.map(row => task(`LOW-${row.SKU}`, "Inventory", row.SKU, "High", "Warehouse Team", "Any", today(), row.Status, "Low stock replenishment review", "/inventory", `${row.Product}: ${row["Available Quantity"]}/${row["Min Stock"]}`))
  ];
}

function payrollTasks(): WorkTask[] {
  const approvals = readApprovalRequests().filter(row => row["Request Type"] === "Payroll finalization" && row.Status === "Pending");
  const runs = readDemoRecordsSnapshot("hr-payroll:Monthly Payroll", []).filter(row => row.Status === "Validated");
  return [
    ...approvals.map(row => task(row["Approval Request No"], "Payroll", row["Source Record"], "Critical", "HR Manager", row["Current Approver Name"] || "Any", today(), row.Status, "Final payroll approval", "/hr", "Payroll preparer must not final approve")),
    ...runs.map(row => task(row.Run, "Payroll", row.Department, "High", "Payroll Manager", "Any", today(), row.Status, "Submit payroll approval/finalize after approval", "/hr", row.Net || ""))
  ];
}

function uatTasks(): WorkTask[] {
  return rows("admin:UAT Tracker", "admin.UAT Tracker")
    .filter(row => row.Result === "Pending" || row.Status !== "Done")
    .map(row => task(`UAT-${row["Test case"]}`, "Setup", row.Area, row.Priority || "Normal", ownerRole(row.Owner), row.Owner || "Any", today(), row.Status, "Pending UAT sign-off", "/admin", row.Result));
}

function task(no: string, sourceModule: string, sourceRecord: string, priority: string, assignedRole: ErpRole, assignedUser: string, dueDate: string, status: string, action: string, link: string, notes = ""): WorkTask {
  return { "Task No": no, "Source Module": sourceModule, "Source Record": sourceRecord, Priority: priority || "Normal", "Assigned Role": assignedRole, "Assigned User": assignedUser || "Any", "Due Date": dueDate || today(), Status: status || "Pending", "Action Required": action, "Link/Open Record": link, Notes: notes || "" };
}

function rows(storageKey: string, seedKey: string) {
  const hrKey = seedKey.replace("hr.", "") as keyof typeof hrViews;
  return readDemoRecordsSnapshot(storageKey, medtechScopeViews[seedKey]?.rows ?? hrViews[hrKey]?.rows ?? []);
}

function readCostings() {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem(COSTING_STORAGE_KEY) : "";
    return stored ? JSON.parse(stored) as CostingSheet[] : seedCostingSheets();
  } catch {
    return seedCostingSheets();
  }
}

function safeRole(role: string): ErpRole {
  return erpRoles.includes(role as ErpRole) ? role as ErpRole : "Management";
}

function ownerRole(owner = ""): ErpRole {
  if (owner.includes("Payroll")) return "Payroll Manager";
  if (owner.includes("Procurement")) return "Procurement Team";
  if (owner.includes("Sales")) return "Sales Manager";
  return "Department Manager";
}

function priorityRank(priority: string) {
  return priority === "Critical" ? 0 : priority === "High" ? 1 : priority === "Normal" ? 2 : 3;
}

function qty(value = "") {
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

function isoDate(value = "") {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
