import { describe, expect, it } from "vitest";
import { approvalRequired, decideApprovalRequest, hasApprovedApproval, submitApprovalRequest } from "@/lib/approval-matrix";
import { calculateCommissionRun, commissionRate } from "@/lib/commission-engine";

describe("approval matrix engine", () => {
  it("requires approval for sales discounts and blocks requester self-approval", () => {
    const source = { sourceModule: "Sales", sourceRecord: "SFS-TEST", requestType: "Quotation discount", requestedBy: "F. Al-Kuwari", discountPercent: 18, amount: 100000 };

    expect(approvalRequired(source).required).toBe(true);
    const submitted = submitApprovalRequest(source).request!;
    expect(decideApprovalRequest(submitted["Approval Request No"], "Approved", "F. Al-Kuwari", "self").error).toContain("Requester");
    expect(decideApprovalRequest(submitted["Approval Request No"], "Approved", "Kashif", "ok").request?.Status).toBe("Approved");
    expect(hasApprovedApproval("Sales", "SFS-TEST", "Quotation discount")).toBe(true);
  });
});

describe("commission engine", () => {
  it("applies category override and split percent", () => {
    const [line] = calculateCommissionRun([{ "Commission Run No": "COM-1", Period: "June 2026", Salesperson: "A", "Business Unit": "Projects", "Deal / Invoice": "INV-1", "Product Category": "Reagents", "Gross Amount": "QAR 100,000", Margin: "QAR 20,000", "Split %": "50", Notes: "" }]);

    expect(commissionRate("Projects", "Reagents")).toBe(3.5);
    expect(line["Commission Amount"]).toBe("QAR 350");
  });
});
