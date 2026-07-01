"use client";

import { appendAuditLog } from "@/lib/audit-store";
import { createDemoRecord, readDemoRecordsSnapshot, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { approvalRequired, hasApprovedApproval, money, submitApprovalRequest, type ApprovalSource } from "@/lib/approval-matrix";
import { refreshLocalAlerts } from "@/lib/local-alerts";

export type WorkflowAction = "submit" | "approve" | "reject" | "cancel";

const requiredFields: Record<string, Partial<Record<WorkflowAction, string[]>>> = {
  "sales.BANT Qualification": { submit: ["Lead", "Budget", "Authority", "Need", "Timeline"] },
  "sales.Straight Forward Sales": { submit: ["Deal", "Customer", "Salesperson", "Gross amount", "Margin %"], approve: ["Approval status"] },
  "sales.GPPRR": { submit: ["Contract", "Customer", "Principal", "Minimum stock"] },
  "sales.Pharma Tender": { submit: ["Tender", "Customer", "Deadline", "Bid value"] },
  "sales.Project Sales": { submit: ["Project Deal", "Customer", "Consolidated quote", "Margin %"] },
  "procurement.Purchase Requests": { submit: ["PR No", "Requesting Module", "Requested By", "Business Unit", "Product Lines"] },
  "procurement.RFQs": { submit: ["RFQ No", "Supplier", "Product Lines", "Quoted Cost"] },
  "procurement.Supplier Comparison": { submit: ["Comparison No", "RFQ No", "Winning Supplier"] },
  "procurement.Purchase Orders": { submit: ["PO No", "Supplier", "Total"], approve: ["Total"] },
  "procurement.Purchase orders": { submit: ["Purchase order", "Supplier", "Total"], approve: ["Total"] },
  "procurement.Goods Receipts": { submit: ["GRN No", "PO No", "Received Lines", "Location"] },
  "procurement.Vendor Bills": { submit: ["Vendor Bill No", "Supplier", "Amount"] },
  "inventory.Quarantine / QC": { approve: ["QC No", "QA Decision"] },
  "inventory.Cycle Counts": { submit: ["Count No", "Product", "System Qty", "Counted Qty"], approve: ["Count No", "Variance Qty"] },
  "inventory.Bundled Kits": { submit: ["Bundle SKU", "Component SKUs", "Build Quantity"] },
  "finance.Customer Invoices": { submit: ["Document", "Party", "Amount"] },
  "finance.Vendor Bills": { submit: ["Document", "Party", "Amount"] },
  "finance.Advance/Progress/Retention": { submit: ["Billing", "Project / SO", "Customer", "Amount"] },
  "service.Job Pool": { submit: ["Job", "Customer", "Engineer", "SLA due"] },
  "service.Service Closure": { submit: ["Closure", "Job", "Invoice draft"] },
  "projects.Milestone Billing": { submit: ["Billing", "Project", "Milestone", "Amount"] },
  "approvals.My approvals": { approve: ["Request", "Type", "Requested by"], reject: ["Request", "Type", "Requested by"] },
  "approvals.Approval Matrix": { submit: ["Rule", "Source module", "Request type", "Approver role"] }
};

const nextStatus: Record<WorkflowAction, string> = {
  submit: "Submitted",
  approve: "Approved",
  reject: "Rejected",
  cancel: "Cancelled"
};

export function workflowError(moduleKey: string, tab: string, action: WorkflowAction, record: Record<string, string>) {
  const fields = requiredFields[`${moduleKey}.${tab}`]?.[action] ?? [];
  const missing = fields.filter(field => !record[field]?.trim());
  if (missing.length) return `Missing required field${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`;
  if (moduleKey === "procurement" && tab === "Purchase Orders" && action === "approve") {
    const source = { sourceModule: "Procurement", sourceRecord: record["PO No"], requestType: "Purchase order", requestedBy: "Procurement Team", amount: money(record.Total), businessUnit: record["Business Unit"] || "Procurement" };
    if (approvalRequired(source).required && !hasApprovedApproval("Procurement", record["PO No"], "Purchase order")) return "PO requires approved shared approval matrix request first.";
  }
  if (moduleKey === "inventory" && tab === "Cycle Counts" && action === "approve" && record["Approval Status"] === "Pending approval" && !hasApprovedApproval("Inventory", record["Count No"], "Cycle count variance")) return "Cycle count variance requires approved shared approval matrix request first.";
  if (action === "approve" && record.Status === "Draft") return "Submit the record before approval.";
  if (action === "submit" && record.Status === "Approved") return "Approved records cannot be submitted again.";
  return "";
}

export function workflowStatusFor(action: WorkflowAction) {
  return nextStatus[action];
}

export function workflowActionLabel(action: WorkflowAction) {
  return action === "submit" ? "Submit" : action === "approve" ? "Approve" : action === "reject" ? "Reject" : "Cancel";
}

export function runLocalDemoAutomations(currentUser: string) {
  const now = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const rows = automationSpecs.map(spec => {
    spec.approval?.(currentUser);
    spec.targets?.forEach(target => upsertLocalRows(target.key, target.unique, [target.row(now)]));
    appendAuditLog({ action: "AUTOMATION", module: spec.sourceModule, record: spec.sourceRecord, details: `${spec.trigger} -> ${spec.action}. Local Demo Only; no external service called.` });
    return automation(spec.trigger, spec.sourceModule, spec.sourceRecord, spec.action, spec.status, currentUser, now, spec.notes);
  });
  const moduleKey = "admin:Automation Monitor";
  const seed = medtechScopeViews["admin.Automation Monitor"].rows;
  const existing = readDemoRecordsSnapshot(moduleKey, seed);
  const next = upsert(existing, rows, ["Trigger Name", "Source Record"]).slice(0, 250);
  writeDemoRecordsSnapshot(moduleKey, next);
  refreshLocalAlerts();
  appendAuditLog({ action: "AUTOMATION RUN", module: "Administration", record: "Automation Monitor", details: `${rows.length} local demo automation triggers evaluated locally` });
  window.dispatchEvent(new StorageEvent("storage", { key: moduleKey }));
  window.dispatchEvent(new Event("medtech:alerts"));
  return rows;
}

interface AutomationTarget {
  key: string;
  unique: string[];
  row: (now: string) => Record<string, string>;
}

interface AutomationSpec {
  trigger: string;
  sourceModule: string;
  sourceRecord: string;
  action: string;
  status: string;
  notes: string;
  approval?: (currentUser: string) => void;
  targets?: AutomationTarget[];
}

const approval = (source: Omit<ApprovalSource, "requestedBy">) => (currentUser: string) => {
  submitApprovalRequest({ ...source, requestedBy: currentUser });
};

const automationSpecs: AutomationSpec[] = [
  {
    trigger: "Discount above threshold",
    sourceModule: "Sales",
    sourceRecord: "SFS-2026-0031",
    action: "Approval request created",
    status: "Completed",
    notes: "18% discount routed to Sales Director",
    approval: approval({ sourceModule: "Sales", sourceRecord: "SFS-2026-0031", requestType: "Quotation discount", amount: 286000, discountPercent: 18, customerTier: "Government", businessUnit: "Diagnostics" })
  },
  {
    trigger: "Quote approved",
    sourceModule: "Sales",
    sourceRecord: "QTN-2026-00314",
    action: "Sales order draft generated",
    status: "Ready",
    notes: "Local sales order can be reviewed before confirmation",
    targets: [{ key: "sales:Orders", unique: ["Order"], row: () => ({ Order: "SO-LOCAL-QTN-00314", Customer: "Hamad Medical Corporation", "Customer PO": "Pending", "Order date": "2026-06-30", Total: "QAR 286,000", Status: "Draft from approved quote" }) }]
  },
  {
    trigger: "Sales order confirmed",
    sourceModule: "Sales",
    sourceRecord: "SO-2026-00218",
    action: "Delivery reservation created",
    status: "Completed",
    notes: "Stock reserved locally for delivery",
    targets: [{ key: "inventory:Reservations", unique: ["Reservation No"], row: () => ({ "Reservation No": "RES-AUTO-SO-00218", Source: "Sales order SO-2026-00218", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", "Lot/Batch/Serial": "LOT-TI-2604", Quantity: "12", "FEFO Suggested": "Yes", "Dispatch Blocked": "No", Status: "Reserved" }) }]
  },
  {
    trigger: "GPPRR contract active",
    sourceModule: "Sales",
    sourceRecord: "GPR-2026-0012",
    action: "Initial delivery order generated",
    status: "Completed",
    notes: "Initial GPPRR delivery order created locally",
    targets: [{ key: "shipping:Delivery Orders", unique: ["Delivery Order No"], row: () => ({ "Delivery Order No": "DO-AUTO-GPR-0012", "Source Module": "GPPRR", "Source Record": "GPR-2026-0012", Customer: "Sidra Medicine", "Delivery Address": "Sidra Central Stores", "Contact Person": "Noura Hassan", Phone: "+974 4003 3333", Warehouse: "Cold Store", "Delivery Date": "2026-06-30", Status: "Ready to pick", Notes: "Troponin I Reagent Kit x 4" }) }]
  },
  {
    trigger: "GPPRR consumption below minimum",
    sourceModule: "Sales",
    sourceRecord: "GPR-2026-0012",
    action: "Replenishment suggestion created",
    status: "Ready",
    notes: "Minimum stock rule suggested procurement",
    targets: [{ key: "procurement:Purchase Requests", unique: ["PR No"], row: () => purchaseRequest("PR-AUTO-GPR-0012", "GPPRR", "Diagnostics", "Troponin I Reagent Kit x 40 kits", "Below minimum consumption for GPPRR contract") }]
  },
  {
    trigger: "Tender deadline approaching",
    sourceModule: "Sales",
    sourceRecord: "TND-2026-0021",
    action: "Tender alert created",
    status: "Open",
    notes: "Deadline alert shown in Automation Monitor"
  },
  {
    trigger: "Product expiry at 90/60/30 days",
    sourceModule: "Inventory",
    sourceRecord: "DX-TRP-100",
    action: "Expiry alert refreshed",
    status: "Open",
    notes: "FEFO and QA review alerts refreshed locally",
    targets: [{ key: "inventory:Expiry Alerts", unique: ["Alert No"], row: () => ({ "Alert No": "EXP-AUTO-DX-TRP-100", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", "Lot/Batch/Serial": "LOT-TI-2604", "Expiry Date": "2026-09-28", "Days Left": "90", "Alert Level": "90-day", Action: "Prioritize FEFO picking", Status: "Open" }) }]
  },
  {
    trigger: "Stock below minimum",
    sourceModule: "Inventory",
    sourceRecord: "DX-TRP-100",
    action: "Purchase suggestion created",
    status: "Ready",
    notes: "Below-minimum stock suggested purchase request",
    targets: [{ key: "procurement:Purchase Requests", unique: ["PR No"], row: () => purchaseRequest("PR-AUTO-STOCK-DXTRP", "Inventory", "Warehouse", "Troponin I Reagent Kit x 40 kits", "Stock below minimum") }]
  },
  {
    trigger: "PO approved",
    sourceModule: "Procurement",
    sourceRecord: "PO-2026-0128",
    action: "Expected receipt record created",
    status: "Completed",
    notes: "Expected receipt is local and unposted",
    targets: [{ key: "procurement:Goods Receipts", unique: ["GRN No"], row: () => ({ "GRN No": "GRN-AUTO-PO-0128", "PO No": "PO-2026-0128", Supplier: "Siemens Healthineers", "Received Lines": "Patient Monitor MX750 x 8 units", Warehouse: "Main Warehouse", Location: "Expected receipts", "Lot/Serial/Batch": "Pending", "Expiry Date": "", "QC Status": "Pending", Status: "Expected" }) }]
  },
  {
    trigger: "GRN completed",
    sourceModule: "Procurement",
    sourceRecord: "GRN-2026-00098",
    action: "Vendor bill draft generated",
    status: "Completed",
    notes: "Local vendor bill draft only",
    targets: [{ key: "procurement:Vendor Bills", unique: ["Vendor Bill No"], row: () => ({ "Vendor Bill No": "BILL-AUTO-GRN-00098", "PO No": "PO-2026-0119", "GRN No": "GRN-2026-00098", Supplier: "BD Biosciences", Currency: "QAR", Amount: "QAR 42,900", "Bill Date": "2026-06-30", "Due Date": "2026-07-30", "Accounting Posting": "Not posted - local draft only", Status: "Draft" }) }]
  },
  {
    trigger: "Service job closed",
    sourceModule: "Service",
    sourceRecord: "JOB-2026-0142",
    action: "Invoice draft prepared",
    status: "Ready",
    notes: "No accounting post performed",
    targets: [{ key: "service:Service Invoicing Drafts", unique: ["Draft No"], row: () => ({ "Draft No": "SVC-AUTO-JOB-0142", "Job No": "JOB-2026-0142", Customer: "Hamad Medical Corporation", Source: "Service job closure", Amount: "QAR 2,400", Lines: "2.5 service hours and spare part consumption", "Finance Invoice Draft": "SVC-INV-AUTO-0142", Status: "Draft" }) }]
  },
  {
    trigger: "Spare part unavailable",
    sourceModule: "Service",
    sourceRecord: "SPR-2026-0074",
    action: "Procurement request created",
    status: "Ready",
    notes: "Unavailable spare part routed to procurement",
    targets: [{ key: "procurement:Purchase Requests", unique: ["PR No"], row: () => purchaseRequest("PR-AUTO-SPARE-0074", "Service", "Service", "Adult SpO2 Sensor x 4 units", "Spare part unavailable for service job") }]
  },
  {
    trigger: "AMC renewal due",
    sourceModule: "Service",
    sourceRecord: "AMC-2026-0038",
    action: "Renewal task and invoice schedule created",
    status: "Ready",
    notes: "Renewal follow-up task created locally",
    targets: [{ key: "service:Maintenance Schedules", unique: ["Work Order No"], row: () => ({ "Asset / Equipment": "Blood Gas Analyzer", "Preventive Schedule": "AMC renewal review", "Work Order No": "AMC-RENEW-AUTO-0038", "Due Date": "2026-10-01", Engineer: "Service Manager", Status: "Renewal due" }) }]
  },
  {
    trigger: "Payroll finalized",
    sourceModule: "Human Resources - Payroll",
    sourceRecord: "MPR-MEDTECH-2026-06-Sales",
    action: "Payroll accounting draft journal created",
    status: "Ready",
    notes: "Local journal draft only",
    targets: [{ key: "hr-enterprise:Payroll Accounting Draft Journal", unique: ["Journal No"], row: () => ({ "Journal No": "PAY-JRN-AUTO-2026-06", "Payroll Run": "MPR-MEDTECH-2026-06-Sales", "Employee Code": "ALL", "Employee Name": "Sales payroll", "Cost Center": "CC-400-Sales", "Allocation %": "100", Amount: "QAR 277,600", "Finance Journal Draft": "Draft", Status: "Draft" }) }]
  },
  {
    trigger: "Leave settlement posted",
    sourceModule: "Human Resources - Payroll",
    sourceRecord: "LVS-2026-0001",
    action: "Payroll earning line created",
    status: "Completed",
    notes: "Leave settlement earning line is local",
    targets: [{ key: "hr-operations:Payroll:Leave Settlement", unique: ["Record"], row: () => ({ Record: "LVS-AUTO-2026-0001", Employee: "Aisha Rahman", "Document date": "2026-06-30", "Payroll period": "June 2026", Quantity: "1", Rate: "QAR 0", "Fixed amount": "QAR 2,133.35", "Calculated amount": "QAR 2,133.35", "Payroll effect": "Earning", "Net effect": "QAR 2,133.35", Status: "Processed" }) }]
  },
  {
    trigger: "EOS approved",
    sourceModule: "Human Resources",
    sourceRecord: "EOS-2026-001",
    action: "Final settlement payable created",
    status: "Ready",
    notes: "Final settlement payable remains local",
    targets: [{ key: "hr-operations:Payroll:Final Settlement", unique: ["Record"], row: () => ({ Record: "EOS-AUTO-2026-001", Employee: "Aisha Rahman", "Document date": "2026-06-30", "Payroll period": "June 2026", Quantity: "1", Rate: "QAR 0", "Fixed amount": "QAR 65,708", "Calculated amount": "QAR 65,708", "Payroll effect": "Earning", "Net effect": "QAR 65,708", Status: "Payable" }) }]
  },
  {
    trigger: "Cycle count variance above threshold",
    sourceModule: "Inventory",
    sourceRecord: "CC-2026-00092",
    action: "Approval request created",
    status: "Ready",
    notes: "Variance routed to Warehouse and Finance",
    approval: approval({ sourceModule: "Inventory", sourceRecord: "CC-2026-00092", requestType: "Cycle count variance", amount: 8520, businessUnit: "Warehouse" })
  }
];

function automation(trigger: string, sourceModule: string, sourceRecord: string, action: string, status: string, user: string, at: string, notes: string) {
  return {
    "Trigger Event No": eventNo(trigger, sourceRecord),
    "Trigger Name": trigger,
    "Source Module": sourceModule,
    "Source Record": sourceRecord,
    "Action Taken": action,
    Status: status,
    "Run By": user,
    "Run At": at,
    Notes: `Local Demo Only - ${notes}; no external service called`
  };
}

function eventNo(trigger: string, sourceRecord: string) {
  let hash = 0;
  for (const char of `${trigger}:${sourceRecord}`) hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  return `AUTO-2026-${String(hash).padStart(5, "0")}`;
}

function purchaseRequest(prNo: string, source: string, businessUnit: string, lines: string, reason: string) {
  return { "PR No": prNo, "Requesting Module": source, "Requested By": "Local Automation", "Business Unit": businessUnit, Department: "Procurement", "Product Lines": lines, "Required Date": "2026-07-08", Justification: reason, Status: "Draft" };
}

function upsertLocalRows(moduleKey: string, unique: string[], rows: Array<Record<string, string>>) {
  const seed = medtechScopeViews[moduleKey.replace(":", ".")]?.rows ?? [];
  const existing = readDemoRecordsSnapshot(moduleKey, seed);
  writeDemoRecordsSnapshot(moduleKey, upsert(existing, rows, unique).slice(0, 250));
}

function upsert(existing: DemoRecord[], rows: Array<Record<string, string>>, unique: string[]) {
  const stamped = rows.map((row, index) => {
    const old = existing.find(item => unique.every(key => item[key] === row[key]));
    return old ? { ...old, ...row } : createDemoRecord(row, index);
  });
  const keys = new Set(rows.map(row => unique.map(key => row[key]).join("|")));
  return [...stamped, ...existing.filter(row => !keys.has(unique.map(key => row[key]).join("|")))];
}
