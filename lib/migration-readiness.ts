import { createClientId } from "@/lib/ids";

export type ImportTargetKey =
  | "customers" | "suppliers" | "products" | "employee_extensions" | "sales_stages"
  | "stock_opening_balances" | "open_quotations" | "open_pos" | "open_invoices"
  | "service_tickets" | "projects";

export type ReconciliationStatus = "Pending" | "In Progress" | "Reconciled" | "Failed" | "Accepted";
export type UatStatus = "Not Started" | "In Progress" | "Passed" | "Failed" | "Blocked" | "Signed Off";

export interface ImportTarget {
  key: ImportTargetKey;
  label: string;
  keyColumn: string;
  columns: string[];
  required: string[];
  aliases: string[];
}

export interface ImportErrorRow {
  row: number;
  target: string;
  message: string;
  data: Record<string, string>;
}

export interface ImportHistoryEntry {
  __id: string;
  Time: string;
  Target: string;
  File: string;
  "Total Rows": string;
  "Valid Rows": string;
  "Error Rows": string;
  "Imported Rows": string;
}

export interface ReconciliationRow {
  __id: string;
  "Dataset Name": string;
  "Source Count": string;
  "Imported Count": string;
  "Error Count": string;
  "Duplicate Count": string;
  "Reconciliation Status": ReconciliationStatus;
  Owner: string;
  Notes: string;
}

export interface UatRow {
  __id: string;
  "Test Case No": string;
  Area: string;
  Scenario: string;
  Preconditions: string;
  "Steps Summary": string;
  "Expected Result": string;
  "Actual Result": string;
  Owner: string;
  Status: UatStatus;
  "Defect Reference": string;
  "Sign-off By": string;
  "Sign-off Date": string;
  Notes: string;
}

export const importTargets: ImportTarget[] = [
  { key: "customers", label: "Customers", keyColumn: "Customer Code", columns: ["Customer Code", "Customer Name", "Segment", "Account Owner", "Status", "Notes"], required: ["Customer Code", "Customer Name"], aliases: ["customer", "client"] },
  { key: "suppliers", label: "Suppliers", keyColumn: "Supplier Code", columns: ["Supplier Code", "Supplier Name", "Category", "Contact", "Status", "Notes"], required: ["Supplier Code", "Supplier Name"], aliases: ["supplier", "vendor"] },
  { key: "products", label: "Products", keyColumn: "SKU", columns: ["SKU", "Product Name", "Category", "UOM", "List Price", "Status"], required: ["SKU", "Product Name"], aliases: ["product", "sku", "item"] },
  { key: "employee_extensions", label: "Employee extension data only", keyColumn: "Employee No", columns: ["Employee No", "Extension Type", "Field Name", "Field Value", "Effective Date", "Owner", "Notes"], required: ["Employee No", "Extension Type", "Field Name", "Field Value"], aliases: ["employee extension", "employee_ext", "hr extension"] },
  { key: "sales_stages", label: "Sales process stages", keyColumn: "Stage Code", columns: ["Stage Code", "Stage Name", "Sequence", "Probability", "Owner", "Status"], required: ["Stage Code", "Stage Name"], aliases: ["stage", "pipeline", "sales process"] },
  { key: "stock_opening_balances", label: "Stock opening balances", keyColumn: "Opening Balance No", columns: ["Opening Balance No", "SKU", "Location", "Lot / Serial", "Quantity", "Unit Cost", "Status"], required: ["Opening Balance No", "SKU", "Location", "Quantity"], aliases: ["opening balance", "stock", "inventory"] },
  { key: "open_quotations", label: "Open quotations", keyColumn: "Quotation No", columns: ["Quotation No", "Customer", "Date", "Total", "Owner", "Status"], required: ["Quotation No", "Customer", "Total"], aliases: ["quotation", "quote"] },
  { key: "open_pos", label: "Open POs", keyColumn: "PO No", columns: ["PO No", "Supplier", "Order Date", "Expected Date", "Total", "Status"], required: ["PO No", "Supplier", "Total"], aliases: ["po", "purchase order"] },
  { key: "open_invoices", label: "Open invoices", keyColumn: "Invoice No", columns: ["Invoice No", "Party", "Issue Date", "Due Date", "Amount", "Status"], required: ["Invoice No", "Party", "Amount"], aliases: ["invoice", "receivable", "payable"] },
  { key: "service_tickets", label: "Service tickets", keyColumn: "Ticket No", columns: ["Ticket No", "Customer", "Equipment", "Priority", "Owner", "Status"], required: ["Ticket No", "Customer", "Status"], aliases: ["service", "ticket", "case"] },
  { key: "projects", label: "Projects", keyColumn: "Project No", columns: ["Project No", "Customer", "Project Type", "Manager", "Contract Value", "Status"], required: ["Project No", "Customer", "Manager"], aliases: ["project", "milestone"] }
];

const byKey = new Map(importTargets.map(target => [target.key, target]));
const employeeMasterHeaders = new Set(["full name", "employee name", "department", "designation", "joined", "join date", "status", "work email", "email address"]);

export const reconciliationStatuses: ReconciliationStatus[] = ["Pending", "In Progress", "Reconciled", "Failed", "Accepted"];
export const uatStatuses: UatStatus[] = ["Not Started", "In Progress", "Passed", "Failed", "Blocked", "Signed Off"];
export const uatColumns = ["Test Case No", "Area", "Scenario", "Preconditions", "Steps Summary", "Expected Result", "Actual Result", "Owner", "Status", "Defect Reference", "Sign-off By", "Sign-off Date", "Notes"] as const;
export const reconciliationColumns = ["Dataset Name", "Source Count", "Imported Count", "Error Count", "Duplicate Count", "Reconciliation Status", "Owner", "Notes"] as const;

export function getImportTarget(key: ImportTargetKey) {
  const target = byKey.get(key);
  if (!target) throw new Error("Unknown import target");
  return target;
}

export function inferImportTarget(headers: string[], sheetName: string, fileName: string): ImportTarget {
  const haystack = `${sheetName} ${fileName}`.toLowerCase();
  const headerSet = new Set(headers.map(header => header.toLowerCase().trim()));
  const scored = importTargets.map(target => {
    const nameScore = [target.label, target.key, ...target.aliases].some(value => haystack.includes(value.toLowerCase())) ? 8 : 0;
    const columnScore = target.columns.filter(column => headerSet.has(column.toLowerCase())).length;
    return { target, score: nameScore + columnScore };
  }).sort((a, b) => b.score - a.score);
  return scored[0]?.score ? scored[0].target : importTargets[0];
}

export function validateImportRows(target: ImportTarget, rows: Record<string, unknown>[], existingKeys: string[] = []) {
  const valid: Record<string, string>[] = [];
  const errors: ImportErrorRow[] = [];
  const seen = new Set(existingKeys.map(value => value.toLowerCase()));
  const blockedEmployeeHeaders = target.key === "employee_extensions" ? Object.keys(rows[0] ?? {}).filter(header => employeeMasterHeaders.has(header.toLowerCase().trim())) : [];

  rows.forEach((raw, index) => {
    const row = Object.fromEntries(target.columns.map(column => [column, stringify(raw[column])]));
    const missing = target.required.filter(column => !row[column]);
    const duplicate = row[target.keyColumn] && seen.has(row[target.keyColumn].toLowerCase());
    if (blockedEmployeeHeaders.length) errors.push({ row: index + 2, target: target.label, message: `Employee Master columns are not allowed here: ${blockedEmployeeHeaders.join(", ")}`, data: row });
    else if (missing.length) errors.push({ row: index + 2, target: target.label, message: `Missing ${missing.join(", ")}`, data: row });
    else if (duplicate) errors.push({ row: index + 2, target: target.label, message: `Duplicate ${target.keyColumn}`, data: row });
    else { valid.push(row); seen.add(row[target.keyColumn].toLowerCase()); }
  });

  return { valid, errors, duplicateCount: errors.filter(error => error.message.includes("Duplicate")).length };
}

export function importStorageKey(target: ImportTargetKey) {
  return `medtech-demo:readiness-import:${target}:v1`;
}

export function historyEntry(input: { target: string; file: string; total: number; valid: number; errors: number; imported: number }): ImportHistoryEntry {
  return {
    __id: createClientId(),
    Time: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    Target: input.target,
    File: input.file,
    "Total Rows": String(input.total),
    "Valid Rows": String(input.valid),
    "Error Rows": String(input.errors),
    "Imported Rows": String(input.imported)
  };
}

export function seedReconciliationRows(): ReconciliationRow[] {
  return importTargets.map(target => ({
    __id: createClientId(),
    "Dataset Name": target.label,
    "Source Count": "0",
    "Imported Count": "0",
    "Error Count": "0",
    "Duplicate Count": "0",
    "Reconciliation Status": "Pending",
    Owner: target.key === "employee_extensions" ? "HR" : target.key.includes("open_") ? "Finance / Operations" : "Data Owner",
    Notes: "Local demo reconciliation"
  }));
}

export function seedUatRows(): UatRow[] {
  const categories = ["Module acceptance", "Customisation acceptance", "Automation acceptance", "KPI acceptance", "Data acceptance", "Process acceptance", "Training acceptance", "Hypercare exit"];
  const cases = ["Straight Forward Sales", "GPPRR", "Pharma Tender", "Project Sales Order", "Procure-to-pay", "Order-to-cash", "Monthly payroll with cost-center allocation", "Service ticket lifecycle with SLA", "Inventory expiry/FEFO", "Project milestone billing"];
  return [
    ...categories.map((area, index) => row(`ACC-${String(index + 1).padStart(3, "0")}`, area, area, "Readiness owner assigned", "Review checklist evidence", "Accepted or actioned", "PMO")),
    ...cases.map((scenario, index) => row(`E2E-${String(index + 1).padStart(3, "0")}`, areaForCase(scenario), scenario, "Master data and demo records ready", "Run end-to-end flow and capture result", "Scenario completes with audit trail", "Process Owner"))
  ];
}

function row(no: string, area: string, scenario: string, preconditions: string, steps: string, expected: string, owner: string): UatRow {
  return { __id: createClientId(), "Test Case No": no, Area: area, Scenario: scenario, Preconditions: preconditions, "Steps Summary": steps, "Expected Result": expected, "Actual Result": "", Owner: owner, Status: "Not Started", "Defect Reference": "", "Sign-off By": "", "Sign-off Date": "", Notes: "" };
}

function areaForCase(scenario: string) {
  if (scenario.includes("payroll")) return "HR / Finance";
  if (scenario.includes("Service")) return "Service";
  if (scenario.includes("Inventory")) return "Inventory";
  if (scenario.includes("Project")) return "Projects";
  if (scenario.includes("pay") || scenario.includes("cash")) return "Finance";
  return "Sales";
}

function stringify(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text).trim();
  return String(value).trim();
}
