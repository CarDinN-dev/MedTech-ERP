import { downloadBlob } from "@/lib/client-download";
import { escapeSpreadsheetFormula, plainText, safeFileName } from "@/lib/validation";

const MAX_EXCEL_BYTES = 5 * 1024 * 1024;
const MAX_EXCEL_ROWS = 5000;
const EXCEL_TYPES = new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel.sheet.macroEnabled.12", ""]);
const EXCEL_EXT = /\.(xlsx|xlsm)$/i;

interface ParseOptions { requiredColumns?: string[]; maxRows?: number; }

export async function exportToExcel(rows: Record<string, unknown>[], filename: string, sheetName = "Export") {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MedTech ERP"; workbook.created = new Date();
  const sheet = workbook.addWorksheet(safeSheetName(sheetName), { views: [{ state: "frozen", ySplit: 1 }] });
  const keys = Object.keys(rows[0] ?? {});
  sheet.columns = keys.map(key => ({ header: key, key, width: Math.min(Math.max(key.length + 4, 14), 36) }));
  rows.forEach(row => sheet.addRow(safeRow(row)));
  sheet.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } }; });
  if (keys.length) sheet.autoFilter = { from: "A1", to: `${columnLetter(keys.length)}1` };
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, `${safeFileName(filename)}.xlsx`);
}

export async function exportWorkbookToExcel(sheets: Array<{ name: string; rows: Record<string, unknown>[] }>, filename: string) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MedTech ERP"; workbook.created = new Date();
  sheets.forEach(({ name, rows }) => {
    const sheet = workbook.addWorksheet(safeSheetName(name), { views: [{ state: "frozen", ySplit: 1 }] });
    const keys = Object.keys(rows[0] ?? {});
    sheet.columns = keys.map(key => ({ header: key, key, width: Math.min(Math.max(key.length + 4, 14), 36) }));
    rows.forEach(row => sheet.addRow(safeRow(row)));
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
      cell.alignment = { vertical: "middle" };
    });
    keys.forEach((key, index) => {
      const column = sheet.getColumn(index + 1);
      if (key.toLowerCase().includes("salary") || key.toLowerCase().includes("amount") || key.toLowerCase().includes("total")) column.numFmt = "#,##0.00";
    });
    if (keys.length) sheet.autoFilter = { from: "A1", to: `${columnLetter(keys.length)}1` };
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, `${safeFileName(filename)}.xlsx`);
}

export async function parseExcelRows(file: File, options: ParseOptions = {}) {
  assertExcelFile(file);
  if (file.size > MAX_EXCEL_BYTES) throw new Error("Workbook exceeds the 5 MB local-demo import limit");
  const ExcelJS = await import("exceljs");
  const data = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { sheetName: "", headers: [], rows: [], total: 0, hasWorksheet: false };
  const headers: string[] = [];
  const headerCounts = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => {
    const base = plainText(cell.text, 120);
    const occurrence = (headerCounts.get(base) ?? 0) + 1;
    headerCounts.set(base, occurrence);
    headers[column - 1] = occurrence === 1 ? base : `${base} (${occurrence})`;
  });
  const rows: Record<string, unknown>[] = [];
  const missing = (options.requiredColumns ?? []).filter(column => !headers.includes(column));
  if (missing.length) throw new Error(`Workbook is missing required columns: ${missing.join(", ")}`);
  sheet.eachRow((row, number) => {
    if (number === 1) return;
    if (rows.length >= (options.maxRows ?? MAX_EXCEL_ROWS)) throw new Error("Workbook exceeds the 5000 row local-demo import limit");
    const item: Record<string, unknown> = {};
    headers.forEach((header, index) => { item[header] = plainText(row.getCell(index + 1).text); });
    rows.push(item);
  });
  return { sheetName: sheet.name, headers, rows, total: rows.length, hasWorksheet: true };
}

export async function parseExcel<T>(file: File, validate: (row: unknown, index: number) => T, options: ParseOptions = {}) {
  let parsed: Awaited<ReturnType<typeof parseExcelRows>>;
  try {
    parsed = await parseExcelRows(file, options);
  } catch (error) {
    return { valid: [], errors: [{ row: 0, message: error instanceof Error ? error.message : "Workbook could not be read" }], total: 0 };
  }
  const { rows, total, hasWorksheet } = parsed;
  if (!hasWorksheet) return { valid: [], errors: [{ row: 0, message: "Workbook has no worksheet" }], total: 0 };
  const valid: T[] = []; const errors: { row: number; message: string }[] = [];
  rows.forEach((row, index) => { try { valid.push(validate(row, index + 2)); } catch (error) { errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Invalid row" }); } });
  return { valid, errors, total };
}

function columnLetter(column: number) { let result = ""; while (column > 0) { column--; result = String.fromCharCode(65 + (column % 26)) + result; column = Math.floor(column / 26); } return result || "A"; }
function safeSheetName(name: string) { return plainText(name, 31).replace(/[:\\/?*[\]]/g, " ").trim() || "Export"; }
function safeRow(row: Record<string, unknown>) { return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "string" ? escapeSpreadsheetFormula(plainText(value, 32767)) : value])); }
function assertExcelFile(file: File) {
  if (!EXCEL_EXT.test(file.name) || !EXCEL_TYPES.has(file.type)) throw new Error("Only .xlsx or .xlsm workbook imports are allowed");
}
