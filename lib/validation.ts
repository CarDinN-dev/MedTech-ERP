import { z } from "zod";

export const uuid = z.string().uuid();
export const money = z.number().finite().nonnegative().multipleOf(0.01);
export const documentStatus = z.enum(["draft","pending","approved","rejected","active","inactive","cancelled","completed","archived"]);

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
