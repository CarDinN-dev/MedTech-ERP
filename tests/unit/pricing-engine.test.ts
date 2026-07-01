import { describe, expect, it } from "vitest";
import { approvalRequired } from "@/lib/approval-matrix";
import { pricingWarningsForLine, resolvePricing, seedPricingState, validateQuotationPricing } from "@/lib/pricing-engine";

describe("pricing engine", () => {
  it("resolves approved customer contract pricing before pricelist defaults", () => {
    const result = resolvePricing({ sku: "DX-TRP-100", customer: "Hamad General Hospital - Laboratory", businessUnit: "Diagnostics", category: "Reagents" }, seedPricingState());

    expect(result.source).toBe("Customer contract pricing");
    expect(result.listPrice).toBe(1725);
    expect(result.maxDiscountPercent).toBe(10);
  });

  it("flags discount, margin floor and minimum selling price exceptions", () => {
    const warnings = pricingWarningsForLine({ sku: "DX-TRP-100", customer: "Hamad General Hospital - Laboratory", businessUnit: "Diagnostics", category: "Reagents", discountPercent: 18, sellingPrice: 1400, marginPercent: 12 }, seedPricingState());

    expect(warnings.join(" ")).toContain("above allowed");
    expect(warnings.join(" ")).toContain("below minimum");
    expect(warnings.join(" ")).toContain("Margin below floor");
  });

  it("allows final quotation when active pricing exists and routes price exceptions", () => {
    expect(validateQuotationPricing({ Quotation: "QTN-TEST", Customer: "Hamad General Hospital - Laboratory", Date: "2026-06-20" }, seedPricingState())).toBe("");
    expect(approvalRequired({ sourceModule: "Sales", sourceRecord: "QTN-TEST", requestType: "Price approval exception", requestedBy: "Sales" }).required).toBe(true);
  });
});
