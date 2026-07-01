import { describe, expect, it } from "vitest";
import { financeReportRows, financeWorkflowError, runFinanceAction, validateJournal, writeFinanceJournalDraft } from "@/lib/finance-workflow";
import { readDemoRecordsSnapshot } from "@/lib/demo-store";

describe("local finance simulation", () => {
  it("creates local invoice drafts, matches payments, and drafts journals", () => {
    const salesOrder = { __id: "so-1", Order: "SO-2026-00999", Customer: "Sidra Medicine", Total: "QAR 18,000", Products: "AMC consumables" };

    expect(runFinanceAction("generate-customer-invoice", [salesOrder], "Finance Test")).toMatchObject({ targetTab: "Customer Invoices" });
    expect(readDemoRecordsSnapshot("finance:Customer Invoices", [])[0]).toMatchObject({ Customer: "Sidra Medicine", Total: "QAR 18000", Status: "Draft" });
    expect(readDemoRecordsSnapshot("finance:Journals", [])[0]).toMatchObject({ "Source Record": expect.stringContaining("INV-DRAFT"), Validation: "Balanced", Status: "Draft" });

    const payment = { __id: "pay-1", "Payment No": "REC-1", Type: "Customer payment", Party: "Sidra Medicine", Amount: "QAR 18,000" };
    expect(runFinanceAction("match-payment", [payment], "Finance Test")).toMatchObject({ sourceUpdates: [{ "Matched To": expect.stringContaining("INV-DRAFT") }] });

    const journal = writeFinanceJournalDraft({ sourceModule: "Payroll", sourceRecord: "PAY-1", amount: "QAR 10,000", debit: "Salary expense", credit: "Payroll payable" });
    expect(readDemoRecordsSnapshot("finance:Journals", [])[0]["Journal No"]).toBe(journal["Journal No"]);
    expect(financeReportRows().map(row => row.Report)).toEqual(expect.arrayContaining(["Balance Sheet", "P&L", "Aged Receivables", "Aged Payables"]));
  });

  it("validates double-entry journals and blocks approved locked-period posting", () => {
    expect(validateJournal({ "Debit Lines": "1200 Accounts Receivable=QAR 100", "Credit Lines": "4000 Sales Revenue=QAR 90", "Total Debit": "QAR 100", "Total Credit": "QAR 90" })).toBe("Journal is not balanced.");
    expect(financeWorkflowError("Journals", "approve", { "Debit Lines": "1200 Accounts Receivable=QAR 100", "Credit Lines": "4000 Sales Revenue=QAR 100", "Total Debit": "QAR 100", "Total Credit": "QAR 100", Date: "2026-05-15", Period: "May 2026", Status: "Draft" })).toContain("May 2026 is locked");
  });
});
