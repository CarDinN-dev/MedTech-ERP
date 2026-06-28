export type PdfTemplate = "estimation" | "quotation" | "invoice" | "receipt" | "purchase_order" | "delivery_note" | "packing_list" | "service_report" | "employee_letter" | "experience_certificate" | "leave_approval" | "payment_voucher";
export interface PdfLine { description: string; code?: string; quantity: number; unit?: string; unitPrice: number; discount?: number; total: number; }
export interface PdfData {
  template: PdfTemplate; documentNumber: string; date: string; partyLabel: string; partyName: string; partyAddress?: string;
  subject?: string; lines?: PdfLine[]; subtotal?: number; discount?: number; tax?: number; total?: number; currency?: string;
  terms?: string[]; notes?: string; preparedBy: string; approvedBy?: string; metadata?: Array<[string, string]>;
}

const titles: Record<PdfTemplate, string> = {
  estimation: "ESTIMATION SHEET", quotation: "QUOTATION", invoice: "TAX INVOICE", receipt: "PAYMENT RECEIPT",
  purchase_order: "PURCHASE ORDER", delivery_note: "DELIVERY NOTE", packing_list: "PACKING LIST",
  service_report: "SERVICE REPORT", employee_letter: "EMPLOYEE LETTER", experience_certificate: "EXPERIENCE CERTIFICATE",
  leave_approval: "LEAVE APPROVAL", payment_voucher: "PAYMENT VOUCHER"
};

export async function generateBrandedPdf(data: PdfData, output: "save" | "blob" = "save") {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default; const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const teal: [number,number,number] = [15,118,110], ink: [number,number,number] = [24,34,47];
  doc.setFillColor(...ink); doc.rect(0, 0, 210, 29, "F"); doc.setFillColor(...teal); doc.rect(0, 29, 210, 2, "F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(16); doc.text("MEDTECH", 16, 13);
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.text("CORPORATION TRADING W.L.L.", 16, 18); doc.text("Healthcare Solutions & Medical Equipment", 16, 23);
  doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.text(titles[data.template], 194, 16, { align: "right" });
  doc.setTextColor(...ink); doc.setFontSize(8); doc.text(`Document No.  ${data.documentNumber}`, 194, 38, { align: "right" }); doc.text(`Date  ${data.date}`, 194, 43, { align: "right" });
  doc.setFillColor(244,247,249); doc.roundedRect(14, 49, 182, 26, 2, 2, "F"); doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text(data.partyLabel.toUpperCase(), 19, 56);
  doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(...ink); doc.text(data.partyName, 19, 63);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); if (data.partyAddress) doc.text(data.partyAddress, 19, 69, { maxWidth: 90 });
  let y = 81;
  if (data.subject) { doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.text(`Subject: ${data.subject}`, 14, y); y += 8; }
  if (data.metadata?.length) { autoTable(doc, { startY: y, head: [], body: data.metadata, theme: "plain", styles: { fontSize: 8, cellPadding: 2 }, columnStyles: { 0: { fontStyle: "bold", textColor: teal, cellWidth: 42 } } }); y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6; }
  if (data.lines?.length) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Code / Description", "Qty", "Unit Price", "Disc.", "Total"]],
      body: data.lines.map((line, i) => [i + 1, `${line.code ? line.code + "\n" : ""}${line.description}`, `${line.quantity} ${line.unit ?? ""}`, amount(line.unitPrice, data.currency), line.discount ? `${line.discount}%` : "—", amount(line.total, data.currency)]),
      theme: "striped",
      headStyles: { fillColor: teal, textColor: 255, fontStyle: "bold", fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 3, textColor: ink },
      alternateRowStyles: { fillColor: [247, 250, 251] },
      columnStyles: { 0: { cellWidth: 8 }, 2: { halign: "right", cellWidth: 20 }, 3: { halign: "right", cellWidth: 28 }, 4: { halign: "right", cellWidth: 17 }, 5: { halign: "right", cellWidth: 30, fontStyle: "bold" } }
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
    const totals = [["Subtotal", amount(data.subtotal ?? 0,data.currency)], ...(data.discount ? [["Discount", amount(data.discount,data.currency)]] : []), ...(data.tax ? [["Tax", amount(data.tax,data.currency)]] : []), ["TOTAL", amount(data.total ?? 0,data.currency)]];
    autoTable(doc, { startY: y, body: totals, theme: "plain", tableWidth: 72, margin: { left: 124 }, styles: { fontSize: 8, cellPadding: 2, halign: "right" }, columnStyles: { 1: { fontStyle: "bold", textColor: teal } }, didParseCell: hook => { if (hook.row.index === totals.length - 1) { hook.cell.styles.fontSize = 10; hook.cell.styles.fillColor = [236,253,248]; } } });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }
  if (data.notes) { doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(...ink); doc.text(data.notes, 14, y, { maxWidth: 180 }); y += 14; }
  if (data.terms?.length) { doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.text("TERMS & CONDITIONS", 14, y); y += 5; doc.setFont("helvetica","normal"); doc.setFontSize(7); data.terms.forEach((term,i) => { doc.text(`${i+1}. ${term}`, 14, y, { maxWidth: 180 }); y += 4.5; }); }
  const signatureY = Math.max(y + 12, 238); doc.setDrawColor(203,213,225); [[14,"Prepared by",data.preparedBy],[75,"Approved by",data.approvedBy ?? ""],[137,"Company stamp",""]].forEach(([x,label,value]) => { const nx = x as number; doc.line(nx, signatureY, nx + 48, signatureY); doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text(label as string,nx,signatureY+5); doc.setFont("helvetica","bold"); doc.setTextColor(...ink); doc.text(value as string,nx,signatureY+10); });
  const pages = doc.getNumberOfPages(); for (let p=1;p<=pages;p++) { doc.setPage(p); doc.setFillColor(...ink); doc.rect(0, 284, 210, 13, "F"); doc.setTextColor(255,255,255); doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.text("MedTech Corporation Trading W.L.L. · Doha, State of Qatar · info@medtech.qa", 14, 291); doc.text(`Page ${p} of ${pages}`, 196, 291, { align: "right" }); }
  const filename = `${data.documentNumber}-${data.template}.pdf`;
  if (output === "blob") return doc.output("blob"); doc.save(filename); return filename;
}
function amount(value: number, currency = "QAR") { return `${currency} ${value.toLocaleString("en-QA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export const samplePdfData: PdfData = {
  template: "quotation", documentNumber: "QTN-2026-00314", date: "20 June 2026", partyLabel: "Customer",
  partyName: "Hamad Medical Corporation", partyAddress: "Doha, State of Qatar", subject: "Patient Monitoring System Upgrade",
  lines: [
    { code: "EQ-PM-0750", description: "Patient Monitor MX750 with standard accessories", quantity: 8, unit: "units", unitPrice: 28500, discount: 5, total: 216600 },
    { code: "SP-SPO2-A", description: "Adult reusable SpO₂ sensor", quantity: 16, unit: "units", unitPrice: 1350, total: 21600 },
    { code: "SRV-INST", description: "Installation, commissioning and user training", quantity: 1, unit: "lot", unitPrice: 14800, total: 14800 }
  ], subtotal: 251200, discount: 11400, tax: 0, total: 239800, currency: "QAR",
  terms: ["Quotation validity: 30 days from the date of issue.", "Delivery: 8–10 weeks from receipt of confirmed purchase order.", "Payment: 30 days from invoice date.", "Warranty: 24 months from installation and commissioning."],
  preparedBy: "Fahad Al-Kuwari", approvedBy: "Sales Director"
};
