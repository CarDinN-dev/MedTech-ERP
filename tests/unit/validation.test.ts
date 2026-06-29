import { describe, expect, it } from "vitest";
import { employeeImportSchema, employeeOnboardingSchema, money, quotationSchema, userAccessSchema } from "@/lib/validation";

describe("ERP validation schemas", () => {
  it("accepts valid money and rejects negative or over-precision values", () => {
    expect(money.parse(1250.25)).toBe(1250.25);
    expect(money.safeParse(-1).success).toBe(false);
    expect(money.safeParse(10.001).success).toBe(false);
  });

  it("validates employee onboarding name and email", () => {
    expect(employeeOnboardingSchema.safeParse({ Employee: "Aisha Rahman", Email: "aisha@medtech.qa" }).success).toBe(true);
    expect(employeeOnboardingSchema.safeParse({ Employee: "A", Email: "bad" }).success).toBe(false);
    expect(employeeOnboardingSchema.safeParse({ Employee: "Aisha Rahman", Email: "", "Account email": "" }).success).toBe(false);
  });

  it("validates the documented employee import contract", () => {
    const valid = employeeImportSchema.parse({ employee_number: "MT-9001", full_name: "Test Employee", work_email: "employee@medtech.qa", department: "HR", designation: "Officer", join_date: "2026-06-20" });
    expect(valid.employment_type).toBe("full_time");
    expect(employeeImportSchema.safeParse({ ...valid, join_date: "20/06/2026" }).success).toBe(false);
  });

  it("requires valid user access fields and minimum temporary password length", () => {
    expect(userAccessSchema.safeParse({ User: "HR Test", Email: "hr.test@medtech.qa", Role: "HR Manager", Department: "HR", Password: "StrongPass1!", Status: "Active" }).success).toBe(true);
    expect(userAccessSchema.safeParse({ User: "H", Email: "invalid", Role: "", Department: "", Password: "123", Status: "Active" }).success).toBe(false);
  });

  it("rejects invalid quotation lines and discounts", () => {
    const base = { customer_id: "11111111-1111-4111-8111-111111111111", quotation_date: "2026-06-20", items: [{ description: "Patient monitor", quantity: 1, unit_price: 1000, discount_percent: 5, tax_percent: 0 }] };
    expect(quotationSchema.safeParse(base).success).toBe(true);
    expect(quotationSchema.safeParse({ ...base, items: [{ ...base.items[0], quantity: 0 }] }).success).toBe(false);
    expect(quotationSchema.safeParse({ ...base, items: [{ ...base.items[0], discount_percent: 101 }] }).success).toBe(false);
  });
});
