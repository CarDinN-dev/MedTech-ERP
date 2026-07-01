"use client";

import type { RecordFieldSuggestion, RecordFieldType } from "@/components/record-modal";
import { appendAuditLog } from "@/lib/audit-store";
import { createDemoRecord, readDemoRecordsSnapshot, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { runFinanceAction } from "@/lib/finance-workflow";
import type { MasterDataConfig } from "@/lib/master-data";
import { customerMasterRows, productMasterRows } from "@/lib/master-data";
import { medtechScopeViews } from "@/lib/medtech-scope-data";

type Row = Record<string, string>;

export type ServiceAction =
  | "customer-check"
  | "create-job"
  | "assign-coordinator"
  | "engineer-accept"
  | "engineer-reject"
  | "start-sla"
  | "schedule-visit"
  | "check-spares"
  | "request-procurement"
  | "resume-job"
  | "complete-work"
  | "customer-sign-off"
  | "close-job"
  | "create-invoice-draft"
  | "suggest-renewal";

export interface ServiceActionButton { action: ServiceAction; label: string; }

export const serviceColumns: Record<string, string[]> = {
  "Service Requests": ["Request No", "Source", "Customer", "Contact", "Equipment", "Serial No", "Issue", "Priority", "Emergency Flag", "Contract / AMC Status", "Status"],
  "Job Pool": ["Job No", "Request No", "Customer", "Equipment", "Coordinator", "Engineer", "SLA Due", "Status"],
  "Engineer Dispatch": ["Dispatch No", "Job No", "Engineer", "Accept / Reject", "SLA Started", "Visit Scheduled", "SLA Status", "Status"],
  "Field Service Jobs": ["Job No", "Request No", "Customer", "Equipment", "Engineer", "SLA Status", "SLA Timer", "Work Performed", "Timesheet", "Worksheet", "Status"],
  "Spare Parts Requests": ["Spare Request No", "Job No", "Product", "SKU", "Needed Qty", "Engineer Stock", "Warehouse Stock", "Procurement Request", "Status"],
  "AMC Contracts": ["AMC Contract No", "Customer", "Equipment Covered", "Start Date", "End Date", "Billing Schedule", "Scope Coverage", "Renewal Date", "Renewal Status", "Auto-renewal Suggestion", "Invoice Schedule", "Status"],
  "Maintenance Schedules": ["Asset / Equipment", "Preventive Schedule", "Work Order No", "Due Date", "Engineer", "Status"],
  "Service Reports": ["Report No", "Job No", "Engineer", "Customer", "Equipment", "Issue", "Work Performed", "Spare Parts Consumed", "Timesheet", "Customer Signature", "Status"],
  "Customer Sign-Off": ["Sign-Off No", "Job No", "Customer", "Contact", "Equipment", "Customer Signature", "Work Accepted", "Signed At", "Invoice Draft", "Status"],
  "Service Invoicing Drafts": ["Draft No", "Job No", "Customer", "Source", "Amount", "Lines", "Finance Invoice Draft", "Status"]
};

const firstColumn = Object.fromEntries(Object.entries(serviceColumns).map(([tab, columns]) => [tab, columns[0]]));
const statuses = ["New Request", "Customer checked", "Job created", "Assigned", "Accepted", "Rejected", "SLA started", "Visit scheduled", "Pending spare parts", "In progress", "Execution complete", "Awaiting sign-off", "Signed off", "Closed", "Invoice drafted", "Draft", "Active", "Due", "Completed"];
const engineers = ["Naveen Kumar", "A. Joseph", "S. Khan"];

export function getServiceConfig(tab: string): MasterDataConfig | null {
  const columns = serviceColumns[tab];
  if (!columns) return null;
  return {
    keyColumn: firstColumn[tab],
    filterColumns: columns.filter(column => ["Source", "Priority", "Emergency Flag", "Contract / AMC Status", "Engineer", "SLA Status", "Renewal Status", "Status"].includes(column)),
    searchColumns: columns,
    selectOptions: selectOptionsFor(tab),
    fieldTypes: fieldTypesFor(columns),
    defaultValues: defaultsFor(tab),
    suggestions: serviceSuggestions(),
    prepareSave: (input, records, selected) => prepareRow(tab, input, records, selected),
    validateImportRow: (input, rowNumber, records, seen) => prepareRow(tab, input, records, null, rowNumber, seen)
  };
}

export function serviceActionsFor(tab: string): ServiceActionButton[] {
  if (tab === "Service Requests") return [{ action: "customer-check", label: "Customer check" }, { action: "create-job", label: "Create job" }];
  if (tab === "Job Pool") return [{ action: "assign-coordinator", label: "Assign coordinator" }];
  if (tab === "Engineer Dispatch") return [{ action: "engineer-accept", label: "Accept" }, { action: "engineer-reject", label: "Reject" }, { action: "start-sla", label: "Start SLA" }, { action: "schedule-visit", label: "Schedule visit" }];
  if (tab === "Field Service Jobs") return [{ action: "check-spares", label: "Check spares" }, { action: "complete-work", label: "Complete work" }];
  if (tab === "Spare Parts Requests") return [{ action: "check-spares", label: "Check stock" }, { action: "request-procurement", label: "Request procurement" }, { action: "resume-job", label: "Resume job" }];
  if (tab === "AMC Contracts") return [{ action: "suggest-renewal", label: "Renewal suggestion" }];
  if (tab === "Maintenance Schedules") return [{ action: "create-job", label: "Create job" }];
  if (tab === "Customer Sign-Off") return [{ action: "customer-sign-off", label: "Sign off" }, { action: "close-job", label: "Close job" }, { action: "create-invoice-draft", label: "Invoice draft" }];
  if (tab === "Service Invoicing Drafts") return [{ action: "create-invoice-draft", label: "Finance invoice" }];
  return [];
}

export function runServiceAction(action: ServiceAction, tab: string, records: DemoRecord[], currentUser: string) {
  if (!records.length) return { error: "Select at least one record first." };
  if (action === "customer-check") return updateOnly(records, { Status: "Customer checked", "Contract / AMC Status": "Checked locally" }, "Customer Master checked locally");
  if (action === "create-job") return createJobs(tab, records, currentUser);
  if (action === "assign-coordinator") return assignCoordinator(records);
  if (action === "engineer-accept" || action === "engineer-reject") return engineerDecision(action, records);
  if (action === "start-sla") return startSla(records);
  if (action === "schedule-visit") return scheduleVisit(records);
  if (action === "check-spares") return checkSpares(records);
  if (action === "request-procurement") return requestProcurement(records, currentUser);
  if (action === "resume-job") return resumeJobs(records);
  if (action === "complete-work") return completeWork(records);
  if (action === "customer-sign-off") return updateOnly(records, { "Customer Signature": "Local signature captured", "Work Accepted": "Yes", "Signed At": now(), Status: "Signed off" }, "Customer sign-off captured locally");
  if (action === "close-job") return closeJobs(records);
  if (action === "create-invoice-draft") return createInvoiceDrafts(records, currentUser);
  return updateOnly(records, { "Auto-renewal Suggestion": "Renew 60 days before expiry", "Renewal Status": "Suggested", Status: "Renewal suggested" }, "AMC renewal suggestion prepared locally");
}

function createJobs(tab: string, records: DemoRecord[], currentUser: string) {
  const jobs = records.map((record, index) => {
    const requestNo = record["Request No"] || record["Work Order No"] || nextTargetId("Service Requests", index + 1);
    return {
      "Job No": nextTargetId("Job Pool", index + 1),
      "Request No": requestNo,
      Customer: record.Customer || "Customer",
      Equipment: record.Equipment || record["Asset / Equipment"] || "Equipment",
      Coordinator: "Service Coordinator",
      Engineer: record.Engineer || engineers[index % engineers.length],
      "SLA Due": slaDue(record.Priority, record["Emergency Flag"]),
      Status: tab === "Maintenance Schedules" ? "Preventive job created" : "Job created"
    };
  });
  writeRows("Job Pool", jobs, "Job No");
  const fieldJobs = jobs.map(job => ({ "Job No": job["Job No"], "Request No": job["Request No"], Customer: job.Customer, Equipment: job.Equipment, Engineer: job.Engineer, "SLA Status": "Not started", "SLA Timer": "00:00", "Work Performed": "", Timesheet: "", Worksheet: "", Status: "Queued" }));
  writeRows("Field Service Jobs", fieldJobs, "Job No");
  appendAuditLog({ action: "SERVICE JOB", module: "Service", record: jobs.map(row => row["Job No"]).join(", "), details: `${jobs.length} local job${jobs.length === 1 ? "" : "s"} created by ${currentUser}` });
  return { targetTab: "Job Pool", sourceUpdates: records.map(() => ({ Status: "Job created" })), message: `${jobs.length} service job${jobs.length === 1 ? "" : "s"} created locally` };
}

function assignCoordinator(records: DemoRecord[]) {
  const dispatches = records.map((record, index) => ({
    "Dispatch No": nextTargetId("Engineer Dispatch", index + 1),
    "Job No": record["Job No"],
    Engineer: record.Engineer || engineers[index % engineers.length],
    "Accept / Reject": "Pending",
    "SLA Started": "",
    "Visit Scheduled": "",
    "SLA Status": "Waiting",
    Status: "Assigned"
  }));
  writeRows("Engineer Dispatch", dispatches, "Dispatch No");
  return { targetTab: "Engineer Dispatch", sourceUpdates: records.map(() => ({ Status: "Assigned" })), message: `${dispatches.length} engineer dispatch${dispatches.length === 1 ? "" : "es"} prepared locally` };
}

function engineerDecision(action: "engineer-accept" | "engineer-reject", records: DemoRecord[]) {
  const accepted = action === "engineer-accept";
  return updateOnly(records, { "Accept / Reject": accepted ? "Accepted" : "Rejected", Status: accepted ? "Accepted" : "Rejected" }, accepted ? "Engineer accepted locally" : "Engineer rejected locally");
}

function startSla(records: DemoRecord[]) {
  const started = now();
  updateFieldJobs(records, { "SLA Status": "Running", "SLA Timer": "00:01", Status: "SLA started" });
  return updateOnly(records, { "SLA Started": started, "SLA Status": "Running", Status: "SLA started" }, "SLA timer started locally");
}

function scheduleVisit(records: DemoRecord[]) {
  const visit = dateTimeOffset(2);
  updateFieldJobs(records, { "SLA Status": "Visit scheduled", "SLA Timer": "02:00", Status: "Visit scheduled" });
  return updateOnly(records, { "Visit Scheduled": visit, "SLA Status": "Visit scheduled", Status: "Visit scheduled" }, "Visit scheduled locally");
}

function checkSpares(records: DemoRecord[]) {
  const rows = records.map((record, index) => spareRequest(record, index + 1));
  writeRows("Spare Parts Requests", rows, "Spare Request No");
  const updates = records.map((record, index) => {
    const row = rows[index];
    return { "SLA Status": row.Status.includes("Pending") ? "Pending spare parts" : "Spare parts available", "SLA Timer": "03:00", Status: row.Status.includes("Pending") ? "Pending spare parts" : "Spare parts checked" };
  });
  return { targetTab: "Spare Parts Requests", sourceUpdates: updates, message: `${rows.length} spare part check${rows.length === 1 ? "" : "s"} completed from local inventory` };
}

function requestProcurement(records: DemoRecord[], currentUser: string) {
  const rows = records.map((record, index) => ({
    "PR No": `PR-SVC-2026-${String(Date.now() % 10000 + index).padStart(5, "0")}`,
    "Requesting Module": "Service",
    "Requested By": currentUser,
    "Business Unit": "Service",
    Department: "Service",
    "Product Lines": `${record.Product || "Spare part"} x ${record["Needed Qty"] || "1"}`,
    "Required Date": dateOffset(7),
    Justification: `Service job ${record["Job No"] || ""} spare shortage`,
    Status: "Draft"
  }));
  writeOtherRows("procurement:Purchase Requests", rows, medtechScopeViews["procurement.Purchase Requests"].rows, "PR No");
  appendAuditLog({ action: "PROCUREMENT REQUEST", module: "Service", record: rows.map(row => row["PR No"]).join(", "), details: "Local service spare shortage converted to procurement request" });
  return { targetModule: "procurement", targetTab: "Purchase Requests", sourceUpdates: records.map((record, index) => ({ "Procurement Request": rows[index]["PR No"], Status: "Pending spare parts" })), message: `${rows.length} procurement request${rows.length === 1 ? "" : "s"} drafted locally` };
}

function resumeJobs(records: DemoRecord[]) {
  updateFieldJobs(records, { "SLA Status": "Running", "SLA Timer": "04:00", Status: "In progress" });
  return updateOnly(records, { Status: "Job resumed" }, "Job resumed after spare parts check");
}

function completeWork(records: DemoRecord[]) {
  const reports = records.map((record, index) => ({
    "Report No": nextTargetId("Service Reports", index + 1),
    "Job No": record["Job No"],
    Engineer: record.Engineer || "Service Engineer",
    Customer: record.Customer || "Customer",
    Equipment: record.Equipment || "Equipment",
    Issue: record.Issue || "Service issue",
    "Work Performed": record["Work Performed"] || "Service execution completed locally",
    "Spare Parts Consumed": spareSummary(record["Job No"]),
    Timesheet: record.Timesheet || "2.5 hrs",
    "Customer Signature": "Pending",
    Status: "Draft"
  }));
  const signoffs = reports.map((report, index) => ({
    "Sign-Off No": nextTargetId("Customer Sign-Off", index + 1),
    "Job No": report["Job No"],
    Customer: report.Customer,
    Contact: "",
    Equipment: report.Equipment,
    "Customer Signature": "Pending",
    "Work Accepted": "Pending",
    "Signed At": "",
    "Invoice Draft": "",
    Status: "Awaiting sign-off"
  }));
  writeRows("Service Reports", reports, "Report No");
  writeRows("Customer Sign-Off", signoffs, "Sign-Off No");
  return { targetTab: "Customer Sign-Off", sourceUpdates: records.map(() => ({ "Work Performed": "Service execution completed locally", Timesheet: "2.5 hrs", Worksheet: "Completed", Status: "Awaiting sign-off" })), message: `${reports.length} service report${reports.length === 1 ? "" : "s"} and sign-off${reports.length === 1 ? "" : "s"} prepared` };
}

function closeJobs(records: DemoRecord[]) {
  updateFieldJobs(records, { "SLA Status": "Stopped", "SLA Timer": "04:30", Status: "Closed" });
  return updateOnly(records, { Status: "Closed" }, "Service job closed locally");
}

function createInvoiceDrafts(records: DemoRecord[], currentUser: string) {
  const invoiceResult = runFinanceAction("generate-service-invoice", records.map(toInvoiceSource) as DemoRecord[], currentUser);
  if ("error" in invoiceResult) return invoiceResult;
  const sourceUpdates = ("sourceUpdates" in invoiceResult ? invoiceResult.sourceUpdates ?? [] : []) as Array<Record<string, string | undefined>>;
  const invoiceNos = sourceUpdates.map(update => update["Invoice draft"] || update["Invoice Draft"] || "").filter(Boolean);
  const drafts = records.map((record, index) => ({
    "Draft No": nextTargetId("Service Invoicing Drafts", index + 1),
    "Job No": record["Job No"] || record.Job || "",
    Customer: record.Customer || "Customer",
    Source: record["Sign-Off No"] || record["Draft No"] || record["Job No"] || "Service closure",
    Amount: record.Amount || "QAR 2400",
    Lines: record.Lines || record.Equipment || record["Work Performed"] || "Service labour and spare parts",
    "Finance Invoice Draft": invoiceNos[index] || "",
    Status: "Invoice drafted"
  }));
  writeRows("Service Invoicing Drafts", drafts, "Draft No");
  appendAuditLog({ action: "SERVICE INVOICE", module: "Service", record: drafts.map(row => row["Draft No"]).join(", "), details: "Finance customer invoice draft generated locally" });
  return { targetModule: "finance", targetTab: "Customer Invoices", sourceUpdates: drafts.map(row => ({ "Invoice Draft": row["Finance Invoice Draft"], "Finance Invoice Draft": row["Finance Invoice Draft"], Status: "Invoice drafted" })), message: `${drafts.length} service invoice draft${drafts.length === 1 ? "" : "s"} created locally` };
}

function spareRequest(record: Row, offset: number) {
  const product = record.Product || "Adult SpO2 Sensor";
  const sku = record.SKU || skuFor(product);
  const needed = qty(record["Needed Qty"]) || 1;
  const engineer = availableEngineerStock(sku || product);
  const warehouse = availableWarehouseStock(sku || product);
  const status = engineer >= needed ? "Available - engineer stock" : warehouse >= needed ? "Available - warehouse" : "Pending spare parts";
  return {
    "Spare Request No": record["Spare Request No"] || nextTargetId("Spare Parts Requests", offset),
    "Job No": record["Job No"],
    Product: product,
    SKU: sku,
    "Needed Qty": String(needed),
    "Engineer Stock": String(engineer),
    "Warehouse Stock": String(warehouse),
    "Procurement Request": status === "Pending spare parts" ? "Required" : "Not required",
    Status: status
  };
}

function updateOnly(records: DemoRecord[], values: Row, message: string) {
  return { sourceUpdates: records.map(() => values), message };
}

function updateFieldJobs(records: Row[], values: Row) {
  const jobs = readRows("Field Service Jobs");
  const ids = new Set(records.map(record => record["Job No"]).filter(Boolean));
  if (!ids.size) return;
  writeDemoRecordsSnapshot("service:Field Service Jobs", jobs.map(job => ids.has(job["Job No"]) ? { ...job, ...values } : job));
}

function toInvoiceSource(record: DemoRecord, index: number): DemoRecord {
  return createDemoRecord({
    Job: record["Job No"] || record.Job || record["Draft No"] || `JOB-${index + 1}`,
    Customer: record.Customer || "Customer",
    Equipment: record.Equipment || record.Lines || "Service labour",
    Total: record.Amount || "QAR 2400",
    "Customer sign-off": record["Sign-Off No"] || record["Customer Signature"] || "Signed off"
  }, index);
}

function writeRows(tab: string, rows: Row[], uniqueField: string) {
  writeOtherRows(`service:${tab}`, rows, medtechScopeViews[`service.${tab}`]?.rows ?? [], uniqueField);
}

function writeOtherRows(moduleKey: string, rows: Row[], seed: Row[], uniqueField: string) {
  const existing = readDemoRecordsSnapshot(moduleKey, seed);
  const keys = new Set(rows.map(row => row[uniqueField]).filter(Boolean));
  writeDemoRecordsSnapshot(moduleKey, [...rows.map(createDemoRecord), ...existing.filter(row => !keys.has(row[uniqueField]))].slice(0, 250));
}

function readRows(tab: string) {
  return readDemoRecordsSnapshot(`service:${tab}`, medtechScopeViews[`service.${tab}`]?.rows ?? []);
}

function prepareRow(tab: string, input: Record<string, unknown>, records: DemoRecord[], selected?: DemoRecord | null, rowNumber = 0, seen = new Set<string>()) {
  const columns = serviceColumns[tab];
  const row = Object.fromEntries(columns.map(column => [column, String(input[column] ?? defaultsFor(tab)[column] ?? "").trim()])) as Row;
  const key = firstColumn[tab];
  if (!row[key] || row[key] === "Auto generated") row[key] = nextId(tab, records);
  const missing = requiredFor(tab).filter(field => !row[field]);
  if (missing.length) throw new Error(prefix(rowNumber) + `Missing ${missing.join(", ")}`);
  assertUnique(row[key], key, records, seen, rowNumber, selected);
  return row;
}

function selectOptionsFor(tab: string) {
  return {
    Source: ["WhatsApp", "Phone", "Email", "Portal", "Manual"],
    Priority: ["Low", "Normal", "High", "Critical"],
    "Emergency Flag": ["No", "Yes"],
    "Contract / AMC Status": ["AMC active", "Warranty active", "Billable", "Checked locally"],
    Coordinator: ["Service Coordinator"],
    Engineer: engineers,
    "Accept / Reject": ["Pending", "Accepted", "Rejected"],
    "SLA Status": ["Not started", "Waiting", "Running", "Visit scheduled", "Pending spare parts", "Stopped", "Breached"],
    "Billing Schedule": ["Monthly", "Quarterly", "Half-yearly", "Annual"],
    "Renewal Status": ["Not due", "Due soon", "Suggested", "Renewed"],
    "Work Accepted": ["Pending", "Yes", "No"],
    Status: statuses,
    ...(tab === "Spare Parts Requests" ? { "Procurement Request": ["Not required", "Required", "Drafted"] } : {})
  };
}

function fieldTypesFor(columns: string[]) {
  return Object.fromEntries(columns.filter(column => column.includes("Date") || column.includes("Due") || column.includes("Scheduled") || column.includes("Started") || column === "Signed At").map(column => [column, "date" as RecordFieldType]));
}

function defaultsFor(tab: string) {
  return { [firstColumn[tab]]: "Auto generated", Source: "Manual", Priority: "Normal", "Emergency Flag": "No", "Contract / AMC Status": "Billable", Coordinator: "Service Coordinator", Engineer: "Naveen Kumar", "SLA Status": "Not started", "SLA Timer": "00:00", "Needed Qty": "1", "Engineer Stock": "0", "Warehouse Stock": "0", "Procurement Request": "Not required", "Billing Schedule": "Quarterly", "Renewal Status": "Not due", "Auto-renewal Suggestion": "Not due", "Invoice Schedule": "Quarterly", Amount: "QAR 2400", Status: tab === "AMC Contracts" ? "Active" : "Draft" };
}

function serviceSuggestions(): Record<string, RecordFieldSuggestion[]> {
  const customers = customerMasterRows.map(row => ({ value: row["Organization Name"], label: row["Customer Code"], fill: { Customer: row["Organization Name"], Contact: row["Contact Person"] || row.Phone } }));
  const products = productMasterRows.map(row => ({ value: row["Product Name"], label: row["SKU Code"], fill: { Equipment: row["Product Name"], Product: row["Product Name"], SKU: row["SKU Code"] } }));
  return { Customer: customers, Equipment: products, Product: products, "Equipment Covered": products, "Asset / Equipment": products };
}

function requiredFor(tab: string) {
  return serviceColumns[tab].filter(column => !["Contact", "Serial No", "SLA Started", "Visit Scheduled", "Work Performed", "Timesheet", "Worksheet", "Procurement Request", "Auto-renewal Suggestion", "Invoice Schedule", "Customer Signature", "Signed At", "Invoice Draft", "Finance Invoice Draft", "Spare Parts Consumed"].includes(column));
}

function assertUnique(value: string, field: string, records: DemoRecord[], seen: Set<string>, rowNumber: number, selected?: DemoRecord | null) {
  const normalized = value.toLowerCase();
  if (seen.has(normalized)) throw new Error(prefix(rowNumber) + `Duplicate ${field} in import`);
  seen.add(normalized);
  const duplicate = records.find(record => record[field]?.toLowerCase() === normalized && record.__id !== selected?.__id);
  if (duplicate) throw new Error(prefix(rowNumber) + `${field} already exists`);
}

function availableEngineerStock(sku: string) {
  return readDemoRecordsSnapshot("inventory:Engineer Stock", medtechScopeViews["inventory.Engineer Stock"].rows).filter(row => row.SKU === sku || row.Product === sku).reduce((total, row) => total + qty(row["Quantity On Hand"]), 0);
}

function availableWarehouseStock(sku: string) {
  return readDemoRecordsSnapshot("inventory:Stock On Hand", medtechScopeViews["inventory.Stock On Hand"].rows).filter(row => (row.SKU === sku || row.Product === sku) && row["QC Status"] === "Released").reduce((total, row) => total + qty(row["Available Quantity"]), 0);
}

function spareSummary(jobNo = "") {
  const rows = readRows("Spare Parts Requests").filter(row => row["Job No"] === jobNo);
  return rows.length ? rows.map(row => `${row.Product} x ${row["Needed Qty"]}`).join(", ") : "No spare parts consumed";
}

function nextTargetId(tab: string, offset = 1) {
  return nextId(tab, readRows(tab), offset);
}

function nextId(tab: string, records: Row[], offset = 1) {
  const prefixValue = `${firstColumn[tab].toUpperCase().replace(/[^A-Z]+/g, "-").replace(/-NO$/, "")}-2026-`;
  const key = firstColumn[tab];
  const max = records.map(record => Number(String(record[key] ?? "").replace(prefixValue, "").replace(/\D/g, ""))).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
  return `${prefixValue}${String(max + offset).padStart(5, "0")}`;
}

function skuFor(productName: string) {
  return productMasterRows.find(product => product["Product Name"] === productName)?.["SKU Code"] || (productName === "Adult SpO2 Sensor" ? "SP-SPO2-A" : "");
}

function qty(value = "") {
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function slaDue(priority = "", emergency = "") {
  return priority === "Critical" || emergency === "Yes" ? dateTimeOffset(2) : dateTimeOffset(8);
}

function now() {
  return new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dateTimeOffset(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function prefix(rowNumber: number) {
  return rowNumber ? `Row ${rowNumber}: ` : "";
}
