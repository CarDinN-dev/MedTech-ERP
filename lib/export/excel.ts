export async function exportToExcel(rows: Record<string, unknown>[], filename: string, sheetName = "Export") {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MedTech ERP"; workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
  const keys = Object.keys(rows[0] ?? {});
  sheet.columns = keys.map(key => ({ header: key, key, width: Math.min(Math.max(key.length + 4, 14), 36) }));
  rows.forEach(row => sheet.addRow(row));
  sheet.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } }; });
  sheet.autoFilter = { from: "A1", to: `${columnLetter(keys.length)}1` };
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${filename}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
}

export async function parseExcel<T>(file: File, validate: (row: unknown, index: number) => T) {
  const ExcelJS = await import("exceljs"); const data = await file.arrayBuffer(); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(data);
  const sheet = workbook.worksheets[0]; if (!sheet) return { valid: [], errors: [{ row: 0, message: "Workbook has no worksheet" }], total: 0 };
  const headers: string[] = []; sheet.getRow(1).eachCell((cell, column) => { headers[column - 1] = String(cell.text).trim(); });
  const rows: Record<string, unknown>[] = []; sheet.eachRow((row, number) => { if (number === 1) return; const item: Record<string, unknown> = {}; headers.forEach((header, index) => { item[header] = row.getCell(index + 1).value ?? ""; }); rows.push(item); });
  const valid: T[] = []; const errors: { row: number; message: string }[] = [];
  rows.forEach((row, index) => { try { valid.push(validate(row, index + 2)); } catch (error) { errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Invalid row" }); } });
  return { valid, errors, total: rows.length };
}

function columnLetter(column: number) { let result = ""; while (column > 0) { column--; result = String.fromCharCode(65 + (column % 26)) + result; column = Math.floor(column / 26); } return result || "A"; }
