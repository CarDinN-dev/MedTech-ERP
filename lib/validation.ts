import { z } from "zod";

export const uuid = z.string().uuid();
export const money = z.number().finite().nonnegative().multipleOf(0.01);
export const documentStatus = z.enum(["draft","pending","approved","rejected","active","inactive","cancelled","completed","archived"]);
export const statusValues = ["Draft", "Submitted", "Pending approval", "Approved", "Rejected", "Active", "Inactive", "Invited", "Suspended", "In progress", "Completed", "Cancelled", "Archived", "Locked", "Open", "Closed", "Ready", "Exception", "Matched", "Not required"] as const;
export const roleValues = ["Super Admin", "Management", "Finance Manager", "HR Manager", "HR Officer", "Payroll Manager", "Department Manager", "Employee", "Sales Manager", "Sales Executive", "Shipping Team", "Warehouse Team", "Procurement Team", "Service Engineer", "Project Manager", "Read-only Auditor"] as const;
export const departmentValues = ["Sales", "Procurement", "Inventory", "Quality", "Finance", "Service", "Projects", "HR", "Human Resources", "Payroll", "Documents", "Reports", "Admin", "Management", "IT"] as const;
export const businessUnitValues = ["Diagnostics", "Critical Care", "Imaging", "Surgical", "Pharma", "Service", "Projects", "Corporate"] as const;
export const currencyValues = ["QAR", "USD", "EUR", "GBP"] as const;
export const paymentTermValues = ["Immediate", "Cash", "Advance", "30 days", "45 days", "60 days", "90 days", "40% advance, 60% on delivery"] as const;
export const workflowStageValues = ["Claim", "Qualify", "Solution", "Discount Approval if needed", "Won/Lost", "Sales Order", "Master Contract", "Minimum Stock Setup", "Tender Intake", "Tender Creation", "Award/Loss", "Batch Compliance", "Placeholder Project", "Department Sub-Quotations"] as const;
export const approvalDecisionValues = ["Approved", "Rejected", "Pending", "Pending approval", "Not required", "Approval required"] as const;
export const email = z.string().trim().email();
export const phone = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/);
export const isoDate = z.string().date();
export const percentage = z.number().finite().min(0).max(100);
export const currencyAmount = z.number().finite().nonnegative();
export const documentNumber = z.string().trim().regex(/^[A-Z]{2,8}-[A-Z0-9-]{3,40}$/i);
export const skuCode = z.string().trim().regex(/^[A-Z0-9][A-Z0-9._-]{1,39}$/i);
export const employeeCode = z.string().trim().regex(/^[A-Z]{2,5}-?\d{3,8}$/i);
export const partyCode = z.string().trim().regex(/^[A-Z]{2,8}-?\d{2,8}$/i);

export const quotationSchema = z.object({
  customer_id: uuid, opportunity_id: uuid.nullish(), quotation_date: z.string().date(), valid_until: z.string().date().nullish(),
  currency: z.string().length(3).default("QAR"), terms: z.string().max(10000).nullish(), notes: z.string().max(5000).nullish(),
  items: z.array(z.object({ product_id: uuid.nullish(), description: z.string().min(2).max(1000), quantity: z.number().positive(), unit_price: money, discount_percent: z.number().min(0).max(100).default(0), tax_percent: z.number().min(0).max(100).default(0) })).min(1)
});
export const employeeImportSchema = z.object({
  employee_number: z.string().min(2), full_name: z.string().min(2), work_email: z.string().email().optional().or(z.literal("")),
  department: z.string().min(2), designation: z.string().min(2), join_date: z.string().date(), employment_type: z.string().default("full_time")
});
export const productImportSchema = z.object({
  sku: z.string().min(2), name: z.string().min(2), category: z.string().min(2), unit_of_measure: z.string().default("unit"),
  purchase_price: money.default(0), sale_price: money.default(0), minimum_stock: z.number().nonnegative().default(0)
});

export const employeeOnboardingSchema = z.object({
  "Full Name": z.string().trim().optional(),
  Employee: z.string().trim().optional(),
  "Email Address": z.string().trim().email("Enter a valid work email").optional().or(z.literal("")),
  Email: z.string().trim().email("Enter a valid work email").optional().or(z.literal("")),
  "Account email": z.string().trim().email("Enter a valid account email").optional().or(z.literal(""))
}).refine(value => (value["Full Name"] || value.Employee || "").length >= 2, {
  message: "Full name must contain at least 2 characters",
  path: ["Full Name"]
}).refine(value => Boolean(value["Email Address"] || value.Email || value["Account email"]), {
  message: "Work email is required",
  path: ["Email Address"]
});

export const userAccessSchema = z.object({
  User: z.string().trim().min(2),
  Email: z.string().trim().email(),
  Role: z.string().trim().min(2),
  Department: z.string().trim().min(2),
  Password: z.string().min(8).optional().or(z.literal("")),
  Status: z.enum(["Active", "Invited", "Suspended"])
});

const assignedStatus = z.enum(["Assigned", "Not Assigned"]);
const yesNo = z.enum(["Yes", "No"]);

export const accessProvisioningSchema = z.object({
  "Company ID": z.string().trim().max(80).optional(),
  "Email Required": yesNo,
  "Company Car": assignedStatus,
  Accommodation: assignedStatus,
  Desk: assignedStatus,
  Stationery: assignedStatus,
  Email: assignedStatus,
  "Business Card": assignedStatus,
  "Laptop Required": yesNo,
  "Laptop or PC": z.enum(["Laptop", "PC", "Not Required"]),
  "Mobile Required": yesNo
});

export type AccessProvisioningInput = z.infer<typeof accessProvisioningSchema>;

export function plainText(value: unknown, max = 5000) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/<[^>]*>/g, "").trim().slice(0, max);
}

export function escapeSpreadsheetFormula(value: unknown) {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : value;
}

export function safeFileName(value: string, fallback = "medtech-export") {
  const name = plainText(value, 120).replace(/\.[a-z0-9]{1,8}$/i, "").replace(/[^a-z0-9._-]+/gi, "-").replace(/(^[.-]+|[.-]+$)/g, "");
  return name || fallback;
}

export function validateDateRange(start: string, end: string) {
  if (!start || !end) return true;
  const from = new Date(start);
  const to = new Date(end);
  return !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to;
}

export function validateCostCenterPercentages(values: number[]) {
  return Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) < 0.01;
}

export function validateStructuredRecord(values: Record<string, string>, selectOptions: Record<string, string[]> = {}, fieldTypes: Record<string, string> = {}, strictDefaultAllowlists = true) {
  for (const [column, raw] of Object.entries(values)) {
    const value = String(raw ?? "").trim();
    const key = column.toLowerCase();
    if (!value || value === "Auto generated") continue;
    const allowed = selectOptions[column] ?? (strictDefaultAllowlists ? allowlistFor(key) : null);
    if (allowed?.length && !allowed.includes(value)) return `${column} must be one of: ${allowed.join(", ")}`;
    if (selectOptions[column]?.length) continue;
    if (isEmailField(column, fieldTypes) && !email.safeParse(value).success) return `${column} must be a valid email`;
    if (key.includes("phone") && !phone.safeParse(value).success) return `${column} must be a valid phone number`;
    if ((fieldTypes[column] === "date" || /\bdate\b/.test(key)) && Number.isNaN(new Date(value).getTime())) return `${column} must be a valid date`;
    if (fieldTypes[column] === "number" && !Number.isFinite(Number(value))) return `${column} must be a valid number`;
    if ((key.includes("%") || key.includes("percent")) && !percentage.safeParse(Number(value.replace(/%/g, ""))).success) return `${column} must be between 0 and 100`;
    if ((key.includes("amount") || key.includes("total") || key.includes("cost") || key.includes("price")) && Number(value.replace(/[^0-9.-]/g, "")) < 0) return `${column} cannot be negative`;
    if ((key.includes("quantity") || key === "qty") && Number(value.replace(/[^0-9.-]/g, "")) <= 0) return `${column} must be greater than 0`;
    if ((key.includes("document no") || key.endsWith(" no")) && !documentNumber.safeParse(value).success) return `${column} has an invalid document number`;
    if (key.includes("sku") && !skuCode.safeParse(value).success) return `${column} has an invalid SKU code`;
    if (key.includes("employee code") && !employeeCode.safeParse(value).success) return `${column} has an invalid employee code`;
    if ((key.includes("customer code") || key.includes("supplier code")) && !partyCode.safeParse(value).success) return `${column} has an invalid code`;
  }
  return "";
}

function isEmailField(column: string, fieldTypes: Record<string, string>) {
  const key = column.toLowerCase();
  return fieldTypes[column] === "email" || key === "email" || key.endsWith(" email") || key.endsWith(" e-mail") || key.endsWith("email address");
}

function allowlistFor(key: string) {
  if (key === "status" || key.endsWith(" status")) return [...statusValues];
  if (key === "role" || key.endsWith(" role")) return [...roleValues];
  if (key === "department") return [...departmentValues];
  if (key === "business unit" || key === "bu") return [...businessUnitValues];
  if (key === "currency") return [...currencyValues];
  if (key === "payment terms") return [...paymentTermValues];
  if (key === "stage" || key.includes("workflow stage")) return [...workflowStageValues];
  if (key.includes("approval decision") || key === "decision") return [...approvalDecisionValues];
  return null;
}
