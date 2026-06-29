import { beforeEach, describe, expect, it } from "vitest";
import { clearDemoSession, DEFAULT_DEMO_EMAIL, DEFAULT_DEMO_PASSWORD, DEMO_SESSION_KEY, DEMO_USERS_KEY, getDemoSession, signInDemo } from "@/lib/demo-auth";
import testUsers from "@/tests/fixtures/test-users.json";

describe("demo authentication", () => {
  beforeEach(() => localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(testUsers.map(user => ({ User: user.user, Email: user.email, Password: user.password, Role: user.role, Department: user.department, Status: "Active" })))));

  it("signs in the presentation administrator", () => {
    const session = signInDemo(DEFAULT_DEMO_EMAIL, DEFAULT_DEMO_PASSWORD);
    expect(session).toMatchObject({ name: "Kashif", role: "Super Admin" });
    expect(getDemoSession()).toEqual(session);
  });

  it.each(testUsers)("signs in $role test identity", user => {
    const session = signInDemo(user.email, user.password);
    expect(session.role).toBe(user.role);
    expect(session.department).toBe(user.department);
  });

  it("rejects wrong passwords and suspended accounts", () => {
    expect(() => signInDemo(testUsers[1].email, "wrong-password")).toThrow("Incorrect email or password");
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify([{ User: "Blocked", Email: "blocked@medtech.qa", Password: "StrongPass1!", Role: "Viewer", Department: "Audit", Status: "Suspended" }]));
    expect(() => signInDemo("blocked@medtech.qa", "StrongPass1!")).toThrow("not active");
  });

  it("clears local and cookie session state", () => {
    signInDemo(DEFAULT_DEMO_EMAIL, DEFAULT_DEMO_PASSWORD);
    clearDemoSession();
    expect(localStorage.getItem(DEMO_SESSION_KEY)).toBeNull();
    expect(getDemoSession()).toBeNull();
  });
});
