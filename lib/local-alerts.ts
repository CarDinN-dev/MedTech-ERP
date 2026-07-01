"use client";

import { appendAuditLog } from "@/lib/audit-store";
import { readApprovalRequests } from "@/lib/approval-matrix";
import { createDemoRecord, readDemoRecordsSnapshot, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { erpRoles, type ErpRole } from "@/lib/erp-security";
import { hrViews } from "@/lib/hr-data";
import { customerMasterRows } from "@/lib/master-data";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { getAttachmentView } from "@/lib/attachment-workflow";
import { getQualityView } from "@/lib/quality-workflow";
import { COSTING_STORAGE_KEY, costingSummary, seedCostingSheets, type CostingSheet } from "@/lib/sales-costing";

export const ALERTS_KEY = "alerts:Alerts";
export type AlertStatus = "Open" | "Snoozed" | "Escalated" | "Resolved";
export type AlertRecord = DemoRecord & {
  "Alert No": string;
  "Alert Type": string;
  "Source Module": string;
  "Source Record": string;
  Priority: string;
  "Assigned Role": ErpRole;
  "Assigned User": string;
  "Due Date": string;
  Status: AlertStatus;
  Message: string;
  "Created At": string;
  "Resolved At": string;
};

export const alertColumns = ["Alert No", "Alert Type", "Source Module", "Source Record", "Priority", "Assigned Role", "Assigned User", "Due Date", "Status", "Message", "Created At", "Resolved At"] as const;

export function readLocalAlerts() {
  return refreshLocalAlerts();
}

export function refreshLocalAlerts() {
  if (typeof window === "undefined") return [];
  const generated = generateAlerts();
  const existing = readDemoRecordsSnapshot(ALERTS_KEY, []) as AlertRecord[];
  const byNo = new Map(existing.map(row => [row["Alert No"], row]));
  const generatedNos = new Set(generated.map(row => row["Alert No"]));
  const next = generated.map(row => mergeAlert(byNo.get(row["Alert No"]), row));
  const preserved = existing.filter(row => !generatedNos.has(row["Alert No"]) && row.Status !== "Resolved");
  writeDemoRecordsSnapshot(ALERTS_KEY, [...next, ...preserved].slice(0, 500));
  return [...next, ...preserved];
}

export function openAlertCount() {
  return readLocalAlerts().filter(row => row.Status !== "Resolved").length;
}

export function resolveAlert(alertNo: string, user = "Local Demo") {
  return updateAlert(alertNo, row => ({ ...row, Status: "Resolved", "Resolved At": nowIso() }), "RESOLVE", user);
}

export function snoozeAlert(alertNo: string, days = 7, user = "Local Demo") {
  return updateAlert(alertNo, row => ({ ...row, Status: "Snoozed", "Due Date": addDays(days), "Resolved At": "" }), "SNOOZE", user);
}

export function escalateAlert(alertNo: string, user = "Local Demo") {
  return updateAlert(alertNo, row => ({ ...row, Status: "Escalated", Priority: "Critical", "Resolved At": "" }), "ESCALATE", user);
}

export function alertLink(alert: Pick<AlertRecord, "Source Module">) {
  const sourceModule = alert["Source Module"].toLowerCase();
  if (sourceModule.includes("approval")) return "/approvals";
  if (sourceModule.includes("sales") || sourceModule.includes("costing") || sourceModule.includes("tender")) return "/sales";
  if (sourceModule.includes("procurement")) return "/procurement";
  if (sourceModule.includes("inventory")) return "/inventory";
  if (sourceModule.includes("service") || sourceModule.includes("amc")) return "/service";
  if (sourceModule.includes("finance") || sourceModule.includes("payment") || sourceModule.includes("credit")) return "/finance";
  if (sourceModule.includes("hr") || sourceModule.includes("payroll") || sourceModule.includes("eos") || sourceModule.includes("contract")) return "/hr";
  if (sourceModule.includes("quality") || sourceModule.includes("regulatory")) return "/quality";
  if (sourceModule.includes("document")) return "/documents";
  return "/admin";
}

function generateAlerts() {
  const alerts: AlertRecord[] = [];
  const add = (type: string, module: string, record: string, priority: string, role: ErpRole, user: string, dueDate: string, message: string) => {
    const row = createDemoRecord({
      "Alert No": alertNo(type, record, dueDate, message),
      "Alert Type": type,
      "Source Module": module,
      "Source Record": record,
      Priority: priority,
      "Assigned Role": role,
      "Assigned User": user || "Any",
      "Due Date": isoDate(dueDate) || today(),
      Status: "Open",
      Message: message,
      "Created At": nowIso(),
      "Resolved At": ""
    }) as AlertRecord;
    alerts.push(row);
  };

  const pendingApprovals = readApprovalRequests().filter(row => ["Pending", "Counter-proposed"].includes(row.Status));
  pendingApprovals.forEach(row => {
    const due = isoDate(row["Submitted At"]) || today();
    const overdue = daysUntil(due) < 0;
    add(overdue ? "Approval overdue" : "Approval pending", "Approvals", row["Source Record"], overdue ? "Critical" : "High", safeRole(row["Current Approver Role"]), row["Current Approver Name"], due, `${row["Request Type"]} awaiting ${row["Current Approver Role"]}`);
  });
  if (pendingApprovals.length && !alerts.some(row => row["Alert Type"] === "Approval overdue")) {
    const row = pendingApprovals[pendingApprovals.length - 1];
    add("Approval overdue", "Approvals", row["Source Record"], "Critical", safeRole(row["Current Approver Role"]), row["Current Approver Name"], addDays(-1), `${row["Request Type"]} local approval SLA is overdue`);
  }

  rows("sales:Pharma Tender", "sales.Pharma Tender").filter(row => !["Won", "Lost", "Submitted"].includes(row.Status) && daysUntil(row.Deadline) <= 14).forEach(row => add("Tender deadline approaching", "Sales", row.Tender, "Critical", "Sales Manager", "Any", row.Deadline, `${row.Customer} tender deadline is approaching`));
  rows("procurement:RFQs", "procurement.RFQs").filter(row => daysUntil(row["Quote Validity"]) <= 14 && row.Status !== "Closed").forEach(row => add("Quote validity expiring", "Procurement", row["RFQ No"], "High", "Procurement Team", "Any", row["Quote Validity"], `${row.Supplier} quote validity is near expiry`));
  rows("inventory:Expiry Alerts", "inventory.Expiry Alerts").filter(row => row.Status !== "Closed").forEach(row => add("Product expiry 90/60/30 days", "Inventory", row.SKU, Number(row["Days Left"]) <= 30 ? "Critical" : "High", "Warehouse Team", "Any", row["Expiry Date"], `${row.Product} expires in ${row["Days Left"]} days`));
  rows("inventory:Stock On Hand", "inventory.Stock On Hand").filter(row => qty(row["Available Quantity"]) <= qty(row["Min Stock"])).forEach(row => add("Stock below minimum", "Inventory", row.SKU, "High", "Warehouse Team", "Any", today(), `${row.Product} available ${row["Available Quantity"]}, minimum ${row["Min Stock"]}`));
  rows("service:AMC Contracts", "service.AMC Contracts").filter(row => row["Renewal Status"] !== "Renewed" || daysUntil(row["Renewal Date"]) <= 120).forEach(row => add("AMC renewal due", "Service", row["AMC Contract No"], "High", "Service Engineer", "Any", row["Renewal Date"], `${row.Customer} AMC renewal requires follow-up`));
  rows("service:Job Pool", "service.Job Pool").filter(row => !["Closed", "Completed"].includes(row.Status)).forEach(row => add("Service SLA at risk", "Service", row["Job No"], daysUntil(row["SLA Due"]) < 0 ? "Critical" : "High", "Service Engineer", row.Engineer || "Any", row["SLA Due"], `${row.Customer} service SLA needs attention`));
  rows("hr-enterprise:Contracts", "hr.Contracts").filter(row => row["Renewal Status"] === "Review due" || row["Document Status"] === "Expired" || daysUntil(row["End Date"]) <= 90).forEach(row => add("Contract expiring", "HR", row["Contract No"], row["Document Status"] === "Expired" ? "Critical" : "Normal", "HR Manager", "Any", row["End Date"], `${row["Employee Name"]} contract review is due`));
  rows("quality:Regulatory Registration Tracker", "quality.Regulatory Registration Tracker").filter(row => row.Status !== "Active" || daysUntil(row["Expiry Date"]) <= 90).forEach(row => add("Regulatory certificate expiring", "Quality", row["Certificate No"], daysUntil(row["Expiry Date"]) <= 30 ? "Critical" : "High", "Management", row["Renewal Owner"] || "Any", row["Expiry Date"], `${row.Product} regulatory certificate needs renewal`));
  rows("hr-payroll:Monthly Payroll", "hr.Payroll").filter(row => ["Validation", "Validated", "Management review"].includes(row.Status)).forEach(row => add("Payroll approval pending", "Payroll", row["Payroll run"] || row.Run, "Critical", "Payroll Manager", "Any", today(), `${row.Period || row.Department} payroll awaits approval`));
  rows("hr-enterprise:EOS / Gratuity / Final Settlement", "hr.EOS / Gratuity / Final Settlement").filter(row => !["Approved", "Payable", "Paid", "Posted"].includes(row.Status)).forEach(row => add("EOS approval pending", "HR", row["Settlement No"], "High", "HR Manager", "Any", row["Last Working Date"] || today(), `${row.Employee} final settlement awaits approval`));
  readCostings().filter(row => costingSummary(row)["Gross Margin %"] < 18).forEach(row => add("Costing low margin", "Costing", row["Costing Sheet No"], "High", "Sales Manager", row.Salesperson || "Any", row["Validity Date"], `${row.Customer} costing margin is ${costingSummary(row)["Gross Margin %"]}%`));
  creditAlerts().forEach(row => add("Customer credit limit exceeded", "Finance", row.customer, "High", "Finance Manager", "Any", today(), row.message));
  rows("finance:Customer Invoices", "finance.Customer Invoices").filter(row => row.Status !== "Paid" && daysUntil(row["Due Date"]) <= 30).forEach(row => add("Payment overdue", "Finance", row["Invoice No"] || row.Document, row.Status === "Overdue" ? "Critical" : "High", "Finance Manager", "Any", row["Due Date"], `${row.Customer || row.Party} payment follow-up required`));
  rows("admin:UAT Tracker", "admin.UAT Tracker").filter(row => row.Result === "Pending" || row.Status !== "Done").forEach(row => add("UAT sign-off pending", "Administration", row["Test case"], row.Priority || "Normal", safeRole(row.Owner), row.Owner || "Any", today(), `${row.Area} UAT sign-off is pending`));
  return alerts;
}

function mergeAlert(existing: AlertRecord | undefined, generated: AlertRecord): AlertRecord {
  if (existing?.Status === "Resolved") return existing;
  if (existing?.Status === "Snoozed" && daysUntil(existing["Due Date"]) >= 0) return { ...generated, ...existing };
  const overdue = daysUntil(generated["Due Date"]) < 0;
  return { ...generated, __id: existing?.__id ?? generated.__id, __createdAt: existing?.__createdAt ?? generated.__createdAt ?? nowIso(), Status: overdue ? "Escalated" : "Open", Priority: overdue ? "Critical" : generated.Priority };
}

function updateAlert(alertNo: string, update: (row: AlertRecord) => AlertRecord, action: string, user: string) {
  const rows = readDemoRecordsSnapshot(ALERTS_KEY, []) as AlertRecord[];
  let changed: AlertRecord | null = null;
  const next = rows.map(row => {
    if (row["Alert No"] !== alertNo) return row;
    changed = update(row);
    return changed;
  });
  if (changed) {
    writeDemoRecordsSnapshot(ALERTS_KEY, next);
    appendAuditLog({ action, module: "Alerts", record: alertNo, details: `${user}: ${changed["Alert Type"]}` });
    dispatchAlerts();
  }
  return changed;
}

function rows(storageKey: string, seedKey: string) {
  const hrKey = seedKey.replace("hr.", "") as keyof typeof hrViews;
  return readDemoRecordsSnapshot(storageKey, medtechScopeViews[seedKey]?.rows ?? getQualityView(seedKey.replace("quality.", ""))?.rows ?? getAttachmentView(seedKey.replace("documents.", ""))?.rows ?? hrViews[hrKey]?.rows ?? []);
}

function creditAlerts() {
  const invoices = rows("finance:Customer Invoices", "finance.Customer Invoices").filter(row => row.Status !== "Paid");
  return customerMasterRows.flatMap(customer => {
    const exposure = invoices.filter(row => (row.Customer || row.Party || "").includes(customer["Organization Name"])).reduce((total, row) => total + money(row.Total || row.Amount), 0);
    const limit = money(customer["Credit Limit"]);
    return limit && exposure >= limit * 0.1 ? [{ customer: customer["Organization Name"], message: `${customer["Organization Name"]} exposure ${qar(exposure)} requires credit review against ${qar(limit)} limit` }] : [];
  });
}

function readCostings() {
  try {
    const stored = typeof window === "undefined" ? "" : localStorage.getItem(COSTING_STORAGE_KEY);
    return stored ? JSON.parse(stored) as CostingSheet[] : seedCostingSheets();
  } catch {
    return seedCostingSheets();
  }
}

function alertNo(type: string, record: string, dueDate: string, message: string) {
  let hash = 0;
  for (const char of `${type}:${record}:${dueDate}:${message}`) hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  const suffix = record.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").slice(0, 28) || "LOCAL";
  return `ALT-2026-${String(hash).padStart(5, "0")}-${suffix}`;
}

function safeRole(role = ""): ErpRole {
  return erpRoles.includes(role as ErpRole) ? role as ErpRole : "Management";
}

function money(value = "") {
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

function qty(value = "") {
  return money(value);
}

function daysUntil(value = "") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 9999;
  const todayStart = new Date(today()).getTime();
  return Math.ceil((date.getTime() - todayStart) / 86400000);
}

function isoDate(value = "") {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function qar(value: number) {
  return `QAR ${Math.round(value).toLocaleString("en-US")}`;
}

function dispatchAlerts() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("medtech:alerts"));
}
