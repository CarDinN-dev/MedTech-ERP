import { describe, expect, it } from "vitest";
import testUsers from "@/tests/fixtures/test-users.json";

describe("test identity fixture", () => {
  it("defines exactly the six required isolated roles", () => {
    expect(testUsers.map(user => user.roleCode)).toEqual(["super_admin", "hr_manager", "finance_manager", "sales_manager", "shipping_team", "auditor"]);
    expect(new Set(testUsers.map(user => user.email)).size).toBe(6);
    expect(testUsers.every(user => user.email.endsWith("@medtech.qa") && user.password.length >= 12)).toBe(true);
  });
});
