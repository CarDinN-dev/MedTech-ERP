import { expect, test, type Page } from "@playwright/test";
import testUsers from "../fixtures/test-users.json";

const usersKey = "medtech-demo:admin:Users:records:v2";
const storedUsers = testUsers.map(user => ({ User: user.user, Email: user.email, Password: user.password, Role: user.role, Department: user.department, Status: "Active" }));

async function seedUsers(page: Page) {
  await page.addInitScript(({ key, users }) => localStorage.setItem(key, JSON.stringify(users)), { key: usersKey, users: storedUsers });
}

async function login(page: Page, user = testUsers[0]) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(user.email);
  await page.getByPlaceholder("Enter your password").fill(user.password);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Open user menu" })).toBeVisible();
}

test.beforeEach(async ({ page }) => seedUsers(page));

test.describe("role identities", () => {
  for (const user of testUsers) {
    test(`${user.role} can authenticate with its isolated test account`, async ({ page }) => {
      await login(page, user);
      await page.getByRole("button", { name: "Open user menu" }).click();
      const header = page.getByRole("banner");
      await expect(header.getByText(user.user, { exact: true })).toBeVisible();
      const session = await page.evaluate(() => JSON.parse(localStorage.getItem("medtech-demo:session") || "{}"));
      expect(session).toMatchObject({ name: user.user, role: user.role, department: user.department });
    });
  }
});

test("HR employee list sorts and downloads a detailed selected PDF", async ({ page }) => {
  await login(page);
  await page.goto("/hr");
  await page.getByTestId("hr-tab-employees").click();
  await page.getByRole("button", { name: "Sort by Full Name" }).click();
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(6);
  await expect(rows.nth(0)).toContainText("Aisha Rahman");
  await page.getByRole("checkbox", { name: "Select MT-0018" }).check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF (1)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("MT-0018-employees.pdf");
});

test("employee onboarding shows controlled validation feedback", async ({ page }) => {
  await login(page, testUsers[1]);
  await page.goto("/hr");
  await page.getByTestId("hr-tab-employees").click();
  await page.getByRole("button", { name: "Add employee" }).click();
  for (let step = 0; step < 8; step++) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await expect(page.getByText("Full name must contain at least 2 characters", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Employee onboarding" })).toBeVisible();
});

test("administration audit trail records HR approvals", async ({ page }) => {
  await login(page);
  await page.goto("/hr");
  await page.getByTestId("hr-tab-approvals").click();
  await page.getByRole("checkbox", { name: "Select HR-APR-0188" }).check();
  await page.getByRole("button", { name: "Approve selected" }).click();
  await page.goto("/admin");
  await page.getByRole("button", { name: "Audit log" }).click();
  await expect(page.getByRole("row", { name: /Human Resources 1 requests Selected HR requests approved/ })).toBeVisible();
});

test("recruitment pipeline creates and tracks a candidate", async ({ page }) => {
  await login(page, testUsers[1]);
  await page.goto("/hr");
  await page.getByTestId("hr-tab-recruitment").click();
  await page.getByTestId("recruitment-subtab-candidates").click();
  await page.getByRole("button", { name: "Add candidate" }).click();
  const candidateDialog = page.getByRole("dialog", { name: "Add candidate" });
  await candidateDialog.getByLabel("Candidate", { exact: true }).fill("QA Recruitment Candidate");
  await candidateDialog.getByLabel("Applied role", { exact: true }).fill("Biomedical Engineer");
  await candidateDialog.getByLabel("Email", { exact: true }).fill("candidate.qa@example.com");
  await candidateDialog.getByLabel("Status", { exact: true }).selectOption("Screening");
  await candidateDialog.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("cell", { name: "QA Recruitment Candidate", exact: true })).toBeVisible();
});

test("recruitment manpower selection downloads the approval-to-hire PDF", async ({ page }) => {
  await login(page, testUsers[1]);
  await page.goto("/hr");
  await page.getByTestId("hr-tab-recruitment").click();
  await page.getByRole("checkbox", { name: "Select MPP-2026-018" }).check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF (1)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("MPP-2026-018-manpower-planning.pdf");
});

test("pay process calculates salary inputs and saves the result", async ({ page }) => {
  await login(page, testUsers[1]);
  await page.goto("/hr");
  await page.getByTestId("hr-tab-payroll").click();
  await expect(page.getByRole("cell", { name: "Salary Advance", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Employee Loan", exact: true })).toBeVisible();
  await page.getByLabel("Manual earnings").fill("1800");
  await page.getByLabel("Manual deductions").fill("1200");
  await page.getByLabel("Manual absence days").fill("0.5");
  await page.getByRole("button", { name: "Save pay process" }).click();
  await expect(page.getByRole("status")).toContainText("Pay process saved");
  await expect(page.getByRole("cell", { name: "QAR 12,358.33", exact: true })).toBeVisible();
});

test("attendance absence workflow records payroll-impacting absence", async ({ page }) => {
  await login(page, testUsers[1]);
  await page.goto("/hr");
  await page.getByTestId("hr-tab-attendance").click();
  await page.getByTestId("attendance-subtab-absence-monitoring").click();
  await page.getByRole("button", { name: "Record absence" }).click();
  const absenceDialog = page.getByRole("dialog", { name: "Record absence" });
  await absenceDialog.getByLabel("Absence", { exact: true }).fill("ABS-QA-001");
  await absenceDialog.getByLabel("Employee", { exact: true }).fill("QA Employee");
  await absenceDialog.getByLabel("Date", { exact: true }).fill("21 Jun 2026");
  await absenceDialog.getByLabel("Status", { exact: true }).selectOption("Under review");
  await absenceDialog.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("cell", { name: "ABS-QA-001", exact: true })).toBeVisible();
});
