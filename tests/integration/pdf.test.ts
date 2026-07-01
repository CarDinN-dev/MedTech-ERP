import { describe, expect, it } from "vitest";
import { generateBrandedPdf, samplePdfData, type PdfData } from "@/lib/pdf/generator";

async function assertPdf(data: PdfData) {
  const result = await generateBrandedPdf(data, "blob");
  expect(result).toBeInstanceOf(Blob);
  const bytes = new Uint8Array(await (result as Blob).arrayBuffer());
  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  expect(bytes.byteLength).toBeGreaterThan(2500);
}

describe("branded PDF generation", () => {
  it("generates a populated commercial PDF", async () => {
    await assertPdf(samplePdfData);
  });

  it("generates a detailed HR PDF with metadata and signatures", async () => {
    await assertPdf({
      template: "payslip", documentNumber: "PSL-2026-000018", date: "20 June 2026", partyLabel: "Employee", partyName: "Aisha Rahman",
      subject: "June 2026 payroll", metadata: [["Employee No", "MT-0024"], ["Basic Salary", "QAR 12,800"], ["Net pay", "QAR 17,500"]],
      terms: ["Private and confidential."], preparedBy: "Payroll Manager", approvedBy: "Finance Manager"
    });
  });

  it("generates a service report PDF with field-service details", async () => {
    await assertPdf({
      template: "service_report", documentNumber: "SRV-RPT-2026-0142", date: "20 June 2026", partyLabel: "Customer", partyName: "Hamad Medical Corporation",
      subject: "CT Injector System service report",
      metadata: [["Engineer", "Naveen Kumar"], ["Equipment", "CT Injector System"], ["Issue", "Injector pressure fault"], ["Work performed", "Calibration and pressure test completed"], ["Spare parts consumed", "Adult SpO2 Sensor x 1"], ["Timesheet", "2.5 hrs"], ["Customer signature", "Pending"]],
      terms: ["Customer signature placeholder included for local demo sign-off."], preparedBy: "Naveen Kumar", approvedBy: "Service Manager"
    });
  });

  it.each(["approval_to_hire", "hiring_approval", "offer_letter"] as const)("generates the supplied HR form format: %s", async template => {
    await assertPdf({
      template, documentNumber: "HR-REF-2026-001", date: "21 June 2026", partyLabel: "Candidate", partyName: "Noor Al-Hajri",
      subject: "Service Engineer", metadata: [["Candidate", "Noor Al-Hajri"], ["Position", "Service Engineer"], ["Department", "Service"], ["Headcount", "1"], ["Basic Salary", "QAR 8,000"], ["HRA", "QAR 2,700"], ["Transportation", "QAR 1,500"], ["Start date", "01 Aug 2026"]],
      preparedBy: "Kashif", approvedBy: "HR Manager"
    });
  });
});
