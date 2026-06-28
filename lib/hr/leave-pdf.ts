import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import type { LeaveApplication, LeaveApproval } from "@/lib/hr/leave-types";

interface EmployeeDetails {
  join_date?: string | null;
}

interface TemplateCell {
  value: unknown;
  font?: Partial<ExcelJS.Font>;
  alignment?: Partial<ExcelJS.Alignment>;
  fill?: ExcelJS.Fill;
  border?: Partial<ExcelJS.Borders>;
  numFmt?: string;
}

const templateCandidates = [
  path.join(process.cwd(), "templates", "hr", "MTECH-HR-RF-009 Leave Application Form.xlsx"),
  "C:/Users/Lenovo/Downloads/MTECH-HR-RF-009  Leave Application Form.xlsx"
];

const renderRange = { startRow: 2, endRow: 36, startCol: 2, endCol: 11 };

export function resolveLeaveTemplatePath() {
  const found = templateCandidates.find(candidate => existsSync(candidate));
  if (!found) {
    throw new Error("Leave application template is missing. Expected templates/hr/MTECH-HR-RF-009 Leave Application Form.xlsx.");
  }
  return found;
}

export async function generateLeaveApplicationPdf(input: {
  application: LeaveApplication;
  approval: LeaveApproval | null;
  employee: EmployeeDetails | null;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties.fullCalcOnLoad = true;
  const template = readFileSync(resolveLeaveTemplatePath());
  await workbook.xlsx.load(template as any);

  const worksheet = workbook.getWorksheet("MTECH-HR-RF-009") ?? workbook.worksheets[0];
  if (!worksheet) throw new Error("Leave application template has no worksheet.");

  fillLeaveTemplate(worksheet, input);
  return renderWorksheetToPdf(worksheet);
}

function fillLeaveTemplate(worksheet: ExcelJS.Worksheet, { application, approval, employee }: {
  application: LeaveApplication;
  approval: LeaveApproval | null;
  employee: EmployeeDetails | null;
}) {
  const status = approval?.decision === "approved"
    ? "Approved"
    : approval?.decision === "rejected"
      ? "Rejected"
      : application.status === "cancelled"
        ? "Cancelled"
        : "Pending";
  const decisionDate = approval?.decision_date ? formatDate(approval.decision_date) : "";
  const approver = approval?.approver_name ?? "";
  const notes = approval?.approval_notes ?? "";
  const approvedDays = approval?.decision === "approved" ? application.working_days : 0;

  setCell(worksheet, "J6", toDate(application.created_at));
  setCell(worksheet, "C7", `${application.employee_name} (${application.employee_code})`);
  setCell(worksheet, "I7", application.department ?? "");
  setCell(worksheet, "C8", application.designation ?? "");
  setCell(worksheet, "I8", employee?.join_date ? toDate(employee.join_date) : "");
  setCell(worksheet, "C10", application.leave_type);
  setCell(worksheet, "C11", toDate(application.start_date));
  setCell(worksheet, "F11", toDate(application.end_date));
  setCell(worksheet, "I11", `Total Days Period: ${formatDays(application.calendar_days)} Days`);
  setCell(worksheet, "C12", application.purpose ?? "");
  setCell(worksheet, "C14", application.destination ?? "");
  setCell(worksheet, "G14", application.travel_from ?? "");
  setCell(worksheet, "J14", application.travel_to ?? "");
  setCell(worksheet, "C16", [application.emergency_contact_name, application.emergency_contact_phone].filter(Boolean).join(" / "));
  setCell(worksheet, "C17", application.emergency_contact_email ?? "");
  setCell(worksheet, "C20", [application.handover_to_name, application.handover_to_employee_code].filter(Boolean).join(" / "));
  setCell(worksheet, "C21", "Employee signature pending");
  setCell(worksheet, "J24", decisionDate || "Pending");
  setCell(worksheet, "C28", formatDays(application.balance_before));
  setCell(worksheet, "E28", formatDays(application.balance_before));
  setCell(worksheet, "H28", formatDays(approvedDays));
  setCell(worksheet, "K28", formatDays(application.balance_after));
  setCell(worksheet, "C30", `${formatDays(application.balance_before)} days annual entitlement`);
  setCell(worksheet, "D31", `Status: ${status}${approver ? ` | Approver: ${approver}` : ""}${decisionDate ? ` | Decision date: ${decisionDate}` : ""}`);
  setCell(worksheet, "D32", notes || (status === "Rejected" ? "Rejected without additional notes." : "HR/Admin comments pending."));
  setCell(worksheet, "D33", `Approval Details: ${status}${approval?.decision_no ? ` (${approval.decision_no})` : ""}`);
  setCell(worksheet, "B35", status === "Pending" ? "COO approval pending" : status);
  setCell(worksheet, "D35", status === "Pending" ? "CEO approval pending" : status);
  setCell(worksheet, "C36", decisionDate || "");
  setCell(worksheet, "E36", decisionDate || "");
}

function renderWorksheetToPdf(worksheet: ExcelJS.Worksheet) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const marginX = 10;
  const marginY = 10;
  const pageWidth = 210 - marginX * 2;
  const pageHeight = 297 - marginY * 2;
  const colWidths = getColumnWidths(worksheet);
  const rowHeights = getRowHeights(worksheet);
  const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0);
  const widthScale = pageWidth / totalWidth;
  const heightScale = pageHeight / totalHeight;

  const xPositions = colWidths.reduce<number[]>((positions, width, index) => {
    positions.push(index === 0 ? marginX : positions[index - 1] + colWidths[index - 1] * widthScale);
    return positions;
  }, []);
  const yPositions = rowHeights.reduce<number[]>((positions, height, index) => {
    positions.push(index === 0 ? marginY : positions[index - 1] + rowHeights[index - 1] * heightScale);
    return positions;
  }, []);
  const mergeMap = getMergeMap(worksheet);

  for (let row = renderRange.startRow; row <= renderRange.endRow; row += 1) {
    for (let col = renderRange.startCol; col <= renderRange.endCol; col += 1) {
      const address = worksheet.getCell(row, col).address;
      const merge = mergeMap.get(address);
      if (merge?.master !== address) continue;
      const cell = worksheet.getCell(row, col) as unknown as TemplateCell;
      const colIndex = col - renderRange.startCol;
      const rowIndex = row - renderRange.startRow;
      const colSpan = merge ? merge.right - merge.left + 1 : 1;
      const rowSpan = merge ? merge.bottom - merge.top + 1 : 1;
      const x = xPositions[colIndex];
      const y = yPositions[rowIndex];
      const width = sumSlice(colWidths, colIndex, colSpan) * widthScale;
      const height = sumSlice(rowHeights, rowIndex, rowSpan) * heightScale;
      drawCell(doc, cell, x, y, width, height);
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}

function drawCell(doc: jsPDF, cell: TemplateCell, x: number, y: number, width: number, height: number) {
  const fill = colorFromFill(cell.fill);
  if (fill) {
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.rect(x, y, width, height, "F");
  }

  const borderColor: [number, number, number] = [55, 65, 81];
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.15);
  if (hasBorder(cell.border)) doc.rect(x, y, width, height, "S");

  const value = formatCellValue(cell.value, cell.numFmt);
  if (!value) return;

  const fontSize = Math.max(5.6, Math.min(9.2, Number(cell.font?.size ?? 10) * 0.62));
  doc.setFont("helvetica", cell.font?.bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(17, 24, 39);

  const lines = doc.splitTextToSize(value, Math.max(width - 2.4, 4));
  const horizontal = cell.alignment?.horizontal;
  const vertical = cell.alignment?.vertical;
  const lineHeight = fontSize * 0.36;
  const blockHeight = lines.length * lineHeight;
  const textX = horizontal === "center" ? x + width / 2 : horizontal === "right" ? x + width - 1.2 : x + 1.2;
  const align = horizontal === "center" ? "center" : horizontal === "right" ? "right" : "left";
  const textY = vertical === "middle" ? y + (height - blockHeight) / 2 + lineHeight : y + 3.2;

  doc.text(lines, textX, textY, { align, baseline: "alphabetic", maxWidth: width - 2.4 });
}

function getColumnWidths(worksheet: ExcelJS.Worksheet) {
  const widths: number[] = [];
  for (let col = renderRange.startCol; col <= renderRange.endCol; col += 1) {
    widths.push(Number(worksheet.getColumn(col).width ?? 10));
  }
  return widths;
}

function getRowHeights(worksheet: ExcelJS.Worksheet) {
  const heights: number[] = [];
  for (let row = renderRange.startRow; row <= renderRange.endRow; row += 1) {
    heights.push(Number(worksheet.getRow(row).height ?? 18));
  }
  return heights;
}

function getMergeMap(worksheet: ExcelJS.Worksheet) {
  const model = worksheet.model as unknown as { merges?: string[] };
  const map = new Map<string, { master: string; top: number; left: number; bottom: number; right: number }>();
  for (const mergeRef of model.merges ?? []) {
    const [start, end] = mergeRef.split(":");
    const startCell = decodeAddress(start);
    const endCell = decodeAddress(end);
    const master = worksheet.getCell(startCell.row, startCell.col).address;
    for (let row = startCell.row; row <= endCell.row; row += 1) {
      for (let col = startCell.col; col <= endCell.col; col += 1) {
        map.set(worksheet.getCell(row, col).address, { master, top: startCell.row, left: startCell.col, bottom: endCell.row, right: endCell.col });
      }
    }
  }
  return map;
}

function decodeAddress(address: string) {
  const match = /^([A-Z]+)(\d+)$/.exec(address);
  if (!match) throw new Error(`Invalid Excel address: ${address}`);
  let col = 0;
  for (const char of match[1]) col = col * 26 + char.charCodeAt(0) - 64;
  return { col, row: Number(match[2]) };
}

function setCell(worksheet: ExcelJS.Worksheet, address: string, value: unknown) {
  const cell = worksheet.getCell(address);
  cell.value = value as ExcelJS.CellValue;
  cell.alignment = { ...cell.alignment, wrapText: true };
}

function sumSlice(values: number[], start: number, count: number) {
  return values.slice(start, start + count).reduce((sum, value) => sum + value, 0);
}

function hasBorder(border?: Partial<ExcelJS.Borders>) {
  return Boolean(border?.top?.style || border?.right?.style || border?.bottom?.style || border?.left?.style);
}

function colorFromFill(fill?: ExcelJS.Fill): [number, number, number] | null {
  if (!fill || fill.type !== "pattern") return null;
  const argb = fill.fgColor?.argb;
  if (!argb || argb === "00000000" || argb === "FFFFFFFF") return null;
  const rgb = argb.slice(-6);
  return [parseInt(rgb.slice(0, 2), 16), parseInt(rgb.slice(2, 4), 16), parseInt(rgb.slice(4, 6), 16)];
}

function formatCellValue(value: unknown, numFmt?: string) {
  if (value == null) return "";
  if (value instanceof Date) return formatDate(value.toISOString());
  if (typeof value === "object" && "text" in value) return String((value as { text?: unknown }).text ?? "");
  if (typeof value === "number" && numFmt && numFmt.toLowerCase().includes("d")) return formatDate(new Date(Math.round((value - 25569) * 86400 * 1000)).toISOString());
  return String(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatDays(value: number) {
  return Number(value).toLocaleString("en-QA", { maximumFractionDigits: 2 });
}

function toDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
}
