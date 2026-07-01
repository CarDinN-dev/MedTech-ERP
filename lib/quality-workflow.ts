"use client";

import { appendAuditLog } from "@/lib/audit-store";
import { createDemoRecord, readDemoRecordsSnapshot, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import type { MasterDataConfig } from "@/lib/master-data";
import { customerMasterRows, productMasterRows, supplierMasterRows } from "@/lib/master-data";
import type { RecordFieldSuggestion, RecordFieldType } from "@/components/record-modal";
import { medtechScopeViews } from "@/lib/medtech-scope-data";

type Row = Record<string, string>;

export type QualityAction = "rma-credit-note" | "complaint-service-ticket" | "complaint-rma" | "trace-recall" | "apply-qc-decision" | "regulatory-renewal-task";

export const qualityColumns: Record<string, string[]> = {
  "Customer Returns / RMA": ["RMA No", "Customer", "Source Invoice / Delivery", "Product", "SKU", "Lot/Batch/Serial", "Quantity", "Reason", "Condition", "Return Date", "QC Status", "Resolution", "Status"],
  "Supplier Returns": ["Supplier", "PO/GRN", "Product", "Quantity", "Reason", "Status"],
  "Product Complaints": ["Complaint No", "Customer", "Product", "Batch/Serial", "Complaint Type", "Severity", "Reported Date", "Investigation Owner", "Root Cause", "Corrective Action", "Preventive Action", "Linked Service Ticket", "Linked RMA", "Status"],
  "Batch Recall": ["Recall No", "Product", "Batch/Lot", "Affected Customers", "Affected Stock", "Recall Reason", "Action Required", "Status"],
  "QC Inspection": ["QC No", "Source", "Product", "SKU", "Lot/Batch/Serial", "Quantity", "Inspector", "Inspection Date", "QC Status", "Decision", "Linked Inventory", "Status"],
  "Regulatory Registration Tracker": ["Product", "Regulatory Class", "Registration Status", "Certificate No", "Expiry Date", "Renewal Owner", "Status", "Attachment Placeholder"],
  "Certificates / Documents": ["Document", "Product", "Customer / Supplier", "Category", "Certificate No", "Expiry Date", "Attachment Placeholder", "Status"],
  "CAPA Tracker": ["CAPA No", "Source", "Related Record", "Owner", "Root Cause", "Corrective Action", "Preventive Action", "Due Date", "Effectiveness Check", "Status"]
};

const firstColumn = Object.fromEntries(Object.entries(qualityColumns).map(([tab, columns]) => [tab, columns[0]]));
const prefixes: Record<string, string> = {
  "Customer Returns / RMA": "RMA-2026-",
  "Product Complaints": "CMP-2026-",
  "Batch Recall": "REC-2026-",
  "QC Inspection": "QCI-2026-",
  "CAPA Tracker": "CAPA-2026-"
};

const seedRows: Record<string, Row[]> = {
  "Customer Returns / RMA": [
    { "RMA No": "RMA-2026-00018", Customer: "Hamad Medical Corporation", "Source Invoice / Delivery": "INV-2026-00481 / DO-2026-00281", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", "Lot/Batch/Serial": "LOT-TI-2604", Quantity: "2", Reason: "Temperature excursion claim", Condition: "Unopened", "Return Date": "2026-06-24", "QC Status": "Pending", Resolution: "Credit Note", Status: "QC pending" }
  ],
  "Supplier Returns": [
    { Supplier: "Thermo Fisher Scientific", "PO/GRN": "PO-2026-0124 / GRN-2026-0094", Product: "Troponin I Reagent Kit", Quantity: "4", Reason: "Short expiry supplied", Status: "Supplier notified" }
  ],
  "Product Complaints": [
    { "Complaint No": "CMP-2026-00032", Customer: "Sidra Medicine", Product: "Patient Monitor MX750", "Batch/Serial": "SN-MX750-88421", "Complaint Type": "Device alarm issue", Severity: "High", "Reported Date": "2026-06-28", "Investigation Owner": "Quality Manager", "Root Cause": "Under investigation", "Corrective Action": "Service inspection required", "Preventive Action": "Review installation checklist", "Linked Service Ticket": "", "Linked RMA": "", Status: "Investigation open" }
  ],
  "Batch Recall": [
    { "Recall No": "REC-2026-00007", Product: "Troponin I Reagent Kit", "Batch/Lot": "LOT-TI-2604", "Affected Customers": "Pending trace", "Affected Stock": "Pending trace", "Recall Reason": "Manufacturer stability notice", "Action Required": "Quarantine stock and notify affected customers", Status: "Draft" }
  ],
  "QC Inspection": [
    { "QC No": "QCI-2026-00041", Source: "RMA-2026-00018", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", "Lot/Batch/Serial": "LOT-TI-2604", Quantity: "2", Inspector: "Quality Team", "Inspection Date": "2026-06-25", "QC Status": "Pending", Decision: "Quarantine", "Linked Inventory": "inventory:Stock On Hand", Status: "Open" }
  ],
  "Regulatory Registration Tracker": productMasterRows.map(product => ({
    Product: product["Product Name"],
    "Regulatory Class": product["Regulatory Class"],
    "Registration Status": product["Regulatory Registration Status"],
    "Certificate No": `REG-${product["SKU Code"]}`,
    "Expiry Date": product["Product Name"] === "Troponin I Reagent Kit" ? "2026-08-15" : "2027-12-31",
    "Renewal Owner": "Regulatory Affairs",
    Status: product["Product Name"] === "Troponin I Reagent Kit" ? "Renewal due" : "Active",
    "Attachment Placeholder": "local-certificate-placeholder.pdf"
  })),
  "Certificates / Documents": [
    { Document: "ISO 13485 Certificate.pdf", Product: "Company quality system", "Customer / Supplier": "MedTech Corporation", Category: "QMS Certificate", "Certificate No": "ISO13485-2026", "Expiry Date": "2027-03-31", "Attachment Placeholder": "iso13485-local.pdf", Status: "Active" },
    { Document: "Troponin I Registration.pdf", Product: "Troponin I Reagent Kit", "Customer / Supplier": "Thermo Fisher Scientific", Category: "Product Registration", "Certificate No": "REG-DX-TRP-100", "Expiry Date": "2026-08-15", "Attachment Placeholder": "reg-dx-trp-local.pdf", Status: "Renewal due" }
  ],
  "CAPA Tracker": [
    { "CAPA No": "CAPA-2026-00012", Source: "Complaint", "Related Record": "CMP-2026-00032", Owner: "Quality Manager", "Root Cause": "Under investigation", "Corrective Action": "Service inspection required", "Preventive Action": "Update installation checklist", "Due Date": "2026-07-15", "Effectiveness Check": "Pending", Status: "Open" }
  ]
};

export function getQualityView(tab: string) {
  const columns = qualityColumns[tab];
  return columns ? { columns, rows: seedRows[tab] ?? [] } : null;
}

export function getQualityConfig(tab: string): MasterDataConfig | null {
  const columns = qualityColumns[tab];
  if (!columns) return null;
  return {
    keyColumn: firstColumn[tab],
    filterColumns: columns.filter(column => ["Customer", "Supplier", "QC Status", "Resolution", "Severity", "Registration Status", "Category", "Status"].includes(column)),
    searchColumns: columns,
    selectOptions: selectOptionsFor(tab),
    fieldTypes: Object.fromEntries(columns.filter(column => column.includes("Date") || column === "Expiry Date" || column === "Due Date").map(column => [column, "date" as RecordFieldType])),
    defaultValues: defaultsFor(tab),
    suggestions: suggestionsFor(),
    prepareSave: (input, records, selected) => prepareRow(tab, input, records, selected),
    validateImportRow: (input, rowNumber, records, seen) => prepareRow(tab, input, records, null, rowNumber, seen)
  };
}

export function qualityActionsFor(tab: string) {
  if (tab === "Customer Returns / RMA") return [{ action: "rma-credit-note" as const, label: "Credit note draft" }];
  if (tab === "Product Complaints") return [{ action: "complaint-service-ticket" as const, label: "Service ticket" }, { action: "complaint-rma" as const, label: "Create RMA" }];
  if (tab === "Batch Recall") return [{ action: "trace-recall" as const, label: "Trace and quarantine" }];
  if (tab === "QC Inspection") return [{ action: "apply-qc-decision" as const, label: "Apply QC decision" }];
  if (tab === "Regulatory Registration Tracker") return [{ action: "regulatory-renewal-task" as const, label: "Renewal task" }];
  return [];
}

export function runQualityAction(action: QualityAction, tab: string, records: DemoRecord[], currentUser: string) {
  if (!records.length) return { error: "Select at least one record first." };
  if (action === "rma-credit-note") return creditNoteDraft(records, currentUser);
  if (action === "complaint-service-ticket") return complaintServiceTicket(records, currentUser);
  if (action === "complaint-rma") return complaintRma(records);
  if (action === "trace-recall") return traceRecall(records);
  if (action === "apply-qc-decision") return applyQc(records);
  if (tab === "Regulatory Registration Tracker") return regulatoryTask(records);
  return { error: "Unsupported quality action." };
}

function prepareRow(tab: string, input: Record<string, unknown>, records: DemoRecord[], selected?: DemoRecord | null, rowNumber = 0, seen = new Set<string>()) {
  const columns = qualityColumns[tab];
  const row = Object.fromEntries(columns.map(column => [column, String(input[column] ?? defaultsFor(tab)[column] ?? "").trim()])) as Row;
  const key = firstColumn[tab];
  if (!row[key] || row[key] === "Auto generated") row[key] = nextId(tab, records);
  if (tab === "Customer Returns / RMA") fillProduct(row);
  if (tab === "Regulatory Registration Tracker") fillRegistration(row);
  const missing = requiredFor(tab).filter(field => !row[field]);
  if (missing.length) throw new Error(prefix(rowNumber) + `Missing ${missing.join(", ")}`);
  if (!["Supplier Returns", "Regulatory Registration Tracker", "Certificates / Documents"].includes(tab)) assertUnique(row[key], key, records, seen, selected, rowNumber);
  return row;
}

function creditNoteDraft(records: DemoRecord[], currentUser: string) {
  const blocked = records.find(row => row.Resolution !== "Credit Note");
  if (blocked) return { error: `${blocked["RMA No"]} resolution is ${blocked.Resolution}; credit note draft is only for Credit Note RMAs.` };
  const rows = records.map(row => ({
    "Credit Note No": nextFinanceCreditNoteId(),
    "Linked Invoice/Bill": row["Source Invoice / Delivery"],
    Party: row.Customer,
    Date: today(),
    Amount: "QAR 0",
    Reason: `${row["RMA No"]}: ${row.Reason}`,
    Status: "Draft"
  }));
  writeOtherRows("finance:Credit Notes", rows, medtechScopeViews["finance.Credit Notes"]?.rows ?? [], "Credit Note No");
  appendAuditLog({ action: "CREDIT NOTE DRAFT", module: "Quality", record: rows.map(row => row["Credit Note No"]).join(", "), details: `RMA credit note draft created locally by ${currentUser}` });
  return { targetModule: "finance", targetTab: "Credit Notes", sourceUpdates: records.map((record, index) => ({ "QC Status": record["QC Status"] || "Pending", Status: `Credit note drafted: ${rows[index]["Credit Note No"]}` })), message: `${rows.length} local credit note draft${rows.length === 1 ? "" : "s"} created` };
}

function complaintServiceTicket(records: DemoRecord[], currentUser: string) {
  const rows = records.map(row => ({
    "Request No": nextServiceRequestId(),
    Source: "Complaint",
    Customer: row.Customer,
    Contact: "",
    Equipment: row.Product,
    "Serial No": row["Batch/Serial"],
    Issue: `${row["Complaint No"]}: ${row["Complaint Type"]}`,
    Priority: row.Severity === "Critical" ? "Critical" : row.Severity === "High" ? "High" : "Normal",
    "Emergency Flag": row.Severity === "Critical" ? "Yes" : "No",
    "Contract / AMC Status": "Checked locally",
    Status: "New Request"
  }));
  writeOtherRows("service:Service Requests", rows, medtechScopeViews["service.Service Requests"]?.rows ?? [], "Request No");
  appendAuditLog({ action: "SERVICE TICKET", module: "Quality", record: rows.map(row => row["Request No"]).join(", "), details: `Complaint linked to local service by ${currentUser}` });
  return { targetModule: "service", targetTab: "Service Requests", sourceUpdates: rows.map(row => ({ "Linked Service Ticket": row["Request No"], Status: "Service linked" })), message: `${rows.length} service ticket${rows.length === 1 ? "" : "s"} created from complaint` };
}

function complaintRma(records: DemoRecord[]) {
  const rows = records.map(row => ({
    "RMA No": nextQualityId("Customer Returns / RMA"),
    Customer: row.Customer,
    "Source Invoice / Delivery": row["Complaint No"],
    Product: row.Product,
    SKU: skuFor(row.Product),
    "Lot/Batch/Serial": row["Batch/Serial"],
    Quantity: "1",
    Reason: row["Complaint Type"],
    Condition: "Customer complaint",
    "Return Date": today(),
    "QC Status": "Pending",
    Resolution: "Repair",
    Status: "RMA opened"
  }));
  writeRows("Customer Returns / RMA", rows, "RMA No");
  return { targetTab: "Customer Returns / RMA", sourceUpdates: rows.map(row => ({ "Linked RMA": row["RMA No"], Status: "RMA linked" })), message: `${rows.length} RMA${rows.length === 1 ? "" : "s"} opened from complaint` };
}

function traceRecall(records: DemoRecord[]) {
  const updates = records.map(recall => {
    const product = recall.Product;
    const lot = recall["Batch/Lot"];
    const stock = readDemoRecordsSnapshot("inventory:Stock On Hand", medtechScopeViews["inventory.Stock On Hand"]?.rows ?? []);
    const affectedStock = stock.filter(row => matchesRecall(row, product, lot));
    writeDemoRecordsSnapshot("inventory:Stock On Hand", stock.map(row => matchesRecall(row, product, lot) ? { ...row, "QC Status": "Quarantine", "Available Quantity": "0", Status: "Quarantine" } : row));

    const reservations = readDemoRecordsSnapshot("inventory:Reservations", medtechScopeViews["inventory.Reservations"]?.rows ?? []);
    writeDemoRecordsSnapshot("inventory:Reservations", reservations.map(row => matchesRecall(row, product, lot) ? { ...row, "Dispatch Blocked": "Yes", Status: "Blocked" } : row));

    const picks = readDemoRecordsSnapshot("shipping:Pick Lists", []);
    const affectedPicks = picks.filter(row => matchesRecall({ Product: row["Product Lines"], "Lot/Batch/Serial": row["Lot/Batch/Serial"] }, product, lot));
    writeDemoRecordsSnapshot("shipping:Pick Lists", picks.map(row => matchesRecall({ Product: row["Product Lines"], "Lot/Batch/Serial": row["Lot/Batch/Serial"] }, product, lot) ? { ...row, "QC Status": "Quarantine", Status: "Blocked" } : row));

    const orders = readDemoRecordsSnapshot("shipping:Delivery Orders", []);
    const affectedOrders = orders.filter(row => affectedPicks.some(pick => pick["Delivery Order No"] === row["Delivery Order No"]) || row.Notes?.toLowerCase().includes(product.toLowerCase()));
    writeDemoRecordsSnapshot("shipping:Delivery Orders", orders.map(row => affectedOrders.some(order => order["Delivery Order No"] === row["Delivery Order No"]) ? { ...row, Status: "Recall hold", Notes: `${row.Notes || ""} | Recall hold ${recall["Recall No"]}`.trim() } : row));

    const customers = Array.from(new Set(affectedOrders.map(row => row.Customer).filter(Boolean))).join(", ") || "No local delivery match";
    appendAuditLog({ action: "RECALL TRACE", module: "Quality", record: recall["Recall No"], details: `${affectedStock.length} local stock row(s), ${affectedOrders.length} delivery row(s) quarantined/held` });
    return { "Affected Customers": customers, "Affected Stock": String(affectedStock.reduce((total, row) => total + qty(row["Available Quantity"] || row["Quantity On Hand"]), 0)), Status: "Trace complete" };
  });
  return { sourceUpdates: updates, message: `${records.length} recall trace${records.length === 1 ? "" : "s"} completed; matching local stock is quarantined` };
}

function applyQc(records: DemoRecord[]) {
  const stock = readDemoRecordsSnapshot("inventory:Stock On Hand", medtechScopeViews["inventory.Stock On Hand"]?.rows ?? []);
  for (const record of records) {
    const quarantine = record.Decision !== "Release";
    writeDemoRecordsSnapshot("inventory:Stock On Hand", stock.map(row => matchesRecall(row, record.Product, record["Lot/Batch/Serial"]) ? { ...row, "QC Status": quarantine ? "Quarantine" : "Released", Status: quarantine ? "Quarantine" : "Available" } : row));
  }
  return { sourceUpdates: records.map(row => ({ "QC Status": row.Decision === "Release" ? "Released" : "Quarantine", Status: row.Decision === "Release" ? "Released" : "Quarantined" })), message: `${records.length} QC decision${records.length === 1 ? "" : "s"} applied to local inventory` };
}

function regulatoryTask(records: DemoRecord[]) {
  const rows = records.map(row => ({
    "CAPA No": nextQualityId("CAPA Tracker"),
    Source: "Regulatory",
    "Related Record": row["Certificate No"],
    Owner: row["Renewal Owner"],
    "Root Cause": "Registration expiry approaching",
    "Corrective Action": "Prepare renewal dossier",
    "Preventive Action": "Track renewal 90 days before expiry",
    "Due Date": row["Expiry Date"],
    "Effectiveness Check": "Pending",
    Status: "Open"
  }));
  writeRows("CAPA Tracker", rows, "CAPA No");
  return { targetTab: "CAPA Tracker", sourceUpdates: records.map(() => ({ Status: "Renewal task created" })), message: `${rows.length} regulatory renewal task${rows.length === 1 ? "" : "s"} created locally` };
}

function writeRows(tab: string, rows: Row[], uniqueField: string) {
  writeOtherRows(`quality:${tab}`, rows, seedRows[tab] ?? [], uniqueField);
}

function writeOtherRows(moduleKey: string, rows: Row[], seed: Row[], uniqueField: string) {
  const existing = readDemoRecordsSnapshot(moduleKey, seed);
  const keys = new Set(rows.map(row => row[uniqueField]).filter(Boolean));
  writeDemoRecordsSnapshot(moduleKey, [...rows.map(createDemoRecord), ...existing.filter(row => !keys.has(row[uniqueField]))].slice(0, 250));
}

function requiredFor(tab: string) {
  return qualityColumns[tab].filter(column => !["Root Cause", "Corrective Action", "Preventive Action", "Linked Service Ticket", "Linked RMA", "Attachment Placeholder", "Affected Customers", "Affected Stock"].includes(column));
}

function selectOptionsFor(tab: string) {
  return {
    Customer: customerMasterRows.map(row => row["Organization Name"]),
    Supplier: supplierMasterRows.map(row => row["Principal / Supplier Name"]),
    Product: productMasterRows.map(row => row["Product Name"]),
    "QC Status": ["Pending", "Released", "Quarantine", "Rejected"],
    Condition: ["Unopened", "Opened", "Damaged", "Used", "Customer complaint"],
    Resolution: ["Replace", "Credit Note", "Repair", "Reject", "Scrap"],
    Severity: ["Low", "Medium", "High", "Critical"],
    Decision: ["Release", "Quarantine", "Reject", "Scrap"],
    "Registration Status": ["Registered", "Renewal due", "Expired", "Submitted", "Not registered"],
    Category: ["QMS Certificate", "Product Registration", "Authorized Distributor", "COA", "SDS", "Customer document"],
    Status: tab === "Regulatory Registration Tracker" ? ["Active", "Renewal due", "Renewal task created", "Expired", "Submitted"] : ["Draft", "Open", "QC pending", "Investigation open", "Trace complete", "Quarantined", "Released", "Rejected", "Closed", "Credit note drafted"]
  };
}

function defaultsFor(tab: string) {
  return { [firstColumn[tab]]: "Auto generated", Quantity: "1", "Return Date": today(), "Reported Date": today(), "Inspection Date": today(), "Expiry Date": dateOffset(60), "Due Date": dateOffset(14), "QC Status": "Pending", Resolution: "Replace", Severity: "Medium", Decision: "Quarantine", "Registration Status": "Registered", "Renewal Owner": "Regulatory Affairs", "Attachment Placeholder": "Local placeholder", Status: tab === "Regulatory Registration Tracker" ? "Active" : "Draft" };
}

function suggestionsFor(): Record<string, RecordFieldSuggestion[]> {
  const products = productMasterRows.map(row => ({ value: row["Product Name"], label: row["SKU Code"], fill: { Product: row["Product Name"], SKU: row["SKU Code"], "Regulatory Class": row["Regulatory Class"], "Registration Status": row["Regulatory Registration Status"] } }));
  const customers = customerMasterRows.map(row => ({ value: row["Organization Name"], label: row["Customer Code"], fill: { Customer: row["Organization Name"] } }));
  const suppliers = supplierMasterRows.map(row => ({ value: row["Principal / Supplier Name"], label: row["Supplier Code"], fill: { Supplier: row["Principal / Supplier Name"], "Customer / Supplier": row["Principal / Supplier Name"] } }));
  return { Product: products, Customer: customers, Supplier: suppliers };
}

function fillProduct(row: Row) {
  row.SKU ||= skuFor(row.Product);
}

function fillRegistration(row: Row) {
  const product = productMasterRows.find(item => item["Product Name"] === row.Product);
  row["Regulatory Class"] ||= product?.["Regulatory Class"] || "Class I";
  row["Registration Status"] ||= product?.["Regulatory Registration Status"] || "Registered";
}

function matchesRecall(row: Row, product: string, lot: string) {
  const rowProduct = row.Product || row["Product Lines"] || "";
  const rowLot = row["Lot/Batch/Serial"] || row["Batch/Serial"] || "";
  return rowProduct.toLowerCase().includes(product.toLowerCase()) && (!lot || rowLot.toLowerCase().includes(lot.toLowerCase()));
}

function nextQualityId(tab: string) {
  return nextId(tab, readDemoRecordsSnapshot(`quality:${tab}`, seedRows[tab] ?? []));
}

function nextId(tab: string, records: Row[], offset = 1) {
  const key = firstColumn[tab];
  const prefixValue = prefixes[tab] || `${tab.toUpperCase().replace(/[^A-Z]+/g, "-")}-`;
  const max = records.map(record => Number(String(record[key] || "").replace(prefixValue, "").replace(/\D/g, ""))).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
  return `${prefixValue}${String(max + offset).padStart(5, "0")}`;
}

function nextFinanceCreditNoteId() {
  const rows = readDemoRecordsSnapshot("finance:Credit Notes", medtechScopeViews["finance.Credit Notes"]?.rows ?? []);
  const max = rows.map(row => Number(String(row["Credit Note No"] || "").replace(/\D/g, ""))).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
  return `CN-DRAFT-2026-${String(max + 1).padStart(5, "0")}`;
}

function nextServiceRequestId() {
  const rows = readDemoRecordsSnapshot("service:Service Requests", medtechScopeViews["service.Service Requests"]?.rows ?? []);
  const max = rows.map(row => Number(String(row["Request No"] || "").replace(/\D/g, ""))).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
  return `SRV-2026-${String(max + 1).padStart(4, "0")}`;
}

function skuFor(productName: string) {
  return productMasterRows.find(row => row["Product Name"] === productName)?.["SKU Code"] || "";
}

function qty(value = "") {
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

function assertUnique(value: string, field: string, records: DemoRecord[], seen: Set<string>, selected?: DemoRecord | null, rowNumber = 0) {
  const normalized = value.toLowerCase();
  if (seen.has(normalized)) throw new Error(prefix(rowNumber) + `Duplicate ${field} in import`);
  seen.add(normalized);
  if (records.some(record => record[field]?.toLowerCase() === normalized && record.__id !== selected?.__id)) throw new Error(prefix(rowNumber) + `${field} already exists`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function prefix(rowNumber: number) {
  return rowNumber ? `Row ${rowNumber}: ` : "";
}
