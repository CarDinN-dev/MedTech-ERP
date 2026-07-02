import { plainText, safeFileName } from "@/lib/validation";

export type PdfTemplate = "estimation" | "quotation" | "invoice" | "receipt" | "purchase_order" | "rfq" | "delivery_note" | "packing_list" | "service_report" | "employee_letter" | "offer_letter" | "approval_to_hire" | "hiring_approval" | "appointment_letter" | "employment_contract" | "salary_certificate" | "experience_certificate" | "warning_letter" | "payslip" | "leave_approval" | "clearance_certificate" | "final_settlement" | "gratuity_statement" | "payment_voucher" | "report";
export interface PdfLine { description: string; code?: string; quantity: number; unit?: string; unitPrice: number; discount?: number; total: number; }
export interface PdfData {
  template: PdfTemplate; documentNumber: string; date: string; partyLabel: string; partyName: string; partyAddress?: string;
  subject?: string; lines?: PdfLine[]; subtotal?: number; discount?: number; tax?: number; total?: number; currency?: string;
  terms?: string[]; notes?: string; preparedBy: string; approvedBy?: string; metadata?: Array<[string, string]>;
}

const titles: Record<PdfTemplate, string> = {
  estimation: "ESTIMATION SHEET", quotation: "QUOTATION", invoice: "TAX INVOICE", receipt: "PAYMENT RECEIPT",
  purchase_order: "PURCHASE ORDER", rfq: "REQUEST FOR QUOTATION", delivery_note: "DELIVERY NOTE", packing_list: "PACKING LIST",
  service_report: "SERVICE REPORT", employee_letter: "EMPLOYEE LETTER", offer_letter: "OFFER LETTER", approval_to_hire: "APPROVAL TO HIRE FORM", hiring_approval: "HIRING APPROVAL REQUEST", appointment_letter: "APPOINTMENT LETTER",
  employment_contract: "EMPLOYMENT CONTRACT", salary_certificate: "SALARY CERTIFICATE", experience_certificate: "EXPERIENCE CERTIFICATE",
  warning_letter: "WARNING LETTER", payslip: "PAYSLIP", leave_approval: "LEAVE APPROVAL", clearance_certificate: "CLEARANCE CERTIFICATE",
  final_settlement: "FINAL SETTLEMENT", gratuity_statement: "GRATUITY STATEMENT", payment_voucher: "PAYMENT VOUCHER", report: "MANAGEMENT REPORT"
};

export async function generateBrandedPdf(data: PdfData, output: "save" | "blob" = "save") {
  data = sanitizePdfData(data);
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default; const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  if (data.template === "approval_to_hire" || data.template === "hiring_approval" || data.template === "offer_letter" || data.template === "leave_approval") {
    if (data.template === "approval_to_hire") renderApprovalToHire(doc, autoTable, data);
    if (data.template === "hiring_approval") renderHiringApproval(doc, autoTable, data);
    if (data.template === "offer_letter") renderOfferLetter(doc, autoTable, data);
    if (data.template === "leave_approval") renderLeaveApplicationForm(doc, autoTable, data);
    const specialFilename = `${safeFileName(`${data.documentNumber}-${data.template}`)}.pdf`;
    if (output === "blob") return doc.output("blob"); doc.save(specialFilename); return specialFilename;
  }
  const navy: [number,number,number] = [36,49,104], red: [number,number,number] = [237,30,54], ink: [number,number,number] = [15,23,42];
  doc.setFillColor(...navy); doc.rect(0, 0, 210, 29, "F"); doc.setFillColor(...red); doc.rect(0, 29, 210, 2, "F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(16); doc.text("MEDTECH", 16, 13);
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.text("CORPORATION TRADING W.L.L.", 16, 18); doc.text("Healthcare Solutions & Medical Equipment", 16, 23);
  doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.text(titles[data.template], 194, 16, { align: "right" });
  doc.setTextColor(...ink); doc.setFontSize(8); doc.text(`Document No.  ${data.documentNumber}`, 194, 38, { align: "right" }); doc.text(`Date  ${data.date}`, 194, 43, { align: "right" });
  doc.setFillColor(244,247,249); doc.roundedRect(14, 49, 182, 26, 2, 2, "F"); doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text(data.partyLabel.toUpperCase(), 19, 56);
  doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(...ink); doc.text(data.partyName, 19, 63);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); if (data.partyAddress) doc.text(data.partyAddress, 19, 69, { maxWidth: 90 });
  let y = 81;
  if (data.subject) { doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.text(`Subject: ${data.subject}`, 14, y); y += 8; }
  if (data.metadata?.length) { autoTable(doc, { startY: y, head: [], body: data.metadata, theme: "plain", styles: { fontSize: 8, cellPadding: 2 }, columnStyles: { 0: { fontStyle: "bold", textColor: navy, cellWidth: 42 } } }); y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6; }
  if (data.lines?.length) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Code / Description", "Qty", "Unit Price", "Disc.", "Total"]],
      body: data.lines.map((line, i) => [i + 1, `${line.code ? line.code + "\n" : ""}${line.description}`, `${line.quantity} ${line.unit ?? ""}`, amount(line.unitPrice, data.currency), line.discount ? `${line.discount}%` : "—", amount(line.total, data.currency)]),
      theme: "striped",
      headStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 3, textColor: ink },
      alternateRowStyles: { fillColor: [247, 250, 251] },
      columnStyles: { 0: { cellWidth: 8 }, 2: { halign: "right", cellWidth: 20 }, 3: { halign: "right", cellWidth: 28 }, 4: { halign: "right", cellWidth: 17 }, 5: { halign: "right", cellWidth: 30, fontStyle: "bold" } }
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
    const totals = [["Subtotal", amount(data.subtotal ?? 0,data.currency)], ...(data.discount ? [["Discount", amount(data.discount,data.currency)]] : []), ...(data.tax ? [["Tax", amount(data.tax,data.currency)]] : []), ["TOTAL", amount(data.total ?? 0,data.currency)]];
    autoTable(doc, { startY: y, body: totals, theme: "plain", tableWidth: 72, margin: { left: 124 }, styles: { fontSize: 8, cellPadding: 2, halign: "right" }, columnStyles: { 1: { fontStyle: "bold", textColor: red } }, didParseCell: hook => { if (hook.row.index === totals.length - 1) { hook.cell.styles.fontSize = 10; hook.cell.styles.fillColor = [255,232,236]; } } });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }
  if (data.notes) { doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(...ink); doc.text(data.notes, 14, y, { maxWidth: 180 }); y += 14; }
  if (data.terms?.length) { doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.text("TERMS & CONDITIONS", 14, y); y += 5; doc.setFont("helvetica","normal"); doc.setFontSize(7); data.terms.forEach((term,i) => { doc.text(`${i+1}. ${term}`, 14, y, { maxWidth: 180 }); y += 4.5; }); }
  const signatureY = Math.max(y + 12, 238); doc.setDrawColor(203,213,225); [[14,"Prepared by",data.preparedBy],[75,"Approved by",data.approvedBy ?? ""],[137,"Company stamp",""]].forEach(([x,label,value]) => { const nx = x as number; doc.line(nx, signatureY, nx + 48, signatureY); doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text(label as string,nx,signatureY+5); doc.setFont("helvetica","bold"); doc.setTextColor(...ink); doc.text(value as string,nx,signatureY+10); });
  const pages = doc.getNumberOfPages(); for (let p=1;p<=pages;p++) { doc.setPage(p); doc.setFillColor(...ink); doc.rect(0, 284, 210, 13, "F"); doc.setTextColor(255,255,255); doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.text("MedTech Corporation Trading W.L.L. · Doha, State of Qatar · info@medtech.qa", 14, 291); doc.text(`Page ${p} of ${pages}`, 196, 291, { align: "right" }); }
  const filename = `${safeFileName(`${data.documentNumber}-${data.template}`)}.pdf`;
  if (output === "blob") return doc.output("blob"); doc.save(filename); return filename;
}

type PdfDocument = import("jspdf").jsPDF;
type AutoTableFunction = typeof import("jspdf-autotable").default;

function renderLeaveApplicationForm(doc: PdfDocument, autoTable: AutoTableFunction, data: PdfData) {
  const blue: [number, number, number] = [31, 78, 121];
  const border: [number, number, number] = [82, 95, 115];
  const ink: [number, number, number] = [25, 34, 45];
  const soft: [number, number, number] = [237, 242, 247];
  const meta = metadataMap(data);
  const value = (...keys: string[]) => keys.map(key => meta.get(key)).find(Boolean) || "";
  const request = value("Request") || data.documentNumber;
  const status = value("Status") || "Pending approval";
  const isApproved = status.toLowerCase().includes("approved");
  const isRejected = status.toLowerCase().includes("rejected");
  const leaveDays = value("Days", "Total Days Period") || "";
  const remaining = value("Balance", "Remaining Paid Leave Days") || "";
  const decisionDate = value("Decision date") || (isApproved || isRejected ? data.date : "");
  const approver = value("Approver") || data.approvedBy || "";

  doc.setDrawColor(...border);
  doc.setLineWidth(0.25);
  doc.rect(10, 10, 190, 277);
  doc.setFillColor(...soft);
  doc.rect(10, 10, 190, 28, "F");
  doc.rect(10, 38, 190, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...blue);
  doc.setFontSize(11);
  doc.text("MedTech Corporation Trading", 58, 19);
  doc.setFontSize(13);
  doc.text("LEAVE APPLICATION FORM", 58, 30);
  doc.setTextColor(...ink);
  doc.setFontSize(6.8);
  doc.text("Ref.:", 154, 16);
  doc.text("MTECH-HR-RF-009", 166, 16);
  doc.text("Classification:", 154, 22);
  doc.text("Restricted", 174, 22);
  doc.text("Issue Date:", 154, 28);
  doc.text("13.11.2018", 172, 28);
  doc.text("Rev.: 0", 154, 34);
  doc.setFillColor(15, 118, 110);
  doc.roundedRect(18, 15, 26, 17, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("M", 31, 26, { align: "center" });

  let y = 43;
  y = sectionHeader(doc, "APPLICANT DETAILS", y, blue);
  autoTable(doc, {
    startY: y,
    body: [
      ["Employee Name:", value("Employee", "Employee Name") || data.partyName, "Department:", value("Department")],
      ["Employee Code:", value("Employee Code"), "Date:", data.date],
      ["Designation:", value("Designation"), "Date of Employment:", value("Date of Employment")]
    ],
    theme: "grid",
    styles: leaveCellStyle(border),
    columnStyles: { 0: leaveLabelStyle(), 1: { cellWidth: 61 }, 2: leaveLabelStyle(), 3: { cellWidth: 52 } },
    margin: { left: 15, right: 15 }
  });
  y = lastTableY(doc) + 2;

  y = sectionHeader(doc, "LEAVE REQUEST DETAILS", y, blue);
  autoTable(doc, {
    startY: y,
    body: [
      ["Leave Type:", value("Leave type", "Leave Type"), "Application No:", request],
      ["Leave Period:", `From ${value("From", "Approved from")}  To ${value("To", "Approved to")}`, "Total Days Period:", leaveDays ? `${leaveDays} Days` : ""],
      [{ content: "Purpose:", styles: leaveLabelStyle() }, { content: value("Purpose") || data.subject || "", colSpan: 3 }],
      ["Destination:", value("Destination"), "From:", value("Travel from")],
      ["", "", "To:", value("Travel to")]
    ],
    theme: "grid",
    styles: leaveCellStyle(border),
    columnStyles: { 0: leaveLabelStyle(), 1: { cellWidth: 75 }, 2: leaveLabelStyle(), 3: { cellWidth: 38 } },
    margin: { left: 15, right: 15 }
  });
  y = lastTableY(doc) + 2;

  y = sectionHeader(doc, "EMERGENCY CONTACT DURING LEAVE", y, blue);
  autoTable(doc, {
    startY: y,
    body: [
      ["Phone / Mobile:", value("Contact", "Phone / Mobile")],
      ["Email:", value("Email")]
    ],
    theme: "grid",
    styles: leaveCellStyle(border),
    columnStyles: { 0: leaveLabelStyle(), 1: { cellWidth: 146 } },
    margin: { left: 15, right: 15 }
  });
  y = lastTableY(doc) + 2;

  y = sectionHeader(doc, "DUTIES & TASKS HANDED OVER TO", y, blue);
  autoTable(doc, {
    startY: y,
    body: [
      ["Name:", value("Handover to"), "Employee Signature", ""],
      ["Signature:", "", "Department Head Approval", ""],
      ["Date:", "", "Date:", ""]
    ],
    theme: "grid",
    styles: { ...leaveCellStyle(border), minCellHeight: 8 },
    columnStyles: { 0: leaveLabelStyle(), 1: { cellWidth: 63 }, 2: leaveLabelStyle(), 3: { cellWidth: 54 } },
    margin: { left: 15, right: 15 }
  });
  y = lastTableY(doc) + 3;

  y = sectionHeader(doc, "FOR OFFICIAL USE", y, blue);
  autoTable(doc, {
    startY: y,
    head: [["Current Leave Days", "Cumulative Leave Days", "Total Paid Leave Days", "Remaining Paid Leave Days"]],
    body: [
      [`Paid: ${leaveDays || ""}`, "Paid:", `Paid: ${leaveDays || ""}`, `Paid: ${remaining}`],
      ["Unpaid:", "Unpaid:", "Unpaid:", "Unpaid:"],
      [{ content: `Leave Entitlement: ${value("Leave Entitlement") || "30 Days"}`, colSpan: 4 }]
    ],
    theme: "grid",
    headStyles: { fillColor: soft, textColor: ink, fontStyle: "bold", lineColor: border, lineWidth: 0.25, fontSize: 7.2 },
    styles: { ...leaveCellStyle(border), minCellHeight: 8 },
    margin: { left: 15, right: 15 }
  });
  y = lastTableY(doc) + 2;

  autoTable(doc, {
    startY: y,
    body: [
      ["HR / ADMIN Comments:", value("Approval notes") || data.notes || ""],
      ["Approval Details:", `${status.toUpperCase()}${approver ? ` by ${approver}` : ""}${decisionDate ? ` on ${decisionDate}` : ""}`],
      ["COO", "CEO"],
      ["Date:", "Date:"]
    ],
    theme: "grid",
    styles: { ...leaveCellStyle(border), minCellHeight: 9 },
    columnStyles: { 0: leaveLabelStyle(), 1: { cellWidth: 120 } },
    margin: { left: 15, right: 15 }
  });
  y = lastTableY(doc) + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(isApproved ? 22 : isRejected ? 190 : 146, isApproved ? 120 : isRejected ? 18 : 102, isApproved ? 80 : isRejected ? 60 : 21);
  doc.text(`Status: ${status}`, 15, y);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Generated from MedTech ERP using MTECH-HR-RF-009 Leave Application Form layout.", 15, 283);
  doc.text(`Document: ${request}`, 195, 283, { align: "right" });
}

function sectionHeader(doc: PdfDocument, title: string, y: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  doc.rect(15, y, 180, 6.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title, 17, y + 4.5);
  return y + 6.5;
}

function leaveCellStyle(border: [number, number, number]) {
  return { fontSize: 7.4, cellPadding: 1.8, lineColor: border, lineWidth: 0.25, textColor: [25, 34, 45] as [number, number, number], valign: "middle" as const };
}

function leaveLabelStyle() {
  return { fontStyle: "bold" as const, fillColor: [248, 250, 252] as [number, number, number], cellWidth: 36 };
}

function renderApprovalToHire(doc: PdfDocument, autoTable: AutoTableFunction, data: PdfData) {
  const blue: [number, number, number] = [31, 64, 133];
  const ink: [number, number, number] = [35, 45, 61];
  const meta = metadataMap(data);
  doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("MEDTECH ERP", 14, 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text("SECURE HUMAN RESOURCE OPERATIONS", 14, 22);
  doc.setFont("helvetica", "bold"); doc.setFontSize(21); doc.setTextColor(...blue); doc.text("APPROVAL TO HIRE FORM", 196, 19, { align: "right" });
  doc.setDrawColor(...blue); doc.setLineWidth(0.8); doc.line(12, 28, 198, 28);
  const candidate = meta.get("Candidate") || meta.get("Name of the Candidate") || "To be confirmed";
  const positionType = meta.get("Position Type") || (meta.get("Reason for Hire") === "Replacement" ? "Replacement [X]  New Position [ ]" : "Replacement [ ]  New Position [X]");
  const body = [
    ["Name of the Candidate:", candidate, `Grade: ${meta.get("Grade/Band") || meta.get("Priority") || "Normal"}`],
    ["Designation:", meta.get("Designation") || meta.get("Position") || data.subject || "-", `Department: ${meta.get("Department") || "-"}`],
    ["Position Type:", positionType, `Headcount: ${meta.get("Headcount") || meta.get("Vacancies") || "1"}`],
    ["Basic Salary:", meta.get("Basic Salary") || meta.get("Budgeted salary") || meta.get("Budget") || "To be confirmed", `Benefits: ${meta.get("Benefits") || "As per company policy"}`],
    ["Source:", meta.get("Source") || "Manpower Planning", `Estimated Starting Date: ${meta.get("Estimated Starting Date") || meta.get("Target period") || meta.get("Target start") || "To be confirmed"}`],
    ["Plan Status:", meta.get("Status") || "Draft", `Prepared Date: ${meta.get("Prepared Date") || data.date}`]
  ];
  autoTable(doc, { startY: 33, head: [[{ content: "HUMAN RESOURCE DEPARTMENT", colSpan: 3, styles: { halign: "center" } }]], body, theme: "grid", styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [207, 218, 232], textColor: ink }, headStyles: { fillColor: [234, 242, 252], textColor: blue, fontSize: 11, fontStyle: "bold" }, columnStyles: { 0: { fontStyle: "bold", fillColor: [247, 249, 252], cellWidth: 58 }, 1: { cellWidth: 62 }, 2: { cellWidth: 61.78 } } });
  let y = lastTableY(doc) + 2;
  autoTable(doc, { startY: y, body: [[
    `Prepared By:\n\n${data.preparedBy}\n\nName & Signature:\n____________________\nDate: ____________________`,
    `Approved By:\n\nApproved [ ]  Rejected [ ]\n\n${data.approvedBy || "Head of Department"}\nName & Signature:\n____________________\nDate: ____________________`,
    "Final Approval:\n\nApproved [ ]  Rejected [ ]\n\nManagement\nName & Signature:\n____________________\nDate: ____________________"
  ]], theme: "grid", styles: { fontSize: 8, cellPadding: 3, minCellHeight: 42, valign: "top", lineColor: [207, 218, 232], fillColor: [248, 250, 252], textColor: ink }, columnStyles: { 0: { cellWidth: 60.593 }, 1: { cellWidth: 60.593 }, 2: { cellWidth: 60.593 } } });
  y = lastTableY(doc) + 3;
  doc.setFillColor(234, 242, 252); doc.rect(14, y, 182, 8, "F"); doc.setTextColor(...blue); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("HEAD OF DEPARTMENT CONFIRMATION", 105, y + 5.5, { align: "center" });
  doc.setDrawColor(207, 218, 232); doc.rect(14, y + 8, 182, 30); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...ink);
  doc.text("I confirm that the requested manpower requirement meets the department's operational needs and that the selected candidate must meet the requested qualifications and requirements to perform the duties and responsibilities of this position.", 17, y + 14, { maxWidth: 176 });
  doc.text("HOD Name & Signature: ____________________________________________    Date: ____________________", 17, y + 31);
  doc.setFillColor(247, 249, 252); doc.rect(14, 278, 182, 8, "F"); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(`Document: Approval To Hire Form     Plan ID: ${data.documentNumber}     Generated: ${data.date}`, 17, 283);
}

function renderHiringApproval(doc: PdfDocument, autoTable: AutoTableFunction, data: PdfData) {
  const navy: [number, number, number] = [36, 49, 104];
  const ink: [number, number, number] = [35, 45, 61];
  const meta = metadataMap(data);
  brandedHeader(doc, "HIRING APPROVAL REQUEST", data.documentNumber, data.date);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...ink); doc.text(`Subject: Hiring Approval Request - ${meta.get("Position") || meta.get("Title") || data.subject || "Position"}`, 14, 42);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`Requested By: ${meta.get("Requested By") || data.preparedBy}    Department: ${meta.get("Department") || "-"}`, 14, 49);
  const sections: Array<[string, Array<[string, string]>]> = [
    ["1. POSITION DETAILS", [["Job Title", meta.get("Position") || meta.get("Title") || "-"], ["Employment Type", meta.get("Employment type") || "Full-time"], ["Location", meta.get("Location") || "Doha, Qatar"], ["Reporting To", meta.get("Reporting To") || meta.get("Approver") || "Department Head"], ["Expected Start Date", meta.get("Target start") || meta.get("Start date") || "To be confirmed"]]],
    ["2. JUSTIFICATION FOR HIRING", [["Reason for Hire", meta.get("Reason for Hire") || "New Position"], ["Replacement Employee", meta.get("Previous Employee") || "Not applicable"], ["Business Impact", meta.get("Business Impact") || meta.get("Title") || "Operational capacity requirement"], ["Budget Availability", meta.get("Budget Availability") || "Yes"]]],
    ["3. COMPENSATION & BUDGET", [["Salary Range", meta.get("Budgeted salary") || meta.get("Salary Range") || "To be confirmed"], ["Benefits Included", meta.get("Benefits") || "As per company policy"], ["Total Estimated Cost", meta.get("Budget") || meta.get("Total Estimated Cost") || "To be confirmed"]]],
    ["4. RECRUITMENT PLAN", [["Preferred Timeline", meta.get("Recruitment Timeline") || "Within 30 days"], ["Recruitment Method", meta.get("Recruitment Method") || "Internal / external posting"], ["Key Skills & Experience", meta.get("Key Skills & Experience") || "As specified in the approved job description"]]]
  ];
  let y = 55;
  for (const [title, rows] of sections) {
    autoTable(doc, { startY: y, head: [[{ content: title, colSpan: 2 }]], body: rows, theme: "grid", styles: { fontSize: 7.5, cellPadding: 2, lineColor: [215, 226, 230], textColor: ink }, headStyles: { fillColor: navy, textColor: 255, fontStyle: "bold" }, columnStyles: { 0: { cellWidth: 52, fontStyle: "bold", fillColor: [248, 250, 252] }, 1: { cellWidth: 129.78 } } });
    y = lastTableY(doc) + 3;
  }
  if (y > 220) { doc.addPage(); y = 22; }
  autoTable(doc, { startY: y, head: [[{ content: "5. APPROVALS REQUIRED", colSpan: 2 }]], body: [["Hiring Manager", "Name: ____________________  Signature: ____________________  Date: __________"], ["Department Head", "Name: ____________________  Signature: ____________________  Date: __________"], ["HR Manager", "Name: ____________________  Signature: ____________________  Date: __________"], ["Finance Approval", "Name: ____________________  Signature: ____________________  Date: __________"], ["Executive Approval", "Name: ____________________  Signature: ____________________  Date: __________"]], theme: "grid", styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [215, 226, 230] }, headStyles: { fillColor: navy, textColor: 255 }, columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" }, 1: { cellWidth: 136.78 } } });
  addHrFooters(doc, "MTECH-HR-RF-027 Hiring Approval Document");
}

function renderOfferLetter(doc: PdfDocument, autoTable: AutoTableFunction, data: PdfData) {
  const navy: [number, number, number] = [36, 49, 104];
  const ink: [number, number, number] = [35, 45, 61];
  const meta = metadataMap(data);
  const candidate = meta.get("Candidate") || data.partyName;
  const position = meta.get("Position") || data.subject || "Employee";
  const startDate = meta.get("Start date") || "To be confirmed";
  brandedHeader(doc, "CONTRACT OF EMPLOYMENT", data.documentNumber, data.date);
  let y = 43;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...ink); doc.text("STRICTLY PRIVATE & CONFIDENTIAL", 14, y); y += 8;
  doc.setFont("helvetica", "normal"); doc.text(candidate, 14, y); y += 5; doc.text("Doha, State of Qatar", 14, y); y += 10;
  y = pdfParagraph(doc, "We are delighted to extend our offer of employment with MedTech Corporation Trading W.L.L. This offer is subject to compliance with Qatar immigration and employment requirements.", y, ink);
  y = pdfSection(doc, "1. DATE OF COMMENCEMENT", y, navy);
  y = pdfParagraph(doc, `This Contract of Employment will come into effect from ${startDate}.`, y, ink);
  y = pdfSection(doc, "2. JOB DETAILS", y, navy);
  autoTable(doc, { startY: y, body: [["Job Title", position], ["Employee Group", meta.get("Employee Group") || "Staff"], ["Department", meta.get("Department") || "-"], ["Work Location", "Doha, Qatar"]], theme: "grid", styles: { fontSize: 8, cellPadding: 2, lineColor: [215, 226, 230] }, columnStyles: { 0: { cellWidth: 48, fontStyle: "bold", fillColor: [248, 250, 252] }, 1: { cellWidth: 133.78 } } }); y = lastTableY(doc) + 5;
  y = pdfSection(doc, "3. CONTRACTUAL PAY", y, navy);
  y = pdfParagraph(doc, "Contractual pay consists of Basic Salary and approved allowances. Gratuity will be calculated in accordance with Qatar Labour Law and company policy.", y, ink);
  autoTable(doc, { startY: y, head: [["Component", "Monthly Amount"]], body: [["Basic Salary", meta.get("Basic Salary") || meta.get("Offered salary") || "To be confirmed"], ["HRA", meta.get("HRA") || "Included / as agreed"], ["Transportation", meta.get("Transportation") || "Included / as agreed"], ["Total Contractual Pay", meta.get("Total package") || meta.get("Offered salary") || "To be confirmed"]], theme: "grid", styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: navy, textColor: 255 }, columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 81.78, halign: "right", fontStyle: "bold" } } }); y = lastTableY(doc) + 5;
  const sections: Array<[string, string]> = [
    ["4. VARIABLE PAY", "Subject to company discretion and applicable schemes, you may be eligible for bonus or incentive based on company, business-unit and individual performance."],
    ["5. BENEFITS", "Medical benefits, financial facilities and leave benefits will be provided under company policy. Annual leave entitlement is 30 calendar days per completed year, with sick, compassionate, maternity and public-holiday leave applied in accordance with Qatar Labour Law and company policy."],
    ["6. WORKING DAYS AND HOURS", `Standard working days are Sunday to Thursday. Weekly working hours are 44 hours and normal work timings are ${meta.get("Work Timings") || "07:30-16:30"}. Ramadan timings and operational duty requirements will be notified separately.`],
    ["7. PROBATION AND NOTICE PERIOD", "You will be on probation for the period permitted by Qatar Labour Law. Confirmation is subject to satisfactory performance. After confirmation, termination and notice requirements will follow the employment contract, Qatar Labour Law and company policy."],
    ["8. MEDICAL AND RESIDENCE VISAS", "Employment is conditional on medical fitness, immigration approval, and holding valid residence and work authorization in the State of Qatar. MedTech will provide sponsorship support in line with company policy."],
    ["9. END OF SERVICE BENEFITS", "After completing the qualifying service period, end-of-service gratuity will be calculated in accordance with Qatar Labour Law using the applicable basic salary and completed service period. Any amounts due to the company may be deducted where legally permitted."],
    ["10. CONTRACT ACCEPTANCE", "By accepting this offer, you agree to comply with the laws of Qatar and MedTech policies. Please sign and return this letter within the validity period stated in the offer record."]
  ];
  for (const [title, paragraph] of sections) { y = pdfSection(doc, title, y, navy); y = pdfParagraph(doc, paragraph, y, ink); }
  if (y > 245) { doc.addPage(); y = 36; }
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...ink); doc.text("Yours sincerely,", 14, y); doc.text("I accept the above terms and conditions", 112, y); y += 18;
  doc.line(14, y, 82, y); doc.line(112, y, 196, y); doc.setFontSize(7); doc.text(data.approvedBy || "Chief Operating Officer", 14, y + 5); doc.text(`${candidate} - Signature / Date`, 112, y + 5);
  addHrFooters(doc, "MTECH-HR-RF-012 Job offer letter / Restricted / Effective Date: 13.11.2017", "CONTRACT OF EMPLOYMENT");
}

function brandedHeader(doc: PdfDocument, title: string, documentNumber: string, date: string) {
  doc.setFillColor(24, 34, 47); doc.rect(0, 0, 210, 28, "F"); doc.setFillColor(15, 118, 110); doc.rect(0, 28, 210, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("MEDTECH", 14, 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text("CORPORATION TRADING W.L.L. · DOHA, QATAR", 14, 18);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(title, 196, 13, { align: "right" }); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.text(`${documentNumber} · ${date}`, 196, 20, { align: "right" });
}

function addHrFooters(doc: PdfDocument, label: string, repeatedTitle?: string) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) { doc.setPage(page); if (page > 1 && repeatedTitle) { doc.setFillColor(24, 34, 47); doc.rect(0, 0, 210, 24, "F"); doc.setFillColor(15, 118, 110); doc.rect(0, 24, 210, 1.5, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("MEDTECH", 14, 11); doc.setFontSize(9); doc.text(repeatedTitle, 196, 11, { align: "right" }); } doc.setDrawColor(15, 118, 110); doc.line(14, 282, 196, 282); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal"); doc.setFontSize(6.2); doc.text(label, 14, 287); doc.text(`Page ${page} of ${pages}`, 196, 287, { align: "right" }); }
}

function pdfSection(doc: PdfDocument, title: string, y: number, color: [number, number, number]) {
  if (y > 258) { doc.addPage(); y = 36; }
  doc.setFillColor(...color); doc.roundedRect(14, y, 182, 7, 1, 1, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(title, 17, y + 4.8); return y + 10;
}

function pdfParagraph(doc: PdfDocument, text: string, y: number, color: [number, number, number]) {
  const lines = doc.splitTextToSize(text, 178) as string[];
  if (y + lines.length * 4.2 > 274) { doc.addPage(); y = 36; }
  doc.setTextColor(...color); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(lines, 16, y); return y + lines.length * 4.2 + 4;
}

function metadataMap(data: PdfData) { return new Map((data.metadata ?? []).map(([key, value]) => [key.replace(/^.* · /, ""), value])); }
function lastTableY(doc: PdfDocument) { return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY; }

function amount(value: number, currency = "QAR") { return `${currency} ${value.toLocaleString("en-QA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function sanitizePdfData(data: PdfData): PdfData {
  return {
    ...data,
    documentNumber: safeFileName(data.documentNumber, "MEDTECH-DOC").toUpperCase(),
    date: plainText(data.date, 80),
    partyLabel: plainText(data.partyLabel, 80),
    partyName: plainText(data.partyName, 160),
    partyAddress: data.partyAddress ? plainText(data.partyAddress, 500) : undefined,
    subject: data.subject ? plainText(data.subject, 500) : undefined,
    currency: data.currency ? plainText(data.currency, 8).toUpperCase() : undefined,
    notes: data.notes ? plainText(data.notes, 2000) : undefined,
    preparedBy: plainText(data.preparedBy, 120),
    approvedBy: data.approvedBy ? plainText(data.approvedBy, 120) : undefined,
    terms: data.terms?.map(term => plainText(term, 500)),
    metadata: data.metadata?.map(([key, value]) => [plainText(key, 160), plainText(value, 1000)]),
    lines: data.lines?.map(line => ({ ...line, code: line.code ? plainText(line.code, 80) : undefined, description: plainText(line.description, 1000), unit: line.unit ? plainText(line.unit, 40) : undefined }))
  };
}

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
