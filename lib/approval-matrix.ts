"use client";

import { appendAuditLog } from "@/lib/audit-store";
import { hasPermission, normalizeRole } from "@/lib/erp-security";

export type ApprovalStatus = "Draft" | "Pending" | "Approved" | "Rejected" | "Counter-proposed" | "Cancelled";
export type ApprovalDecision = "" | "Approved" | "Rejected" | "Counter-proposed" | "Cancelled";

export interface ApprovalRequest {
  "Approval Request No": string;
  "Source Module": string;
  "Source Record": string;
  "Request Type": string;
  "Requested By": string;
  "Current Approver Role": string;
  "Current Approver Name": string;
  Amount: string;
  "Discount %": string;
  "Customer Tier": string;
  "Business Unit": string;
  "Threshold Rule": string;
  Status: ApprovalStatus;
  Decision: ApprovalDecision;
  "Decision Notes": string;
  "Submitted At": string;
  "Approved/Rejected At": string;
  Trail: string;
}

export interface ApprovalSource {
  sourceModule: string;
  sourceRecord: string;
  requestType: string;
  requestedBy: string;
  amount?: number;
  discountPercent?: number;
  customerTier?: string;
  businessUnit?: string;
}

interface ApprovalRule {
  id: string;
  sourceModule: string;
  requestType: string;
  approverRole: string;
  approverName: string;
  thresholdText: string;
  requires: (source: ApprovalSource) => boolean;
}

export const APPROVAL_STORAGE_KEY = "medtech-demo:approval-matrix:requests:v1";

const rules: ApprovalRule[] = [
  rule("APR-SALES-DISC-10", "Sales", "Quotation discount", "Sales Manager", "Fahad Al-Kuwari", "Discount % > 10", source => (source.discountPercent ?? 0) > 10),
  rule("APR-SALES-DEAL-500000", "Sales", "Sales deal value", "Management", "Kashif", "Amount > QAR 500,000", source => (source.amount ?? 0) > 500000),
  rule("APR-SALES-PRICE-EXCEPTION", "Sales", "Price approval exception", "Sales Manager", "Fahad Al-Kuwari", "Pricing exception", source => source.requestType === "Price approval exception"),
  rule("APR-PO-50000", "Procurement", "Purchase order", "Finance Manager", "Aisha Rahman", "Amount > QAR 50,000", source => (source.amount ?? 0) > 50000),
  rule("APR-SERVICE-25000", "Service", "Service ticket approval", "Service Engineer", "Naveen Kumar", "Amount > QAR 25,000", source => (source.amount ?? 0) > 25000),
  rule("APR-AMC-100000", "Service", "AMC renewal", "Management", "Kashif", "Amount > QAR 100,000", source => (source.amount ?? 0) > 100000),
  rule("APR-PROJECT-BILLING", "Projects", "Project milestone billing", "Project Manager", "K. Varghese", "Any milestone billing", source => source.requestType === "Project milestone billing"),
  rule("APR-PAYROLL-FINAL", "Human Resources - Payroll", "Payroll finalization", "HR Manager", "HR Manager", "Any payroll finalization", source => source.requestType === "Payroll finalization"),
  rule("APR-EXPENSE-5000", "Finance", "Expense", "Finance Manager", "Aisha Rahman", "Amount > QAR 5,000", source => (source.amount ?? 0) > 5000),
  rule("APR-LEAVE-EOS", "Human Resources", "Leave/EOS", "HR Manager", "HR Manager", "Leave settlement or EOS", source => source.requestType === "Leave/EOS"),
  rule("APR-STOCK-VARIANCE", "Inventory", "Cycle count variance", "Warehouse Team", "Warehouse Team", "Any cycle count variance", source => source.requestType === "Cycle count variance")
];

export const approvalRequestColumns = ["Approval Request No", "Source Module", "Source Record", "Request Type", "Requested By", "Current Approver Role", "Current Approver Name", "Amount", "Discount %", "Customer Tier", "Business Unit", "Threshold Rule", "Status", "Decision", "Decision Notes", "Submitted At", "Approved/Rejected At"];

export function approvalRules() {
  return rules;
}

export function readApprovalRequests() {
  if (typeof window === "undefined") return seedApprovalRequests();
  try {
    const stored = localStorage.getItem(APPROVAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) as ApprovalRequest[] : seedApprovalRequests();
  } catch {
    return seedApprovalRequests();
  }
}

export function writeApprovalRequests(requests: ApprovalRequest[]) {
  localStorage.setItem(APPROVAL_STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new CustomEvent("medtech:approvals", { detail: requests }));
}

export function seedApprovalRequests(): ApprovalRequest[] {
  return [
    approvalRequest({ sourceModule: "Sales", sourceRecord: "SFS-2026-0031", requestType: "Quotation discount", requestedBy: "F. Al-Kuwari", amount: 286000, discountPercent: 18, customerTier: "Government", businessUnit: "Diagnostics" }, "Pending"),
    approvalRequest({ sourceModule: "Procurement", sourceRecord: "PO-2026-0124", requestType: "Purchase order", requestedBy: "M. Said", amount: 94750, businessUnit: "Diagnostics" }, "Pending"),
    approvalRequest({ sourceModule: "Human Resources - Payroll", sourceRecord: "MPR-MEDTECH-2026-06-Sales", requestType: "Payroll finalization", requestedBy: "Payroll Manager", amount: 277600, businessUnit: "Sales" }, "Approved", "Approved", "Ready for final payroll posting."),
    approvalRequest({ sourceModule: "Finance", sourceRecord: "EXP-2026-00448", requestType: "Expense", requestedBy: "K. Varghese", amount: 12480, businessUnit: "Projects" }, "Pending"),
    approvalRequest({ sourceModule: "Inventory", sourceRecord: "STK-ADJ-0092", requestType: "Cycle count variance", requestedBy: "Warehouse Team", amount: 3240, businessUnit: "Warehouse" }, "Pending")
  ];
}

export function submitApprovalRequest(source: ApprovalSource) {
  const required = approvalRequired(source);
  if (!required.required) return { request: null, message: "Approval not required." };
  const existing = readApprovalRequests().find(request => request["Source Module"] === source.sourceModule && request["Source Record"] === source.sourceRecord && request["Request Type"] === source.requestType && !["Rejected", "Cancelled"].includes(request.Status));
  if (existing) return { request: existing, message: `${existing["Approval Request No"]} already ${existing.Status.toLowerCase()}.` };
  const request = approvalRequest(source, "Pending");
  writeApprovalRequests([request, ...readApprovalRequests()]);
  appendAuditLog({ action: "SUBMIT APPROVAL", module: source.sourceModule, record: source.sourceRecord, details: `${source.requestType} routed to ${request["Current Approver Role"]}` });
  return { request, message: `${request["Approval Request No"]} submitted.` };
}

export function decideApprovalRequest(requestNo: string, decision: Exclude<ApprovalDecision, "">, approverName: string, notes: string, approverRole = "Super Admin") {
  const requests = readApprovalRequests();
  const request = requests.find(item => item["Approval Request No"] === requestNo);
  if (!request) return { error: "Approval request not found." };
  if (request.Status === "Approved" && request["Request Type"] === "Quotation discount") return { error: "Approved discount requests are locked." };
  if (decision === "Approved" && request["Requested By"] === approverName) return { error: "Requester cannot approve their own request in local demo." };
  if (decision === "Approved" && request["Request Type"] === "Payroll finalization" && normalizeRole(approverRole) === "Payroll Manager") return { error: "Payroll preparer cannot be final approver." };
  if (!hasPermission(approverRole, "Approvals", decision === "Approved" ? "approve" : "reject")) return { error: `${normalizeRole(approverRole)} cannot decide approval requests.` };
  const status: ApprovalStatus = decision === "Counter-proposed" ? "Counter-proposed" : decision;
  const next = { ...request, Status: status, Decision: decision, "Decision Notes": notes, "Approved/Rejected At": now(), Trail: addTrail(request, `${decision} by ${approverName}${notes ? ` - ${notes}` : ""}`) };
  writeApprovalRequests(requests.map(item => item["Approval Request No"] === requestNo ? next : item));
  appendAuditLog({ action: decision, module: "Approvals", record: requestNo, details: `${request["Source Module"]} ${request["Source Record"]}: ${notes || decision}` });
  return { request: next };
}

export function approvalRequired(source: ApprovalSource) {
  const matched = rules.find(item => item.sourceModule === source.sourceModule && item.requestType === source.requestType && item.requires(source));
  return matched ? { required: true, rule: matched } : { required: false, rule: undefined };
}

export function hasApprovedApproval(sourceModule: string, sourceRecord: string, requestType: string) {
  return readApprovalRequests().some(request => request["Source Module"] === sourceModule && request["Source Record"] === sourceRecord && request["Request Type"] === requestType && request.Status === "Approved");
}

export function approvalSourceFromRecord(moduleKey: string, tab: string, record: Record<string, string>, requestedBy: string): ApprovalSource | null {
  if (moduleKey === "sales" && tab === "Quotations") return { sourceModule: "Sales", sourceRecord: record.Quotation || record.Deal || "Quotation", requestType: "Quotation discount", requestedBy, amount: money(record.Total || record["Gross amount"]), discountPercent: percent(record["Discount %"] || "12"), customerTier: record["Customer Tier"] || "Standard", businessUnit: record.BU || "Sales" };
  if (moduleKey === "sales" && tab === "Orders") return { sourceModule: "Sales", sourceRecord: record.Order || "Sales order", requestType: "Sales deal value", requestedBy, amount: money(record.Total), businessUnit: record.BU || "Sales" };
  if (moduleKey === "procurement" && (tab === "Purchase Orders" || tab === "Purchase orders")) return { sourceModule: "Procurement", sourceRecord: record["PO No"] || record["Purchase order"] || record.Reference || "Purchase order", requestType: "Purchase order", requestedBy, amount: money(record.Total), businessUnit: record["Business Unit"] || "Procurement" };
  if (moduleKey === "finance" && tab === "Expenses") return { sourceModule: "Finance", sourceRecord: record.Expense || "Expense", requestType: "Expense", requestedBy, amount: money(record.Amount), businessUnit: record.Category || "Finance" };
  if (moduleKey === "service" && ["Tickets", "Job Pool"].includes(tab)) return { sourceModule: "Service", sourceRecord: record.Ticket || record.Job || "Service ticket", requestType: "Service ticket approval", requestedBy, amount: money(record.Amount), businessUnit: "Service" };
  if (moduleKey === "service" && tab === "AMC Contracts") return { sourceModule: "Service", sourceRecord: record.Contract || "AMC", requestType: "AMC renewal", requestedBy, amount: money(record.Amount), businessUnit: "Service" };
  if (moduleKey === "projects" && ["Milestone Billing", "Milestones"].includes(tab)) return { sourceModule: "Projects", sourceRecord: record.Billing || record.Milestone || "Milestone", requestType: "Project milestone billing", requestedBy, amount: money(record.Amount || record.Value), businessUnit: "Projects" };
  if (moduleKey === "inventory" && ["Adjustments", "Stock Counts", "Cycle Counts"].includes(tab)) return { sourceModule: "Inventory", sourceRecord: record["Count No"] || record.Adjustment || record.Count || "Inventory variance", requestType: "Cycle count variance", requestedBy, amount: money(record["Variance Value"] || record["Value impact"]), businessUnit: "Warehouse" };
  if (moduleKey === "hr" && ["Leave", "Approvals"].includes(tab)) return { sourceModule: "Human Resources", sourceRecord: record.Request || record.Record || "HR request", requestType: "Leave/EOS", requestedBy, amount: money(record.Amount || record["Settlement amount"]), businessUnit: "HR" };
  return null;
}

export function approvalRequest(source: ApprovalSource, status: ApprovalStatus, decision: ApprovalDecision = "", notes = ""): ApprovalRequest {
  const matched = approvalRequired(source).rule ?? rules.find(rule => rule.sourceModule === source.sourceModule && rule.requestType === source.requestType) ?? rules[0];
  const submitted = now();
  return {
    "Approval Request No": `APR-2026-${String(Date.now() % 100000).padStart(5, "0")}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    "Source Module": source.sourceModule,
    "Source Record": source.sourceRecord,
    "Request Type": source.requestType,
    "Requested By": source.requestedBy,
    "Current Approver Role": matched.approverRole,
    "Current Approver Name": matched.approverName,
    Amount: qar(source.amount ?? 0),
    "Discount %": source.discountPercent ? String(source.discountPercent) : "",
    "Customer Tier": source.customerTier || "",
    "Business Unit": source.businessUnit || "",
    "Threshold Rule": matched.thresholdText,
    Status: status,
    Decision: decision,
    "Decision Notes": notes,
    "Submitted At": submitted,
    "Approved/Rejected At": status === "Approved" || status === "Rejected" ? submitted : "",
    Trail: `${submitted} - Submitted by ${source.requestedBy}`
  };
}

export function money(value?: string) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function percent(value?: string) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function rule(id: string, sourceModule: string, requestType: string, approverRole: string, approverName: string, thresholdText: string, requires: ApprovalRule["requires"]): ApprovalRule {
  return { id, sourceModule, requestType, approverRole, approverName, thresholdText, requires };
}

function addTrail(request: ApprovalRequest, detail: string) {
  return `${request.Trail}\n${now()} - ${detail}`;
}

function qar(value: number) {
  return `QAR ${Math.round(value).toLocaleString("en-US")}`;
}

function now() {
  return new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
