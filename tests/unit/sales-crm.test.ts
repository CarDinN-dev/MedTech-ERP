import { describe, expect, it } from "vitest";
import { applyLeadAction, canConvertLead, enrichSalesLead, getSalesCrmConfig } from "@/lib/sales-crm";
import type { DemoRecord } from "@/lib/demo-store";

const base = {
  __id: "lead-1",
  "Enquiry No": "ENQ-2026-0999",
  Source: "Website",
  "Received Date": "2026-06-10",
  "Contact Name": "Test Contact",
  Organization: "Test Hospital",
  Email: "test@example.com",
  Phone: "+974 4000 0000",
  "Product Interest": "Patient Monitor",
  "Suggested BU": "Medical Equipment",
  "Product Category": "Equipment",
  "Assigned Salesperson": "Unassigned",
  "Claim Status": "Unclaimed",
  "Pool Age": "",
  "BANT Budget Score": "2",
  "BANT Authority Score": "2",
  "BANT Need Score": "2",
  "BANT Timeline Score": "2",
  "BANT Total": "",
  "Qualification Result": "",
  "Disqualification Reason": "",
  "Nurture Reminder Date": "",
  "Current Status": "New in Pool",
  Notes: ""
} satisfies DemoRecord;

describe("sales CRM lead rules", () => {
  it("calculates BANT totals and thresholds", () => {
    const config = getSalesCrmConfig("sales", "Universal Enquiry Pool")!;
    const qualified = config.prepareSave(base, []);
    const nurture = config.prepareSave({ ...base, "Enquiry No": "ENQ-2026-1000", "BANT Timeline Score": "0" }, []);
    const disqualified = config.prepareSave({ ...base, "Enquiry No": "ENQ-2026-1001", "BANT Budget Score": "1", "BANT Authority Score": "0", "BANT Need Score": "1", "BANT Timeline Score": "1" }, []);

    expect(qualified).toMatchObject({ "BANT Total": "8", "Qualification Result": "Qualified" });
    expect(nurture).toMatchObject({ "BANT Total": "6", "Qualification Result": "Nurture" });
    expect(disqualified).toMatchObject({ "BANT Total": "3", "Qualification Result": "Disqualified" });
  });

  it("marks old unclaimed and expired claimed leads", () => {
    const today = new Date("2026-06-30T00:00:00");

    expect(enrichSalesLead(base, today)["Current Status"]).toBe("COO Review Required");
    expect(enrichSalesLead({ ...base, "Claim Status": "Claimed", "Assigned Salesperson": "F. Al-Kuwari", "Current Status": "Qualification Pending", "Claimed Date": "2026-06-18" }, today)["Current Status"]).toBe("Claim Expired");
  });

  it("flags duplicate claim attempts and blocks unqualified conversion", () => {
    const claimed = { ...base, "Claim Status": "Claimed", "Assigned Salesperson": "F. Al-Kuwari", "Current Status": "Qualification Pending" };
    const conflict = applyLeadAction("claim", claimed, "Kashif");

    expect(conflict).toMatchObject({ "Claim Status": "Conflict Flag", "Current Status": "Conflict review" });
    expect(canConvertLead({ ...base, "BANT Budget Score": "1", "BANT Authority Score": "1", "BANT Need Score": "1", "BANT Timeline Score": "0" })).toBe(false);
    expect(canConvertLead(base)).toBe(true);
  });
});
