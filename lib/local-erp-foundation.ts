export interface BusinessUnit { code: string; name: string; owner: string; status: string; }
export interface DepartmentMaster { code: string; name: string; businessUnit: string; head: string; status: string; }
export interface CostCenter { code: string; name: string; businessUnit: string; department: string; allocation: string; status: string; }
export interface CustomerHierarchyLevel { organization: string; account: string; department: string; subDepartment: string; customerCode: string; }
export interface SupplierPrincipal { code: string; name: string; country: string; businessUnit: string; status: string; }
export interface ProductSku { sku: string; name: string; businessUnit: string; supplierCode: string; status: string; }
export interface Warehouse { code: string; name: string; type: string; status: string; }
export interface WarehouseLocation { code: string; warehouse: string; zone: string; bin: string; status: string; }
export interface LotBatchSerial { productSku: string; lotOrSerial: string; expiryDate: string; status: string; }
export interface CurrencyMaster { code: string; name: string; rateToQar: string; status: string; }
export interface PaymentTerm { code: string; name: string; days: string; status: string; }
export interface ApprovalRole { code: string; role: string; module: string; status: string; }
export interface DocumentSequence { documentType: string; prefix: string; nextNumber: string; reset: string; status: string; }
export interface WorkflowStatus { workflow: string; status: string; next: string; final: string; }

export const setupSeedViews: Record<string, { columns: string[]; rows: Array<Record<string, string>> }> = {
  "admin.Business Units": {
    columns: ["Business Unit", "BU Code", "Owner", "Revenue target", "Default cost center", "Status"],
    rows: [
      { "Business Unit": "Diagnostics", "BU Code": "BU-DIAG", Owner: "Commercial Director", "Revenue target": "QAR 8,000,000", "Default cost center": "CC-410", Status: "Active" },
      { "Business Unit": "Medical Equipment", "BU Code": "BU-ME", Owner: "Sales Director", "Revenue target": "QAR 12,000,000", "Default cost center": "CC-420", Status: "Active" },
      { "Business Unit": "Pharma", "BU Code": "BU-PHARMA", Owner: "Pharma Manager", "Revenue target": "QAR 6,000,000", "Default cost center": "CC-430", Status: "Draft" }
    ]
  },
  "admin.Departments": {
    columns: ["Department", "Department Code", "Business Unit", "Department Head", "Parent", "Cost center", "Status"],
    rows: [
      { Department: "Sales", "Department Code": "DEP-SAL", "Business Unit": "Medical Equipment", "Department Head": "Fahad Al-Kuwari", Parent: "Commercial", "Cost center": "CC-400", Status: "Active" },
      { Department: "Procurement", "Department Code": "DEP-PRC", "Business Unit": "Operations", "Department Head": "Mariam Said", Parent: "Supply Chain", "Cost center": "CC-610", Status: "Active" },
      { Department: "Warehouse", "Department Code": "DEP-WHS", "Business Unit": "Operations", "Department Head": "Omar Nasser", Parent: "Supply Chain", "Cost center": "CC-620", Status: "Active" }
    ]
  },
  "admin.Cost Centers": {
    columns: ["Cost Center", "Code", "Business Unit", "Department", "Default allocation %", "Finance owner", "Status"],
    rows: [
      { "Cost Center": "Sales Operations", Code: "CC-400", "Business Unit": "Medical Equipment", Department: "Sales", "Default allocation %": "100", "Finance owner": "Finance Manager", Status: "Active" },
      { "Cost Center": "Diagnostics Commercial", Code: "CC-410", "Business Unit": "Diagnostics", Department: "Sales", "Default allocation %": "100", "Finance owner": "Finance Manager", Status: "Active" },
      { "Cost Center": "Warehouse Operations", Code: "CC-620", "Business Unit": "Operations", Department: "Warehouse", "Default allocation %": "100", "Finance owner": "Finance Manager", Status: "Active" }
    ]
  },
  "admin.Approval Thresholds": {
    columns: ["Rule", "Module", "Document", "Condition", "Threshold", "Approver role", "Blocking", "Status"],
    rows: [
      { Rule: "APR-SALES-DISC-10", Module: "Sales", Document: "Quotation", Condition: "Discount above threshold", Threshold: "10%", "Approver role": "Sales Director", Blocking: "Yes", Status: "Active" },
      { Rule: "APR-PO-50000", Module: "Procurement", Document: "Purchase Order", Condition: "Amount above threshold", Threshold: "QAR 50,000", "Approver role": "Finance Manager", Blocking: "Yes", Status: "Active" },
      { Rule: "APR-STK-VAR", Module: "Inventory", Document: "Cycle Count", Condition: "Variance above threshold", Threshold: "QAR 2,500", "Approver role": "Warehouse Manager", Blocking: "Yes", Status: "Active" }
    ]
  },
  "admin.Currencies": {
    columns: ["Currency", "Code", "Rate to QAR", "Rounding", "Last updated", "Status"],
    rows: [
      { Currency: "Qatari Riyal", Code: "QAR", "Rate to QAR": "1.0000", Rounding: "0.01", "Last updated": "20 Jun 2026", Status: "Active" },
      { Currency: "US Dollar", Code: "USD", "Rate to QAR": "3.6500", Rounding: "0.01", "Last updated": "20 Jun 2026", Status: "Active" },
      { Currency: "Euro", Code: "EUR", "Rate to QAR": "3.9200", Rounding: "0.01", "Last updated": "20 Jun 2026", Status: "Active" }
    ]
  },
  "admin.Payment Terms": {
    columns: ["Payment Term", "Code", "Days", "Applies to", "Cash discount", "Status"],
    rows: [
      { "Payment Term": "Immediate", Code: "PT-IMM", Days: "0", "Applies to": "Customers and suppliers", "Cash discount": "No", Status: "Active" },
      { "Payment Term": "30 days", Code: "PT-030", Days: "30", "Applies to": "Customers and suppliers", "Cash discount": "No", Status: "Active" },
      { "Payment Term": "40% advance, 60% on delivery", Code: "PT-ADV-4060", Days: "Milestone", "Applies to": "Suppliers", "Cash discount": "No", Status: "Active" }
    ]
  },
  "admin.Workflow Statuses": {
    columns: ["Workflow", "Status", "Next status", "Final", "Blocking validation", "Status tone"],
    rows: [
      { Workflow: "Sales quotation", Status: "Draft", "Next status": "Submitted", Final: "No", "Blocking validation": "Customer and amount required", "Status tone": "neutral" },
      { Workflow: "Sales quotation", Status: "Pending approval", "Next status": "Approved / Rejected", Final: "No", "Blocking validation": "Approver required", "Status tone": "warning" },
      { Workflow: "Purchase order", Status: "Approved", "Next status": "Goods Receipt", Final: "No", "Blocking validation": "Supplier and lines required", "Status tone": "success" }
    ]
  }
};

export function generateDocumentNumber(prefix: string) {
  const cleanPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "-") || "DOC";
  const year = new Date().getFullYear();
  const key = `medtech-demo:sequence:${cleanPrefix}:${year}`;
  if (typeof window === "undefined") return `${cleanPrefix}-${year}-0001`;
  const next = Number(localStorage.getItem(key) || "1");
  localStorage.setItem(key, String(next + 1));
  return `${cleanPrefix}-${year}-${String(next).padStart(4, "0")}`;
}

export function titleCaseNormalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

export function validateRequiredFields(record: Record<string, unknown>, requiredFields: string[]) {
  return requiredFields.filter(field => String(record[field] ?? "").trim() === "");
}

export function validatePercentageTotal(record: Record<string, unknown>, fields: string[], expectedTotal = 100) {
  const total = fields.reduce((sum, field) => sum + (Number(String(record[field] ?? "0").replace(/[^0-9.-]/g, "")) || 0), 0);
  return { valid: Math.abs(total - expectedTotal) < 0.001, total, expectedTotal };
}

export function calculateAgeInDays(date: string | Date) {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.floor((Date.now() - parsed.getTime()) / 86_400_000);
}

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export function statusTone(status: string): StatusTone {
  const value = status.toLowerCase();
  if (["draft", "neutral", "not required", "none", "inactive", "available"].some(token => value.includes(token))) return "neutral";
  if (["active", "approved", "completed", "paid", "posted", "ready", "released", "won", "on track"].some(token => value.includes(token))) return "success";
  if (["pending", "submitted", "review", "partial", "watch", "low", "due"].some(token => value.includes(token))) return "warning";
  if (["rejected", "cancelled", "overdue", "expired", "blocked", "critical", "risk", "hold"].some(token => value.includes(token))) return "danger";
  return "info";
}

export function createLocalRelationshipLookup<T extends Record<string, string>>(rows: T[]) {
  return {
    by: (field: keyof T, value: string) => rows.find(row => row[field]?.toLowerCase() === value.toLowerCase()),
    byAny: (fields: Array<keyof T>, value: string) => rows.find(row => fields.some(field => row[field]?.toLowerCase() === value.toLowerCase())),
    options: (valueField: keyof T, labelFields: Array<keyof T>) => rows.map(row => ({
      value: row[valueField] || "",
      label: labelFields.map(field => row[field]).filter(Boolean).join(" - ")
    }))
  };
}
