export interface AttendanceImportResult {
  dailyRows: Array<Record<string, string>>;
  absenceRows: Array<Record<string, string>>;
  period: string;
  dayCount: number;
  employeeCount: number;
}

export async function parseAttendanceLog(file: File, salaryByEmployee: Map<string, number>) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Workbook has no worksheet");
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "", blankrows: false });
  return attendanceRowsFromGrid(rows, salaryByEmployee);
}

export function attendanceRowsFromGrid(rows: string[][], salaryByEmployee = new Map<string, number>()): AttendanceImportResult {
  const period = readPeriod(rows);
  const headerIndex = rows.findIndex(row => normalized(row[0]) === "no." && normalized(row[1]) === "name");
  if (!period || headerIndex < 0) throw new Error("Attendance file format not recognized");
  const header = rows[headerIndex];
  const dayColumns = header
    .map((value, index) => ({ day: Number(value), index }))
    .filter(column => Number.isInteger(column.day) && column.day >= 1 && column.day <= period.dayCount);
  if (!dayColumns.length) throw new Error("Attendance file has no day columns");

  const dailyRows: Array<Record<string, string>> = [];
  const absenceRows: Array<Record<string, string>> = [];
  const employeeCodes = new Set<string>();
  rows.slice(headerIndex + 2).forEach(row => {
    const employeeNo = String(row[0] || "").trim();
    const employee = String(row[1] || "").trim();
    if (!employeeNo || !employee) return;
    employeeCodes.add(employeeNo);
    const salary = salaryByEmployee.get(normalized(employee)) ?? salaryByEmployee.get(normalized(employeeNo)) ?? 0;
    const dailyRate = salary / period.dayCount;
    dayColumns.forEach(({ day, index }) => {
      const punches = punchTimes(row[index]);
      const date = new Date(period.year, period.month - 1, day);
      const dateText = displayDate(date);
      const suffix = `${period.year}${String(period.month).padStart(2, "0")}${String(day).padStart(2, "0")}-${employeeNo}`;
      const hours = punches.length >= 2 ? workedHours(punches[0], punches[punches.length - 1]) : 0;
      dailyRows.push({
        Record: `ATT-${suffix}`,
        Employee: employee,
        Date: dateText,
        Shift: "General",
        "Check in": punches[0] ?? "",
        "Check out": punches[1] ?? "",
        Hours: punches.length >= 2 ? hours.toFixed(2) : "0",
        Overtime: punches.length >= 2 ? Math.max(0, hours - 8).toFixed(2) : "0",
        Status: punches.length ? "Present" : "Absent"
      });
      if (!punches.length) {
        absenceRows.push({
          Absence: `ABS-${suffix}`,
          Employee: employee,
          Date: dateText,
          Type: "Unapproved absence",
          Days: "1",
          Hours: "8",
          Reason: "No punch recorded in attendance import",
          "Payroll impact": qar(dailyRate),
          Status: "Deducted"
        });
      }
    });
  });
  return { dailyRows, absenceRows, period: period.label, dayCount: period.dayCount, employeeCount: employeeCodes.size };
}

function readPeriod(rows: string[][]) {
  const text = rows.flat().join(" ");
  const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*~\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, , startMonth, startYear, endDay] = match.map(String);
  const year = Number(startYear);
  const month = Number(startMonth);
  const dayCount = Number(endDay) || new Date(year, month, 0).getDate();
  return { year, month, dayCount, label: new Date(year, month - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" }) };
}

function punchTimes(value?: string) {
  return Array.from(String(value || "").matchAll(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g), match => match[0]);
}

function workedHours(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  let endMinutes = endHour * 60 + endMinute;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  return (endMinutes - startMinutes) / 60;
}

function displayDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function normalized(value: string) {
  return String(value || "").trim().toLowerCase();
}

function qar(value: number) {
  return `QAR ${value.toLocaleString("en-QA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
