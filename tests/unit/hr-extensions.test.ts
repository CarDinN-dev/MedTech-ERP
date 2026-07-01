import { describe, expect, it } from "vitest";
import { finalSettlementPayable } from "@/lib/hr-extensions";

describe("HR scope extensions", () => {
  it("calculates EOS final payable locally", () => {
    expect(finalSettlementPayable({
      "Working Days Salary": "QAR 11,900",
      "Leave Balance Encashment": "QAR 1,850",
      Gratuity: "QAR 6,225",
      "Loan Balance Deduction": "QAR 14,000",
      "Other Deductions": "QAR 350"
    })).toBe(5625);
  });
});
