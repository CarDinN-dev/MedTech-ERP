import { describe, expect, it } from "vitest";
import { documentTypeFor, finalDocumentError, issueDocumentNumber, templateForDocumentType, validateAmountCurrency, validateDateOrder, validateEmail, validatePhone } from "@/lib/document-control";

describe("document control", () => {
  it("issues local sequence numbers by document type", () => {
    localStorage.clear();
    expect(issueDocumentNumber("Quotation")).toBe("QTN-2026-0001");
    expect(issueDocumentNumber("Quotation")).toBe("QTN-2026-0002");
  });

  it("recovers safely from tampered document sequence storage", () => {
    localStorage.clear();
    localStorage.setItem("medtech-demo:doc-sequence:QTN:2026", "not-a-number");

    expect(issueDocumentNumber("Quotation")).toBe("QTN-2026-0001");
    expect(issueDocumentNumber("Quotation")).toBe("QTN-2026-0002");
  });

  it("maps source records to controlled document templates", () => {
    expect(documentTypeFor("procurement", "Purchase Orders", {})).toBe("Purchase Order");
    expect(templateForDocumentType("Purchase Order")).toBe("purchase_order");
    expect(templateForDocumentType("Business Trip")).toBe("report");
  });

  it("blocks final documents before approval", () => {
    expect(finalDocumentError({ "Approval Status": "Pending approval" })).toContain("Approval");
    expect(finalDocumentError({ "Approval Status": "Approved" })).toBe("");
  });

  it("validates common document fields", () => {
    expect(validateEmail("demo@example.com")).toBe(true);
    expect(validateEmail("bad")).toBe(false);
    expect(validatePhone("+974 4412 8800")).toBe(true);
    expect(validateDateOrder("2026-06-01", "2026-06-30")).toBe(true);
    expect(validateDateOrder("2026-06-30", "2026-06-01")).toBe(false);
    expect(validateAmountCurrency("QAR 1,200.50")).toBe(true);
  });
});
