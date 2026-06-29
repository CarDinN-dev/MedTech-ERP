import { describe, expect, it } from "vitest";
import { attendanceRowsFromGrid } from "@/lib/attendance-import";

describe("attendance log import", () => {
  it("turns month-grid punches into present rows and blank days into payroll absences", () => {
    const result = attendanceRowsFromGrid([
      ["List of Logs"],
      ["Duration:", "", "01/01/2026 ~ 31/01/2026"],
      ["No.", "Name", "1", "2"],
      ["", "", "Th", "Fr"],
      ["13", "luisina", "07:16\n16:21\n", ""]
    ], new Map([["luisina", 3100]]));

    expect(result).toMatchObject({ period: "January 2026", dayCount: 31, employeeCount: 1 });
    expect(result.dailyRows).toHaveLength(2);
    expect(result.dailyRows[0]).toMatchObject({ Employee: "luisina", Date: "01 Jan 2026", "Check in": "07:16", "Check out": "16:21", Status: "Present" });
    expect(result.dailyRows[1]).toMatchObject({ Employee: "luisina", Date: "02 Jan 2026", Status: "Absent" });
    expect(result.absenceRows[0]).toMatchObject({ Employee: "luisina", Date: "02 Jan 2026", "Payroll impact": "QAR 100.00", Status: "Deducted" });
  });
});
