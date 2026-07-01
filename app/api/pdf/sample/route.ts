import { NextResponse } from "next/server";
import { generateBrandedPdf, samplePdfData, type PdfTemplate } from "@/lib/pdf/generator";
import { safeFileName } from "@/lib/validation";

const templates = new Set<PdfTemplate>(["estimation","quotation","invoice","receipt","purchase_order","rfq","delivery_note","packing_list","service_report","employee_letter","offer_letter","approval_to_hire","hiring_approval","appointment_letter","employment_contract","salary_certificate","experience_certificate","warning_letter","payslip","leave_approval","clearance_certificate","final_settlement","gratuity_statement","payment_voucher","report"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requested = searchParams.get("template") as PdfTemplate | null;
    const template: PdfTemplate = requested && templates.has(requested) ? requested : "quotation";
    const documentNumber = `${template.slice(0, 3).toUpperCase()}-2026-00001`;
    const reportData = template === "report" ? {
      ...samplePdfData, template, documentNumber, partyLabel: "Prepared for", partyName: "MedTech Management",
      subject: "Enterprise Performance Summary - June 2026",
      lines: [
        { code: "KPI-01", description: "Recognized revenue", quantity: 1, unit: "metric", unitPrice: 2840000, total: 2840000 },
        { code: "KPI-02", description: "Open commercial pipeline", quantity: 1, unit: "metric", unitPrice: 4820000, total: 4820000 },
        { code: "KPI-03", description: "Inventory valuation", quantity: 1, unit: "metric", unitPrice: 6740000, total: 6740000 }
      ], subtotal: 14400000, discount: 0, tax: 0, total: 14400000,
      terms: ["Generated from the MedTech ERP client demonstration dataset.", "Figures are illustrative and intended for solution review."],
      preparedBy: "MedTech ERP", approvedBy: "Management"
    } : { ...samplePdfData, template, documentNumber };
    const result = await generateBrandedPdf(reportData, "blob");
    if (!(result instanceof Blob)) return NextResponse.json({ error: "Unable to generate document" }, { status: 500 });
    const disposition = searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(await result.arrayBuffer(), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeFileName(`${documentNumber}-${template}`)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }});
  } catch {
    return NextResponse.json({ error: "Unable to generate document" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
