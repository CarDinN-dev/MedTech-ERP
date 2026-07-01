import { describe, expect, it } from "vitest";
import { buildInvoiceXmlPreview, parseDelimitedRows, validateSimulatorRows } from "@/lib/local-integration-simulators";

describe("local integration simulators", () => {
  it("parses and validates local bank statement rows", () => {
    const rows = parseDelimitedRows("Date,Reference,Description,Amount\n2026-06-20,INV-1,Receipt,1200\n2026-06-20,,Missing ref,50");
    const result = validateSimulatorRows("bank-statement", rows);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].Status).toBe("Matched");
    expect(result.errors[0].message).toContain("Reference");
  });

  it("builds XML preview without enabling external submission", () => {
    const xml = buildInvoiceXmlPreview({ "Invoice No": "INV<1>", Customer: "A&B Medical", Amount: "42" });
    expect(xml).toContain("localDemoOnly=\"true\"");
    expect(xml).toContain("<ExternalSubmission>false</ExternalSubmission>");
    expect(xml).toContain("INV&lt;1&gt;");
  });
});
