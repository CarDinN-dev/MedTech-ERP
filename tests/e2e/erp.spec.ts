import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import testUsers from "../fixtures/test-users.json";

const usersKey = "medtech-demo:admin:Users:records:v2";
const storedUsers = testUsers.map(user => ({ User: user.user, Email: user.email, Password: user.password, Role: user.role, Department: user.department, Status: "Active" }));
const hrWorkflowTabs = [
  "Dashboard", "Employees", "Departments", "Contracts", "Probation Reviews", "Access Provisioning", "Recruitment", "Attendance", "Attendance Exceptions", "Leave",
  "Business Trips", "Employee Expenses", "Payroll", "Loans & advances", "Performance/Appraisals", "eLearning", "EOS / Gratuity / Final Settlement",
  "Payroll Accounting Draft Journal", "Documents", "Approvals", "Reports", "Self service", "Settings", "Lifecycle Checklist", "HR Document Expiry",
  "Salary Revision Approval", "Training Matrix", "Competency Matrix", "Manpower Plan", "Loan Control Dashboard", "Payroll Variance Report",
  "Qatar Labour Compliance", "Exit Checklist"
];
const hrSubtabPrefixes = ["recruitment-subtab-", "attendance-subtab-", "leave-subtab-", "payroll-subtab-"];

function hrTabTestId(tab: string) {
  return `hr-tab-${tab.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`;
}

async function seedUsers(page: Page) {
  await page.addInitScript(({ key, users }) => localStorage.setItem(key, JSON.stringify(users)), { key: usersKey, users: storedUsers });
}

async function login(page: Page, user = testUsers[0]) {
  await page.goto("/login");
  await page.evaluate(({ key, users }) => localStorage.setItem(key, JSON.stringify(users)), { key: usersKey, users: storedUsers });
  await page.getByLabel("Work email").fill(user.email);
  await page.getByPlaceholder("Enter your password").fill(user.password);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Open user menu" })).toBeVisible();
}

test.beforeEach(async ({ page }) => seedUsers(page));

test("critical module smoke loads dashboard and main workspaces", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Sales pipeline", { exact: true })).toBeVisible();

  for (const target of [
    ["/sales", "Sales & CRM"],
    ["/hr", "People & HR"],
    ["/inventory", "Inventory & Warehouse"],
    ["/finance", "Finance"],
    ["/reports", "Reports & Analytics"]
  ] as const) {
    await page.goto(target[0]);
    await expect(page.getByRole("heading", { name: target[1] })).toBeVisible();
  }
});

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

test("HR access provisioning creates, edits, views and lists assignment fields", async ({ page }) => {
  await login(page, testUsers[1]);
  await page.goto("/hr");
  await page.getByTestId("hr-tab-access-provisioning").click();
  await expect(page.getByRole("button", { name: "Sort by Company ID" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sort by Email", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add access request" }).click();
  const createDialog = page.getByRole("dialog", { name: "Add access request" });
  await createDialog.getByLabel("Employee Code", { exact: true }).fill("MT-0053");
  await createDialog.getByLabel("Company ID", { exact: true }).fill("CID-QA-9001");
  await createDialog.getByLabel("Requested Access", { exact: true }).fill("Procurement portal and reporting");
  await createDialog.getByLabel("ERP Role", { exact: true }).selectOption("Employee");
  await createDialog.getByLabel("Company Car", { exact: true }).selectOption("Not Assigned");
  await createDialog.getByLabel("Accommodation", { exact: true }).selectOption("Assigned");
  await createDialog.getByLabel("Desk", { exact: true }).selectOption("Assigned");
  await createDialog.getByLabel("Stationery", { exact: true }).selectOption("Assigned");
  await createDialog.getByLabel("Email", { exact: true }).selectOption("Assigned");
  await createDialog.getByLabel("Business Card", { exact: true }).selectOption("Assigned");
  await createDialog.getByLabel("Laptop or PC", { exact: true }).selectOption("PC");
  await createDialog.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("cell", { name: "CID-QA-9001", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "PC", exact: true })).toBeVisible();

  await page.getByRole("row", { name: /CID-QA-9001/ }).getByRole("button", { name: /Open/ }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit Access Provisioning" });
  await expect(editDialog.getByLabel("Company ID", { exact: true })).toHaveValue("CID-QA-9001");
  await editDialog.getByLabel("Company ID", { exact: true }).fill("CID-QA-9002");
  await editDialog.getByLabel("Laptop or PC", { exact: true }).selectOption("Laptop");
  await editDialog.getByRole("button", { name: "Save record" }).click();
  const editedRow = page.getByRole("row", { name: /CID-QA-9002/ });
  await expect(editedRow.getByRole("cell", { name: "CID-QA-9002", exact: true })).toBeVisible();
  await expect(editedRow.getByRole("cell", { name: "Laptop", exact: true })).toBeVisible();
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
  await page.getByTestId("payroll-subtab-pay-process").click();
  await expect(page.getByRole("cell", { name: "Salary Advance", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Employee Loan", exact: true })).toBeVisible();
  await page.getByLabel("Manual earnings").fill("1800");
  await page.getByLabel("Manual deductions").fill("1200");
  await page.getByLabel("Manual absence days").fill("0.5");
  await page.getByRole("button", { name: "Save pay process" }).click();
  await expect(page.getByRole("status")).toContainText("Pay process saved");
  await expect(page.locator("main")).toContainText("Calculated net pay");
  await expect(page.locator("main")).toContainText("QAR 13,358.33");
});

test("monthly payroll finalizes and downloads department and company SIF files", async ({ page }) => {
  await login(page, testUsers[1]);
  await page.goto("/hr");
  await page.getByTestId("hr-tab-payroll").click();
  await page.getByLabel("Month").selectOption({ label: "June" });
  await page.getByLabel("Year").selectOption("2026");
  await page.getByLabel("Department").selectOption("All departments");
  await page.getByRole("button", { name: "Load Employees" }).click();
  await expect(page.getByRole("cell", { name: "Fahad Al-Kuwari", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Naveen Kumar", exact: true })).toBeVisible();
  for (const column of ["Overtime", "Salary Advance", "Salary Adjustment", "Paid Vacation", "Insurance Refund", "Air Ticket"]) {
    await expect(page.getByRole("columnheader", { name: column })).toBeVisible();
  }
  await expect(page.getByRole("row", { name: /Aisha Rahman/ })).toContainText("QAR 20,500.00");
  await expect(page.getByRole("row", { name: /Fahad Al-Kuwari/ })).toContainText("QAR 18,500.00");
  await expect(page.getByLabel("Working days for Mariam Said")).toHaveText("30");
  await expect(page.getByLabel("Paid days for Mariam Said")).toHaveText("29");
  await page.getByRole("row", { name: /MPR-MEDTECH-2026-06-All-departments/ }).getByRole("button", { name: "Open" }).click();
  await expect(page.getByRole("button", { name: "Download Company SIF" })).toBeVisible();

  await page.getByLabel("SIF export scope").selectOption("Finance");
  const departmentDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Dept SIFs" }).click();
  expect((await departmentDownloadPromise).suggestedFilename()).toMatch(/^SIF_10007230_CBQ_\d{8}_\d{4}\.csv$/);

  const companyDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Company SIF" }).click();
  const companyDownload = await companyDownloadPromise;
  expect(companyDownload.suggestedFilename()).toMatch(/^SIF_10007230_CBQ_\d{8}_\d{4}\.csv$/);
  const companyPath = await companyDownload.path();
  expect(companyPath ? readFileSync(companyPath, "utf8") : "").toContain("Employer EID,Payer IBAN,Total Salaries");
});

test("attendance absence workflow records payroll-impacting absence", async ({ page }) => {
  await login(page, testUsers[1]);
  await page.goto("/hr");
  await page.getByTestId("hr-tab-attendance").click();
  await expect(page.getByRole("heading", { name: "Payroll impact" })).toBeVisible();
  await expect(page.getByText("Mariam Said")).toBeVisible();
  await expect(page.getByText("QAR 360")).toBeVisible();
});

test("HR workspace tabs and subtabs render without runtime errors", async ({ page, isMobile }) => {
  test.skip(isMobile, "Critical HR mobile journeys are covered separately; full tab audit runs on desktop.");
  await login(page, testUsers[1]);
  await page.goto("/hr");
  const issues: string[] = [];
  page.on("console", message => {
    if (["error", "warning"].includes(message.type())) issues.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", error => issues.push(`pageerror: ${error.message}`));

  async function expectHealthy(label: string) {
    const body = await page.locator("body").innerText();
    expect(body, label).toContain("People & HR");
    expect(body, label).not.toMatch(/Application error|Unhandled Runtime Error|Failed to compile|Something went wrong/i);
    expect(body.length, label).toBeGreaterThan(100);
  }

  for (const tab of hrWorkflowTabs) {
    await page.getByTestId(hrTabTestId(tab)).click();
    await expectHealthy(tab);
    for (const prefix of hrSubtabPrefixes) {
      const count = await page.locator(`main [data-testid^="${prefix}"]`).count();
      for (let index = 0; index < count; index++) {
        const subtab = page.locator(`main [data-testid^="${prefix}"]`).nth(index);
        const subtabName = (await subtab.innerText()).trim();
        await subtab.click();
        await expectHealthy(`${tab} > ${subtabName}`);
      }
    }
  }

  expect([...new Set(issues)]).toEqual([]);
});

test("service division runs local workflow actions and downloads a service report PDF", async ({ page }) => {
  await login(page);
  await page.goto("/service");
  await page.getByRole("button", { name: "Service Requests" }).click();
  await expect(page.getByRole("cell", { name: "SRV-2026-0842", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Select SRV-2026-0842" }).check();
  await page.getByRole("button", { name: "Customer check" }).click();
  await expect(page.getByRole("status")).toContainText("Customer Master checked locally");

  await page.getByRole("button", { name: "Service Reports" }).click();
  await page.getByRole("checkbox", { name: "Select SRV-RPT-2026-0142" }).check();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toContainText("submitted");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status")).toContainText("approved");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download detailed PDF (1)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/SRV-RPT-\d{4}-\d{4}-detailed\.pdf/);
});
