"use client";

import { appendAuditLog } from "@/lib/audit-store";
import { createDemoRecord, readDemoRecordsSnapshot, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import type { MasterDataConfig } from "@/lib/master-data";
import type { RecordFieldType } from "@/components/record-modal";

type Row = Record<string, string>;

export type DocumentAction = "new-version" | "archive-attachment" | "expiry-renewal-task";

export const documentCategories = [
  "Customer CR/VAT", "Supplier Agreement", "Principal Quote", "Tender Document", "Costing Support", "PO Document", "Delivery Proof",
  "Service Report", "Regulatory Certificate", "HR Contract", "Asset Handover", "Expense Receipt", "Project Document", "Approval Support"
];

export const attachmentColumns: Record<string, string[]> = {
  Attachments: ["Attachment No", "Source Module", "Source Record", "File Name", "File Type", "File Size", "Uploaded By", "Uploaded At", "Version No", "Document Category", "Status", "Notes"],
  "Version History": ["Attachment No", "Source Module", "Source Record", "File Name", "File Type", "File Size", "Uploaded By", "Uploaded At", "Version No", "Document Category", "Status", "Notes"],
  "Document Expiry Tracker": ["Attachment No", "Source Module", "Source Record", "File Name", "Document Category", "Expiry Date", "Expiry Status", "Owner", "Status", "Notes"],
  "Local Archive": ["Attachment No", "Source Module", "Source Record", "File Name", "File Type", "File Size", "Archived By", "Archived At", "Version No", "Document Category", "Status", "Notes"]
};

const firstColumn = Object.fromEntries(Object.entries(attachmentColumns).map(([tab, columns]) => [tab, columns[0]]));

const seedRows: Record<string, Row[]> = {
  Attachments: [
    attachment("ATT-2026-0001", "Sales", "CUS-00018", "HMC CR VAT placeholder.pdf", "PDF", "metadata only", "Kashif", "Customer CR/VAT", "Active", "Local Demo Only - customer CR/VAT placeholder; no file stored."),
    attachment("ATT-2026-0002", "Procurement", "SUP-00019", "Thermo Fisher agreement placeholder.pdf", "PDF", "metadata only", "Kashif", "Supplier Agreement", "Active", "Local Demo Only - supplier agreement placeholder; no external storage."),
    attachment("ATT-2026-0003", "Quality", "REG-DX-TRP-100", "Troponin I registration certificate.pdf", "PDF", "metadata only", "Kashif", "Regulatory Certificate", "Active", "Local Demo Only - regulatory certificate metadata.")
  ],
  "Version History": [
    attachment("ATT-2026-0003", "Quality", "REG-DX-TRP-100", "Troponin I registration certificate.pdf", "PDF", "metadata only", "Kashif", "Regulatory Certificate", "Current", "Version 1 metadata placeholder.")
  ],
  "Document Expiry Tracker": [
    { "Attachment No": "ATT-2026-0002", "Source Module": "Procurement", "Source Record": "SUP-00019", "File Name": "Thermo Fisher agreement placeholder.pdf", "Document Category": "Supplier Agreement", "Expiry Date": "2026-09-30", "Expiry Status": "Due in 90 days", Owner: "Procurement Team", Status: "Review due", Notes: "Local Demo Only - renewal tracked from metadata." },
    { "Attachment No": "ATT-2026-0003", "Source Module": "Quality", "Source Record": "REG-DX-TRP-100", "File Name": "Troponin I registration certificate.pdf", "Document Category": "Regulatory Certificate", "Expiry Date": "2026-08-15", "Expiry Status": "Due in 60 days", Owner: "Regulatory Affairs", Status: "Review due", Notes: "Local Demo Only - regulatory expiry alert." }
  ],
  "Local Archive": []
};

export function getAttachmentView(tab: string) {
  const columns = attachmentColumns[tab];
  return columns ? { columns, rows: seedRows[tab] ?? [] } : null;
}

export function getAttachmentConfig(tab: string): MasterDataConfig | null {
  const columns = attachmentColumns[tab];
  if (!columns) return null;
  return {
    keyColumn: firstColumn[tab],
    filterColumns: columns.filter(column => ["Source Module", "Document Category", "Expiry Status", "Status"].includes(column)),
    searchColumns: columns,
    selectOptions: {
      "Source Module": ["Sales", "Procurement", "Inventory", "Shipping", "Service", "Finance", "Quality", "Projects", "HR", "Approvals", "Documents"],
      "Document Category": documentCategories,
      "Expiry Status": ["Valid", "Due in 90 days", "Due in 60 days", "Due in 30 days", "Expired"],
      Status: ["Active", "Current", "Replaced", "Archived", "Review due", "Renewal task created"]
    },
    fieldTypes: Object.fromEntries(columns.filter(column => column === "Expiry Date").map(column => [column, "date" as RecordFieldType])),
    defaultValues: defaultsFor(tab),
    suggestions: {},
    prepareSave: (input, records, selected) => prepareRow(tab, input, records, selected),
    validateImportRow: (input, rowNumber, records, seen) => prepareRow(tab, input, records, null, rowNumber, seen)
  };
}

export function documentActionsFor(tab: string) {
  if (tab === "Attachments") return [{ action: "new-version" as const, label: "New version" }, { action: "archive-attachment" as const, label: "Archive" }];
  if (tab === "Document Expiry Tracker") return [{ action: "expiry-renewal-task" as const, label: "Renewal task" }];
  return [];
}

export function runDocumentAction(action: DocumentAction, records: DemoRecord[], currentUser: string) {
  if (!records.length) return { error: "Select at least one record first." };
  if (action === "new-version") return newVersion(records, currentUser);
  if (action === "archive-attachment") return archive(records, currentUser);
  return expiryTask(records, currentUser);
}

export function createAttachmentPlaceholder(input: { sourceModule: string; sourceRecord: string; fileName: string; documentCategory?: string; uploadedBy: string; fileType?: string; fileSize?: string; notes?: string; expiryDate?: string }) {
  const row = {
    "Attachment No": nextAttachmentNo(),
    "Source Module": input.sourceModule,
    "Source Record": input.sourceRecord,
    "File Name": input.fileName,
    "File Type": input.fileType || typeFromName(input.fileName),
    "File Size": input.fileSize || "metadata only",
    "Uploaded By": input.uploadedBy,
    "Uploaded At": now(),
    "Version No": "1",
    "Document Category": input.documentCategory || categoryFor(input.sourceModule, input.fileName),
    Status: "Active",
    Notes: `Local Demo Only - ${input.notes || "placeholder metadata; no binary file stored."}`
  };
  upsert("Attachments", [row], "Attachment No");
  upsert("Version History", [{ ...row, Status: "Current" }], "Attachment No");
  if (input.expiryDate || expiringCategory(row["Document Category"])) {
    upsert("Document Expiry Tracker", [expiryRow(row, input.expiryDate || dateOffset(90))], "Attachment No");
  }
  appendAuditLog({ action: "ADD ATTACHMENT", module: "Documents", record: row["Attachment No"], details: `${row["Source Module"]} ${row["Source Record"]} placeholder metadata created locally` });
  return row;
}

function prepareRow(tab: string, input: Record<string, unknown>, records: DemoRecord[], selected?: DemoRecord | null, rowNumber = 0, seen = new Set<string>()) {
  const columns = attachmentColumns[tab];
  const row = Object.fromEntries(columns.map(column => [column, String(input[column] ?? defaultsFor(tab)[column] ?? "").trim()])) as Row;
  const key = firstColumn[tab];
  if (!row[key] || row[key] === "Auto generated") row[key] = nextId(tab, records);
  if (tab === "Attachments" || tab === "Version History") {
    row["File Type"] ||= typeFromName(row["File Name"]);
    row["File Size"] ||= "metadata only";
    row.Notes = row.Notes || "Local Demo Only - placeholder metadata; no binary file stored.";
  }
  if (tab === "Document Expiry Tracker") row["Expiry Status"] = expiryStatus(row["Expiry Date"]);
  const missing = columns.filter(column => !["Notes"].includes(column) && !row[column]);
  if (missing.length) throw new Error(prefix(rowNumber) + `Missing ${missing.join(", ")}`);
  if (tab !== "Version History") assertUnique(row[key], key, records, seen, selected, rowNumber);
  return row;
}

function newVersion(records: DemoRecord[], currentUser: string) {
  const updates = records.map(row => {
    const version = String((Number(row["Version No"]) || 1) + 1);
    const next = { ...row, "Uploaded By": currentUser, "Uploaded At": now(), "Version No": version, Status: "Active", Notes: `Local Demo Only - replacement placeholder for version ${version}; no binary file stored.` };
    upsert("Version History", [{ ...next, Status: "Current" }], "Attachment No", false);
    appendAuditLog({ action: "REPLACE ATTACHMENT", module: "Documents", record: row["Attachment No"], details: `${row["File Name"]} version ${version} metadata recorded locally` });
    return { "Uploaded By": currentUser, "Uploaded At": next["Uploaded At"], "Version No": version, Status: "Active", Notes: next.Notes };
  });
  return { targetTab: "Version History", sourceUpdates: updates, message: `${records.length} attachment version${records.length === 1 ? "" : "s"} recorded locally` };
}

function archive(records: DemoRecord[], currentUser: string) {
  const rows = records.map(row => ({
    "Attachment No": row["Attachment No"],
    "Source Module": row["Source Module"],
    "Source Record": row["Source Record"],
    "File Name": row["File Name"],
    "File Type": row["File Type"],
    "File Size": row["File Size"],
    "Archived By": currentUser,
    "Archived At": now(),
    "Version No": row["Version No"],
    "Document Category": row["Document Category"],
    Status: "Archived",
    Notes: `Local Demo Only - archived metadata for ${row["File Name"]}.`
  }));
  upsert("Local Archive", rows, "Attachment No");
  rows.forEach(row => appendAuditLog({ action: "ARCHIVE ATTACHMENT", module: "Documents", record: row["Attachment No"], details: `${row["File Name"]} archived locally` }));
  return { targetTab: "Local Archive", sourceUpdates: records.map(() => ({ Status: "Archived" })), message: `${rows.length} attachment${rows.length === 1 ? "" : "s"} archived locally` };
}

function expiryTask(records: DemoRecord[], currentUser: string) {
  const rows = records.map(row => ({
    "CAPA No": `DOC-REN-${row["Attachment No"]}`,
    Source: "Document Expiry",
    "Related Record": row["Attachment No"],
    Owner: row.Owner || currentUser,
    "Root Cause": "Document expiry approaching",
    "Corrective Action": "Collect renewal document placeholder",
    "Preventive Action": "Track document expiry from metadata",
    "Due Date": row["Expiry Date"],
    "Effectiveness Check": "Pending",
    Status: "Open"
  }));
  const existing = readDemoRecordsSnapshot("quality:CAPA Tracker", []);
  const keys = new Set(rows.map(row => row["CAPA No"]));
  writeDemoRecordsSnapshot("quality:CAPA Tracker", [...rows.map(createDemoRecord), ...existing.filter(row => !keys.has(row["CAPA No"]))].slice(0, 250));
  appendAuditLog({ action: "DOCUMENT EXPIRY TASK", module: "Documents", record: records.map(row => row["Attachment No"]).join(", "), details: "Local renewal task metadata created; no external storage called" });
  return { sourceUpdates: records.map(() => ({ Status: "Renewal task created" })), message: `${rows.length} document renewal task${rows.length === 1 ? "" : "s"} created locally` };
}

function upsert(tab: string, rows: Row[], uniqueField: string, replace = true) {
  const existing = readDemoRecordsSnapshot(`documents:${tab}`, seedRows[tab] ?? []);
  const keys = new Set(rows.map(row => `${row[uniqueField]}:${replace ? "" : row["Version No"]}`));
  const kept = existing.filter(row => !keys.has(`${row[uniqueField]}:${replace ? "" : row["Version No"]}`));
  writeDemoRecordsSnapshot(`documents:${tab}`, [...rows.map(createDemoRecord), ...kept].slice(0, 250));
}

function attachment(no: string, sourceModule: string, sourceRecord: string, fileName: string, fileType: string, fileSize: string, uploadedBy: string, category: string, status: string, notes: string) {
  return { "Attachment No": no, "Source Module": sourceModule, "Source Record": sourceRecord, "File Name": fileName, "File Type": fileType, "File Size": fileSize, "Uploaded By": uploadedBy, "Uploaded At": "2026-06-30 10:00", "Version No": "1", "Document Category": category, Status: status, Notes: notes };
}

function expiryRow(row: Row, expiryDate: string) {
  return { "Attachment No": row["Attachment No"], "Source Module": row["Source Module"], "Source Record": row["Source Record"], "File Name": row["File Name"], "Document Category": row["Document Category"], "Expiry Date": expiryDate, "Expiry Status": expiryStatus(expiryDate), Owner: row["Uploaded By"], Status: "Review due", Notes: "Local Demo Only - expiry tracked from attachment metadata." };
}

function defaultsFor(tab: string) {
  return { [firstColumn[tab]]: "Auto generated", "Source Module": "Documents", "Source Record": "Manual", "File Type": "PDF", "File Size": "metadata only", "Uploaded By": "Kashif", "Uploaded At": now(), "Version No": "1", "Document Category": "Approval Support", "Expiry Date": dateOffset(90), "Expiry Status": "Due in 90 days", Owner: "Document Control", Status: tab === "Local Archive" ? "Archived" : "Active", Notes: "Local Demo Only - placeholder metadata; no binary file stored." };
}

function categoryFor(sourceModule: string, fileName: string) {
  const name = `${sourceModule} ${fileName}`.toLowerCase();
  if (name.includes("reg") || name.includes("certificate")) return "Regulatory Certificate";
  if (name.includes("supplier") || name.includes("agreement")) return "Supplier Agreement";
  if (name.includes("delivery") || name.includes("pod")) return "Delivery Proof";
  if (name.includes("service")) return "Service Report";
  if (name.includes("hr") || name.includes("contract")) return "HR Contract";
  if (name.includes("po") || name.includes("purchase")) return "PO Document";
  if (name.includes("project")) return "Project Document";
  return "Approval Support";
}

function expiringCategory(category: string) {
  return ["Regulatory Certificate", "Supplier Agreement", "HR Contract"].includes(category);
}

function expiryStatus(value = "") {
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (!Number.isFinite(days)) return "Valid";
  if (days < 0) return "Expired";
  if (days <= 30) return "Due in 30 days";
  if (days <= 60) return "Due in 60 days";
  if (days <= 90) return "Due in 90 days";
  return "Valid";
}

function typeFromName(fileName: string) {
  return (fileName.split(".").pop() || "PDF").toUpperCase();
}

function nextAttachmentNo() {
  return nextId("Attachments", readDemoRecordsSnapshot("documents:Attachments", seedRows.Attachments));
}

function nextId(tab: string, records: Row[], offset = 1) {
  const key = firstColumn[tab];
  const max = records.map(record => Number(String(record[key] || "").replace(/\D/g, ""))).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
  return `ATT-2026-${String(max + offset).padStart(4, "0")}`;
}

function assertUnique(value: string, field: string, records: DemoRecord[], seen: Set<string>, selected?: DemoRecord | null, rowNumber = 0) {
  const normalized = value.toLowerCase();
  if (seen.has(normalized)) throw new Error(prefix(rowNumber) + `Duplicate ${field} in import`);
  seen.add(normalized);
  if (records.some(record => record[field]?.toLowerCase() === normalized && record.__id !== selected?.__id)) throw new Error(prefix(rowNumber) + `${field} already exists`);
}

function now() {
  return new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function prefix(rowNumber: number) {
  return rowNumber ? `Row ${rowNumber}: ` : "";
}
