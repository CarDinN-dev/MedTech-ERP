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

export const leaveApplicationStatusSchema = z.enum(["draft", "submitted", "pending_approval", "approved", "rejected", "cancelled"]);
export const leaveApprovalDecisionSchema = z.enum(["pending", "approved", "rejected"]);
export const leaveHandoverStatusSchema = z.enum(["pending", "accepted", "cancelled"]);
export const leaveClearanceStatusSchema = z.enum(["not_required", "pending", "in_progress", "cleared", "blocked"]);
export const leaveRejoinStatusSchema = z.enum(["pending_rejoin", "rejoined_on_time", "delayed_rejoin", "no_show", "verified"]);

export const leaveApplicationSchema = z.object({
  employee_id: uuid,
  employee_code: z.string().min(1).max(50),
  employee_name: z.string().min(2).max(200),
  department: z.string().max(160).nullish(),
  designation: z.string().max(160).nullish(),
  leave_type: z.string().min(2).max(80),
  start_date: z.string().date(),
  end_date: z.string().date(),
  calendar_days: z.number().positive(),
  working_days: z.number().positive(),
  balance_before: z.number().nonnegative(),
  balance_after: z.number().nonnegative(),
  purpose: z.string().max(2000).nullish(),
  destination: z.string().max(160).nullish(),
  travel_from: z.string().date().nullish().or(z.literal("")),
  travel_to: z.string().date().nullish().or(z.literal("")),
  emergency_contact_name: z.string().max(160).nullish(),
  emergency_contact_phone: z.string().max(60).nullish(),
  emergency_contact_email: z.string().email().nullish().or(z.literal("")),
  handover_to_employee_id: uuid.nullish(),
  handover_to_employee_code: z.string().max(50).nullish(),
  handover_to_name: z.string().max(200).nullish(),
  status: leaveApplicationStatusSchema
}).refine(value => value.end_date >= value.start_date, { message: "End date must be on or after start date", path: ["end_date"] });

export const leaveApprovalDecisionUpdateSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  approval_notes: z.string().max(2000).optional()
});

export const leaveHandoverUpdateSchema = z.object({
  tasks_notes: z.string().max(4000).nullish(),
  attachment_url: z.string().max(1000).nullish(),
  status: leaveHandoverStatusSchema.optional(),
  accepted_at: z.string().datetime().nullish()
});

export const leaveClearanceUpdateSchema = z.object({
  clearance_items: z.array(z.string().trim().min(1).max(240)).max(40),
  responsible_person: z.string().max(200).nullish(),
  status: leaveClearanceStatusSchema,
  comments: z.string().max(4000).nullish(),
  completed_at: z.string().datetime().nullish()
});

export const leaveRejoinUpdateSchema = z.object({
  actual_rejoin_date: z.string().date().nullish().or(z.literal("")),
  reason_for_delay: z.string().max(4000).nullish(),
  medical_or_supporting_attachment: z.string().max(1000).nullish(),
  status: leaveRejoinStatusSchema,
  hr_verified_by: z.string().max(200).nullish(),
  verified_at: z.string().datetime().nullish()
});
