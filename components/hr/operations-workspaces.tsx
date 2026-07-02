"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Banknote, Calculator, CheckCircle2, Download, FileText, Plus, Search, Trash2, Upload, UsersRound, XCircle } from "lucide-react";
import { RecordModal, type RecordFieldSuggestion, type RecordFieldType } from "@/components/record-modal";
import { Button, EmptyState, StatusBadge } from "@/components/ui";
import { hasApprovedApproval, submitApprovalRequest } from "@/lib/approval-matrix";
import { parseAttendanceLog } from "@/lib/attendance-import";
import { appendAuditLog, useAuditLog } from "@/lib/audit-store";
import { downloadBlob } from "@/lib/client-download";
import { getDemoSession, PRESENTATION_USER_NAME } from "@/lib/demo-auth";
import { createDemoRecord, readDemoRecordsSnapshot, useDemoRecords, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { exportToExcel, exportWorkbookToExcel } from "@/lib/export/excel";
import { writeFinanceJournalDraft } from "@/lib/finance-workflow";
import { calculateNetPay, calculatePayrollItem, type PayrollEffect } from "@/lib/hr-calculations";
import { calculateLeaveSettlement, calculateMonthlyPayrollLine, validateMonthlyPayroll, type MonthlyPayrollLineInput, type MonthlyPayrollSettings } from "@/lib/payroll-calculations";
import { applyLoanDeductions, buildLoanSchedule, cancelLoan, loanBalance, loanInstallmentCount, markPayrollInstallmentsDeducted, parseLoanSchedule, pendingLoanDeduction, postponeInstallment, refreshCompletedLoans, releasePayrollInstallments, type LoanRecord } from "@/lib/payroll-loans";
import { buildSifCsv, defaultSifSettings, sifFileName, validateSifExport, type SifEmployeeMaster, type SifPayrollLine, type SifRunContext, type SifValidationError } from "@/lib/sif-export";
import { buildWpsRows, buildWpsSummaryRows, defaultWpsColumns, validateWpsExport, type WpsValidationError } from "@/lib/wps-export";
import { attendanceViews, leaveViews, payrollModules, payrollViews, recruitmentViews, type HrOperationalView } from "@/lib/hr-operations-data";
import { hrEmployees, hrViews } from "@/lib/hr-data";
import type { PdfTemplate } from "@/lib/pdf/generator";
import { cn } from "@/lib/utils";
import { permissionError, segregationWarning } from "@/lib/erp-security";

export function RecruitmentWorkspace() {
  return <OperationsWorkspace area="Recruitment" views={recruitmentViews} template={tab => tab === "Offer Letters" ? "offer_letter" : tab === "Manpower Planning" ? "approval_to_hire" : tab === "Vacancy Requests" ? "hiring_approval" : "report"} />;
}

export function AttendanceWorkspace() {
  const dailyStore = useDemoRecords("hr-operations:Attendance:Daily Attendance", attendanceViews["Daily Attendance"].rows);
  const absenceStore = useDemoRecords("hr-operations:Attendance:Absence Monitoring", attendanceViews["Absence Monitoring"].rows);
  const importRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState("All");
  const [department, setDepartment] = useState("All");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const dates = useMemo(() => Array.from(new Set(dailyStore.records.map(row => row.Date).filter(Boolean))).sort((a, b) => dateSortValue(b).localeCompare(dateSortValue(a))), [dailyStore.records]);
  const enriched = useMemo(() => dailyStore.records.map(row => ({ row, meta: employeeMeta(row.Employee) })), [dailyStore.records]);
  const baseFiltered = useMemo(() => enriched.filter(item => {
    const row = item.row;
    return (date === "All" || row.Date === date) && (!query || [row.Employee, item.meta.department, row.Date, row.Status].some(value => value.toLowerCase().includes(query.toLowerCase())));
  }), [enriched, date, query]);
  const departments = useMemo(() => Array.from(new Set(baseFiltered.map(item => item.meta.department))).sort(), [baseFiltered]);
  const filtered = useMemo(() => baseFiltered
    .filter(item => (department === "All" || item.meta.department === department) && (status === "All" || attendanceSeverity(item.row.Status) === status))
    .sort((a, b) => a.meta.department.localeCompare(b.meta.department) || a.row.Employee.localeCompare(b.row.Employee) || dateSortValue(a.row.Date).localeCompare(dateSortValue(b.row.Date))), [baseFiltered, department, status]);
  const grouped = useMemo(() => groupBy(filtered, item => item.meta.department), [filtered]);
  const present = filtered.filter(item => attendanceSeverity(item.row.Status) === "Present").length;
  const absent = filtered.filter(item => attendanceSeverity(item.row.Status) === "Absent").length;
  const late = filtered.filter(item => attendanceSeverity(item.row.Status) === "Late").length;
  const payrollImpact = filtered.filter(item => attendanceSeverity(item.row.Status) === "Absent").reduce((sum, item) => sum + payrollImpactForAbsence(item.row, absenceStore.records), 0);
  const importAttendance = async (file?: File) => {
    if (!file) return;
    try {
      const result = await parseAttendanceLog(file, employeeSalaryMap());
      dailyStore.upsertMany("Record", result.dailyRows);
      absenceStore.upsertMany("Absence", result.absenceRows);
      appendAuditLog({ action: "IMPORT", module: "Human Resources - Attendance", record: file.name, details: `${result.employeeCount} employees, ${result.dayCount} days imported for ${result.period}` });
      notify(`${result.employeeCount} employees imported for ${result.period}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Attendance import failed");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };
  const exportRows = () => {
    exportToExcel(filtered.map(({ row, meta }) => ({ Department: meta.department, Employee: row.Employee, Date: row.Date, "Check in": row["Check in"], "Check out": row["Check out"], Hours: row.Hours, Status: row.Status, "Approval Decision": attendanceDecision(row) })), "medtech-attendance-department-view", "Attendance");
    notify("Attendance export generated");
  };
  const setPresence = (record: DemoRecord, nextStatus: "Present" | "Absent") => {
    dailyStore.update(record.__id, nextStatus === "Present"
      ? { Status: "Present", "Check in": record["Check in"] || "08:00", "Check out": record["Check out"] || "17:00", Hours: record.Hours === "0" ? "8.00" : record.Hours || "8.00", "Approval Decision": "", "Approval By": "", "Approval Date": "" }
      : { Status: "Absent", "Check in": "", "Check out": "", Hours: "0", Overtime: "0", "Approval Decision": "", "Approval By": "", "Approval Date": "" });
    notify(`${record.Employee} marked ${nextStatus.toLowerCase()}`);
  };
  const saveDecision = (record: DemoRecord, decision: "Approve" | "Not Approved") => {
    const approver = getDemoSession()?.name || PRESENTATION_USER_NAME;
    dailyStore.update(record.__id, { "Approval Decision": decision, "Approval By": approver, "Approval Date": new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) });
    appendAuditLog({ action: "ATTENDANCE DECISION", module: "Human Resources - Attendance", record: record.Record || `${record.Employee} ${record.Date}`, details: `${record.Status} marked ${decision} by ${approver}` });
    notify(`${record.Employee} marked ${decision.toLowerCase()}`);
  };
  return <div className="space-y-4">
    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="border-b bg-slate-50/70 p-4 dark:bg-slate-900/30">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight">Attendance Control</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Department view of present, absent and payroll-impacting attendance records.</p>
          </div>
          <div className="flex flex-wrap gap-2 xl:ml-auto">
            <input ref={importRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={event => importAttendance(event.target.files?.[0])} />
            <Button variant="secondary" onClick={() => importRef.current?.click()}><Upload className="h-4 w-4" />Import file</Button>
            <Button variant="secondary" onClick={exportRows}><Download className="h-4 w-4" />Excel</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <AttendanceMetric label="Present" value={present} tone="present" />
          <AttendanceMetric label="Absent" value={absent} tone="absent" />
          <AttendanceMetric label="Late" value={late} tone="late" />
          <AttendanceMetric label="Payroll impact" value={qar(payrollImpact)} tone="payroll" />
        </div>
      </div>
      <div className="grid min-h-[620px] xl:grid-cols-[260px_1fr_310px]">
        <aside className="border-b bg-white p-3 dark:bg-slate-950/20 xl:border-b-0 xl:border-r">
          <div className="mb-3 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Departments</div>
          <select aria-label="Filter attendance by department" value={department} onChange={event => setDepartment(event.target.value)} className="mb-3 h-10 w-full rounded-lg border bg-[var(--panel)] px-3 text-xs xl:hidden"><option value="All">All departments</option>{departments.map(name => <option key={name}>{name}</option>)}</select>
          <DepartmentButton active={department === "All"} name="All departments" count={baseFiltered.length} present={baseFiltered.filter(item => attendanceSeverity(item.row.Status) === "Present").length} onClick={() => setDepartment("All")} />
          {departments.map(name => {
            const rows = baseFiltered.filter(item => item.meta.department === name);
            return <DepartmentButton key={name} active={department === name} name={name} count={rows.length} present={rows.filter(item => attendanceSeverity(item.row.Status) === "Present").length} onClick={() => setDepartment(name)} />;
          })}
        </aside>
        <main className="min-w-0 border-b xl:border-b-0 xl:border-r">
          <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search attendance" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search employee, department or status..." className="h-10 w-full rounded-lg border bg-transparent pl-9 pr-3 text-sm outline-none focus:border-medtech-red" />
            </div>
            <select aria-label="Attendance date" value={date} onChange={event => setDate(event.target.value)} className="h-10 rounded-lg border bg-[var(--panel)] px-3 text-xs"><option>All</option>{dates.map(value => <option key={value}>{value}</option>)}</select>
            <select aria-label="Attendance status" value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-lg border bg-[var(--panel)] px-3 text-xs"><option>All</option><option>Present</option><option>Late</option><option>Absent</option></select>
          </div>
          <div className="max-h-[560px] overflow-auto">
            {filtered.length ? Array.from(grouped.entries()).map(([name, items]) => <section key={name} className="border-b last:border-b-0">
              <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-slate-50/95 px-4 py-2 backdrop-blur dark:bg-slate-900/95">
                <UsersRound className="h-4 w-4 text-medtech-red" />
                <div className="font-semibold">{name}</div>
                <div className="ml-auto text-[11px] text-[var(--muted)]">{items.filter(item => attendanceSeverity(item.row.Status) === "Present").length} present / {items.length}</div>
              </div>
              <div className="space-y-2 p-3 lg:hidden">{items.map(({ row, meta }) => <div key={row.__id} className="rounded-lg border bg-[var(--panel)] p-3">
                <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{row.Employee}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{meta.code} · {meta.title}</div></div><AttendanceStatus status={row.Status} /></div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]"><div><span className="block text-[10px] uppercase text-slate-400">Date</span>{row.Date}</div><div><span className="block text-[10px] uppercase text-slate-400">In</span>{row["Check in"] || "-"}</div><div><span className="block text-[10px] uppercase text-slate-400">Out</span>{row["Check out"] || "-"}</div><div><span className="block text-[10px] uppercase text-slate-400">Hours</span>{row.Hours || "0"}</div></div>
                {attendanceNeedsDecision(row) && <AttendanceExceptionDetail row={row} absences={absenceStore.records} onDecision={saveDecision} />}
                <div className="mt-3 flex gap-2"><button onClick={() => setPresence(row, "Present")} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" />Present</button><button onClick={() => setPresence(row, "Absent")} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-semibold text-rose-700 hover:bg-rose-50"><XCircle className="h-4 w-4" />Absent</button></div>
              </div>)}</div>
              <table className="hidden w-full table-fixed text-left text-xs lg:table">
                <thead className="bg-white text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-950/30"><tr>{["Employee", "Date", "Punch in", "Punch out", "Hours", "Status", "Approval", "Action"].map((label, index) => <th key={label} className={cn("px-3 py-2 font-bold", index === 0 && "w-[22%]", index === 1 && "w-[12%]", index > 1 && index < 5 && "w-[9%]", index === 5 && "w-[12%]", index === 6 && "w-[18%]", index === 7 && "w-[11%]")}>{label}</th>)}</tr></thead>
                <tbody className="divide-y">{items.map(({ row, meta }) => <Fragment key={row.__id}>
                  <tr key={`${row.__id}-row`} className={cn("hover:bg-slate-50/80 dark:hover:bg-slate-900/40", attendanceRowClass(row.Status))}>
                    <td className="px-3 py-3"><div className="truncate font-semibold">{row.Employee}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{meta.code} · {meta.title}</div></td>
                    <td className="px-3 py-3 text-[var(--muted)]">{row.Date}</td>
                    <td className="px-3 py-3 font-medium">{row["Check in"] || "-"}</td>
                    <td className="px-3 py-3 font-medium">{row["Check out"] || "-"}</td>
                    <td className="px-3 py-3">{row.Hours || "0"}</td>
                    <td className="px-3 py-3"><AttendanceStatus status={row.Status} /></td>
                    <td className="px-3 py-3">{attendanceNeedsDecision(row) ? <AttendanceDecisionBadge row={row} /> : <span className="text-slate-400">-</span>}</td>
                    <td className="px-3 py-3"><div className="flex gap-1"><button title="Mark present" onClick={() => setPresence(row, "Present")} className="grid h-8 w-8 place-items-center rounded-lg border text-emerald-600 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></button><button title="Mark absent" onClick={() => setPresence(row, "Absent")} className="grid h-8 w-8 place-items-center rounded-lg border text-rose-600 hover:bg-rose-50"><XCircle className="h-4 w-4" /></button></div></td>
                  </tr>
                  {attendanceNeedsDecision(row) && <tr key={`${row.__id}-detail`} className={attendanceRowClass(row.Status)}><td colSpan={8} className="px-3 pb-3"><AttendanceExceptionDetail row={row} absences={absenceStore.records} onDecision={saveDecision} /></td></tr>}
                </Fragment>)}</tbody>
              </table>
            </section>) : <EmptyState title="No attendance records found" description="Adjust filters or import the biometric attendance file." />}
          </div>
        </main>
        <aside className="bg-white p-4 dark:bg-slate-950/20">
          <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-rose-600" /><h3 className="font-bold">Payroll impact</h3></div>
          <p className="mt-1 text-xs text-[var(--muted)]">Deducted absences linked into payroll.</p>
          <div className="mt-4 space-y-2">{absenceStore.records.slice(0, 9).map(row => <div key={row.__id} className="rounded-lg border p-3">
            <div className="flex gap-2"><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{row.Employee}</div><div className="mt-0.5 text-[10px] text-slate-400">{row.Date} · {row.Type}</div></div><div className="text-right text-xs font-bold text-rose-600">{row["Payroll impact"]}</div></div>
          </div>)}</div>
        </aside>
      </div>
    </section>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel"><CheckCircle2 className="h-4 w-4 text-red-300" />{toast}</div>}
  </div>;
}

function AttendanceMetric({ label, value, tone }: { label: string; value: string | number; tone: "present" | "absent" | "late" | "payroll" }) {
  const colors = { present: "border-emerald-200 bg-emerald-50 text-emerald-700", absent: "border-rose-200 bg-rose-50 text-rose-700", late: "border-amber-200 bg-amber-50 text-amber-700", payroll: "border-violet-200 bg-violet-50 text-violet-700" };
  return <div className={cn("rounded-xl border p-3", colors[tone])}><div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>;
}

function DepartmentButton({ active, name, count, present, onClick }: { active: boolean; name: string; count: number; present: number; onClick: () => void }) {
  const pct = count ? Math.round((present / count) * 100) : 0;
  return <button onClick={onClick} className={cn("mb-2 w-full rounded-xl border p-3 text-left transition", active ? "border-medtech-red/40 bg-[var(--navy-tint)] text-medtech-deep dark:border-medtech-navy/50 dark:bg-[var(--elevated)] dark:text-red-100" : "bg-[var(--panel)] hover:border-slate-300")}>
    <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-xs font-bold">{name}</span><span className="text-[10px] text-[var(--muted)]">{count}</span></div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-medtech-red" style={{ width: `${pct}%` }} /></div>
    <div className="mt-1.5 text-[10px] text-[var(--muted)]">{present} present · {count - present} exceptions</div>
  </button>;
}

function AttendanceStatus({ status }: { status?: string }) {
  const group = attendanceSeverity(status);
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1", group === "Present" && "bg-emerald-50 text-emerald-700 ring-emerald-600/15", group === "Late" && "bg-amber-50 text-amber-700 ring-amber-600/20", group === "Absent" && "bg-rose-50 text-rose-700 ring-rose-600/15")}>{status || "Absent"}</span>;
}

function AttendanceDecisionBadge({ row }: { row: DemoRecord }) {
  const decision = attendanceDecision(row);
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1", decision === "Approve" && "bg-emerald-50 text-emerald-700 ring-emerald-600/15", decision === "Not Approved" && "bg-rose-50 text-rose-700 ring-rose-600/15", decision === "Pending" && "bg-slate-100 text-slate-600 ring-slate-300/50")}>{decision}</span>;
}

function AttendanceExceptionDetail({ row, absences, onDecision }: { row: DemoRecord; absences: DemoRecord[]; onDecision: (record: DemoRecord, decision: "Approve" | "Not Approved") => void }) {
  const severity = attendanceSeverity(row.Status);
  const match = attendanceAbsence(row, absences);
  const detail = severity === "Absent"
    ? `Absent: no valid attendance punches for ${row.Date}. ${match?.Reason ? `Reason: ${match.Reason}.` : "Review before payroll processing."}`
    : `Late: check-in recorded at ${row["Check in"] || "-"}. ${match?.Reason ? `Reason: ${match.Reason}.` : "Review whether this is approved late arrival."}`;
  return <div className={cn("mt-3 rounded-lg border p-3", severity === "Late" ? "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100" : "border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-100")}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1"><div className="text-xs font-semibold">{detail}</div><div className="mt-1 text-[11px] opacity-75">Decision: {attendanceDecision(row)}{row["Approval By"] ? ` by ${row["Approval By"]}` : ""}{row["Approval Date"] ? ` on ${row["Approval Date"]}` : ""}</div></div>
      <div className="flex gap-2"><button onClick={() => onDecision(row, "Approve")} className="rounded-lg border bg-[var(--panel)] px-3 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">Approve</button><button onClick={() => onDecision(row, "Not Approved")} className="rounded-lg border bg-[var(--panel)] px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">Not Approved</button></div>
    </div>
  </div>;
}

function attendanceSeverity(status?: string): "Present" | "Late" | "Absent" {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("absent") || normalized.includes("unapproved absence")) return "Absent";
  if (normalized.includes("late")) return "Late";
  return "Present";
}

function attendanceNeedsDecision(row: Record<string, string>) {
  return attendanceSeverity(row.Status) !== "Present";
}

function attendanceDecision(row: Record<string, string>) {
  return row["Approval Decision"] === "Approve" || row["Approval Decision"] === "Not Approved" ? row["Approval Decision"] : "Pending";
}

function attendanceRowClass(status?: string) {
  const severity = attendanceSeverity(status);
  if (severity === "Late") return "bg-amber-50/45 dark:bg-amber-950/10";
  if (severity === "Absent") return "bg-rose-50/50 dark:bg-rose-950/10";
  return "";
}

function attendanceAbsence(row: Record<string, string>, absences: DemoRecord[]) {
  return absences.find(absence => absence.Employee === row.Employee && absence.Date === row.Date);
}

function employeeMeta(name?: string) {
  const employee = hrEmployees.find(row => row["Full Name"].toLowerCase() === String(name || "").toLowerCase());
  return { department: employee?.Department || "Unassigned", title: employee?.["Job Title"] || "Attendance import", code: employee?.["Employee No"] || "External" };
}

function payrollImpactForAbsence(row: Record<string, string>, absences: DemoRecord[]) {
  const match = attendanceAbsence(row, absences);
  return numberValue(match?.["Payroll impact"]);
}

export function LeaveWorkspace() {
  return <OperationsWorkspace area="Leave" views={leaveViews} template={tab => tab === "Applications" || tab === "Approvals" ? "leave_approval" : tab === "Clearance" ? "clearance_certificate" : "employee_letter"} transformSave={transformLeaveSave} />;
}

interface OperationsProps {
  area: string;
  views: Record<string, HrOperationalView>;
  template: (tab: string) => PdfTemplate;
  transformSave?: (values: Record<string, string>) => Record<string, string>;
}

function OperationsWorkspace({ area, views, template, transformSave }: OperationsProps) {
  const tabs = Object.keys(views);
  const [active, setActive] = useState(tabs[0]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sortColumn, setSortColumn] = useState("");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DemoRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [rejoinReturnFrom, setRejoinReturnFrom] = useState("");
  const [rejoinReturnTo, setRejoinReturnTo] = useState("");
  const [rejoinActualFrom, setRejoinActualFrom] = useState("");
  const [rejoinActualTo, setRejoinActualTo] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const view = views[active];
  const store = useDemoRecords(`hr-operations:${area}:${active}`, view.rows);
  const modalFieldTypes = useMemo(() => fieldTypesFor(area, active), [area, active]);
  const modalSuggestions = useMemo(() => suggestionsFor(area, active), [area, active]);
  const statusValues = useMemo(() => Array.from(new Set(store.records.map(row => row.Status).filter(Boolean))).sort(), [store.records]);
  const filtered = useMemo(() => store.records.filter(row => {
    const searchMatch = !query || Object.values(row).some(value => value?.toLowerCase().includes(query.toLowerCase()));
    const statusMatch = status === "All" || row.Status === status;
    const rejoinMatch = active !== "Rejoin" || (dateInRange(row["Original return date"], rejoinReturnFrom, rejoinReturnTo) && dateInRange(row["Actual rejoin date"], rejoinActualFrom, rejoinActualTo));
    return searchMatch && statusMatch && rejoinMatch;
  }).sort((a,b) => {
    const left = a[sortColumn] || "";
    const right = b[sortColumn] || "";
    const comparison = isDateColumn(sortColumn) ? dateSortValue(left).localeCompare(dateSortValue(right)) : left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
    return direction === "asc" ? comparison : -comparison;
  }), [store.records, query, status, active, rejoinReturnFrom, rejoinReturnTo, rejoinActualFrom, rejoinActualTo, sortColumn, direction]);
  const selected = store.records.filter(row => selectedIds.includes(row.__id));
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const firstColumn = view.columns[0];
  const changeTab = (tab: string) => { setActive(tab); setQuery(""); setStatus("All"); setSortColumn(""); setSelectedIds([]); setSelectedRecord(null); setModalOpen(false); setRejoinReturnFrom(""); setRejoinReturnTo(""); setRejoinActualFrom(""); setRejoinActualTo(""); };
  const toggleSort = (column: string) => { if (sortColumn === column) setDirection(value => value === "asc" ? "desc" : "asc"); else { setSortColumn(column); setDirection("asc"); } };
  const save = (input: Record<string,string>) => {
    const validation = validateOperationRecord(area, active, input);
    if (validation) {
      notify(validation);
      return;
    }
    const values = area === "Leave" && active === "Annual Planner" ? normalizeLeavePlan(input) : transformSave ? transformSave(input) : input;
    if (selectedRecord) store.update(selectedRecord.__id, values); else store.create(values);
    appendAuditLog({ action: selectedRecord ? "UPDATE" : "CREATE", module: `Human Resources - ${area}`, record: values[firstColumn] || active, details: `${active} record ${selectedRecord ? "updated" : "created"}` });
    setModalOpen(false);
    setSelectedRecord(null);
    notify(`${active} record saved`);
  };
  const open = (record?: DemoRecord) => { setSelectedRecord(record || null); setModalOpen(true); };
  const deleteSelected = () => { if (!selected.length) return; selected.forEach(record => store.remove(record.__id)); if (area === "Leave" && active === "Applications") removeLinkedLeaveRecords(selected.map(record => record.Request).filter(Boolean)); appendAuditLog({ action: "DELETE", module: `Human Resources - ${area}`, record: selected.map(record => record[firstColumn]).join(", "), details: `${selected.length} ${active} record${selected.length === 1 ? "" : "s"} deleted` }); setSelectedIds([]); notify(`${selected.length} ${active.toLowerCase()} record${selected.length === 1 ? "" : "s"} deleted`); };
  const remove = () => { if (!selectedRecord) return; store.remove(selectedRecord.__id); if (area === "Leave" && active === "Applications") removeLinkedLeaveRecords([selectedRecord.Request].filter(Boolean)); appendAuditLog({ action: "ARCHIVE", module: `Human Resources - ${area}`, record: selectedRecord[firstColumn], details: `${active} record archived` }); setModalOpen(false); setSelectedRecord(null); notify("Record archived"); };
  const exportRows = () => { exportToExcel(filtered.map(row => Object.fromEntries(view.columns.map(column => [column,row[column] || ""]))), `medtech-${area}-${active}`.toLowerCase().replaceAll(" ","-"), active); appendAuditLog({ action: "EXPORT", module: `Human Resources - ${area}`, record: active, details: `${filtered.length} records exported` }); notify("Excel export generated"); };
  const importAttendance = async (file?: File) => {
    if (!file || area !== "Attendance" || active !== "Daily Attendance") return;
    try {
      const result = await parseAttendanceLog(file, employeeSalaryMap());
      store.upsertMany("Record", result.dailyRows);
      upsertSnapshot("hr-operations:Attendance:Absence Monitoring", attendanceViews["Absence Monitoring"].rows, "Absence", result.absenceRows);
      appendAuditLog({ action: "IMPORT", module: "Human Resources - Attendance", record: file.name, details: `${result.employeeCount} employees, ${result.dayCount} days imported for ${result.period}` });
      notify(`${result.dailyRows.length} attendance rows imported; ${result.absenceRows.length} absences linked to payroll`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Attendance import failed");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };
  const downloadPdf = async () => { if (!selected.length) return; try { const { generateBrandedPdf } = await import("@/lib/pdf/generator"); const record = selected[0]; const documentNumber = (record[firstColumn] || active).replace(/[^a-z0-9-]+/gi,"-"); const pdfColumns = view.formColumns ?? view.columns; const result = await generateBrandedPdf({ template: template(active), documentNumber, date: new Intl.DateTimeFormat("en-GB",{dateStyle:"long"}).format(new Date()), partyLabel: record.Employee || record.Candidate ? "Employee / Candidate" : area, partyName: record.Employee || record.Candidate || record[firstColumn] || active, subject: `${active} details`, metadata: selected.flatMap(item => pdfColumns.map(column => [selected.length > 1 ? `${item[firstColumn]} - ${column}` : column,item[column] || "-"] as [string,string])), terms: ["Generated from the controlled MedTech HR workspace.","Verify approvals before external issue."], preparedBy: getDemoSession()?.name || PRESENTATION_USER_NAME, approvedBy: "HR Manager" },"blob"); if (!(result instanceof Blob)) throw new Error("PDF generator did not return a file"); const url=URL.createObjectURL(result); const anchor=document.createElement("a"); anchor.href=url; anchor.download=`${documentNumber}-${active.toLowerCase().replaceAll(" ","-")}.pdf`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1000); appendAuditLog({ action:"PDF",module:`Human Resources - ${area}`,record:documentNumber,details:`${active} detailed PDF generated` }); notify("Detailed PDF generated"); } catch { notify("Unable to generate PDF. Please try again."); } };
  const leaveApplicationMode = area === "Leave" && active === "Applications";

  const stageCounts = active === "Candidates" ? ["New","Screening","Interview","Shortlisted","Offer","Hired"].map(stage => [stage, store.records.filter(row => row.Status === stage).length] as const) : [];
  return <div className="space-y-4">
    <section className="rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex gap-1 overflow-x-auto border-b px-3">{tabs.map(tab => <button key={tab} data-testid={`${area.toLowerCase()}-subtab-${tab.toLowerCase().replaceAll(" ","-")}`} onClick={() => changeTab(tab)} className={cn("relative whitespace-nowrap px-3 py-3 text-xs font-semibold",active===tab?"text-medtech-navy":"text-[var(--muted)]")}>{tab}{active===tab&&<span className="absolute inset-x-2 bottom-0 h-0.5 bg-medtech-red"/>}</button>)}</div>
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center"><div><h2 className="text-base font-bold">{active}</h2><p className="mt-1 text-xs text-[var(--muted)]">{view.helper}</p></div><Button className="lg:ml-auto" onClick={() => open()}><Plus className="h-4 w-4"/>{view.primaryAction}</Button></div>
    </section>
    {stageCounts.length>0&&<section className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">{stageCounts.map(([stage,count])=><button key={stage} onClick={()=>setStatus(stage)} className="rounded-xl border bg-[var(--panel)] p-3 text-left shadow-soft"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{stage}</div><div className="mt-1 text-xl font-bold">{count}</div></button>)}</section>}
    {area === "Leave" && active === "Annual Planner" ? <AnnualLeavePlanner plans={store.records} onOpenPlan={open} /> : <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex flex-wrap items-center gap-2 border-b p-3"><div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input aria-label={`Search ${active}`} value={query} onChange={event=>setQuery(event.target.value)} placeholder={`Search ${active.toLowerCase()}...`} className="h-9 w-full rounded-lg border bg-transparent pl-9 pr-3 text-sm outline-none focus:border-medtech-red"/></div>{statusValues.length>0&&<select aria-label={`Filter ${active} by status`} value={status} onChange={event=>setStatus(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"><option value="All">All statuses</option>{statusValues.map(value=><option key={value}>{value}</option>)}</select>}{active==="Rejoin"&&<><input aria-label="Filter original return date from" type="date" value={rejoinReturnFrom} onChange={event=>setRejoinReturnFrom(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"/><input aria-label="Filter original return date to" type="date" value={rejoinReturnTo} onChange={event=>setRejoinReturnTo(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"/><input aria-label="Filter actual rejoin date from" type="date" value={rejoinActualFrom} onChange={event=>setRejoinActualFrom(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"/><input aria-label="Filter actual rejoin date to" type="date" value={rejoinActualTo} onChange={event=>setRejoinActualTo(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"/></>}<div className="ml-auto flex gap-2">{area==="Leave"&&active==="Applications"&&selected.length>0&&<Button variant="danger" onClick={deleteSelected}><Trash2 className="h-4 w-4"/>Delete ({selected.length})</Button>}{selected.length>0&&<Button variant="secondary" onClick={downloadPdf}><FileText className="h-4 w-4"/>PDF ({selected.length})</Button>}{area==="Attendance"&&active==="Daily Attendance"&&<><input ref={importRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={event=>importAttendance(event.target.files?.[0])}/><Button variant="secondary" onClick={()=>importRef.current?.click()}><Upload className="h-4 w-4"/>Import</Button></>}<Button variant="secondary" onClick={exportRows}><Download className="h-4 w-4"/>Excel</Button></div></div>
      {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40"><th className="w-12 px-4 py-3"><input aria-label={`Select all ${active}`} type="checkbox" checked={filtered.length>0&&filtered.every(row=>selectedIds.includes(row.__id))} onChange={()=>setSelectedIds(current=>filtered.every(row=>current.includes(row.__id))?current.filter(id=>!filtered.some(row=>row.__id===id)):Array.from(new Set([...current,...filtered.map(row=>row.__id)])))} className="accent-medtech-red"/></th>{view.columns.map(column=><th key={column} className="px-4 py-3"><button onClick={()=>toggleSort(column)} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{column}{sortColumn===column?(direction==="asc"?<ArrowUp className="h-3 w-3"/>:<ArrowDown className="h-3 w-3"/>):<ArrowUpDown className="h-3 w-3 opacity-40"/>}</button></th>)}<th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Action</th></tr></thead><tbody className="divide-y">{filtered.map(row=><tr key={row.__id} onDoubleClick={()=>open(row)} className={cn("cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40",selectedIds.includes(row.__id)&&"bg-[var(--navy-tint)] dark:bg-[var(--elevated)]")}><td className="px-4 py-3"><input aria-label={`Select ${row[firstColumn]}`} type="checkbox" checked={selectedIds.includes(row.__id)} onChange={()=>setSelectedIds(current=>current.includes(row.__id)?current.filter(id=>id!==row.__id):[...current,row.__id])} className="accent-medtech-red"/></td>{view.columns.map((column,index)=><td key={column} className={cn("px-4 py-3 text-xs",index===0?"font-semibold":"text-[var(--muted)]")}>{column==="Status"?<StatusBadge>{row[column]}</StatusBadge>:row[column]}</td>)}<td className="px-4 py-3"><button onClick={()=>open(row)} className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold text-medtech-navy hover:bg-[var(--navy-tint)] dark:hover:bg-[var(--red-tint)]">View</button></td></tr>)}</tbody></table></div> : <EmptyState title={`No ${active.toLowerCase()} found`} description="Adjust the search or filters, or create a new record." />}
      <div className="flex justify-between border-t px-4 py-3 text-[11px] text-slate-400"><span>{selected.length?`${selected.length} selected - `:""}Showing {filtered.length} of {store.records.length}</span><span>Use View or double-click a row to edit</span></div>
    </section>}
    <RecordModal open={modalOpen} title={selectedRecord?`Edit ${active}`:view.primaryAction} columns={view.columns} formColumns={view.formColumns} selectOptions={view.selectOptions} defaultValues={view.defaultValues} fieldTypes={modalFieldTypes} suggestions={modalSuggestions} record={selectedRecord} deriveValues={leaveApplicationMode ? deriveLeaveApplicationValues : undefined} preview={leaveApplicationMode ? values => <LeaveApplicationPreview values={values} /> : undefined} onClose={()=>{setModalOpen(false);setSelectedRecord(null);}} onSave={save} onDelete={selectedRecord?remove:undefined}/>
    {toast&&<div role="status" className="fixed bottom-5 right-5 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel"><CheckCircle2 className="h-4 w-4 text-red-300"/>{toast}</div>}
  </div>;
}

type LeavePlannerRow = {
  id: string;
  plan?: DemoRecord;
  source: "Planner" | "Application";
  planNo: string;
  employeeCode: string;
  employee: string;
  department: string;
  leaveType: string;
  from: string;
  to: string;
  days: string;
  status: string;
};

function AnnualLeavePlanner({ plans, onOpenPlan }: { plans: DemoRecord[]; onOpenPlan: (record?: DemoRecord) => void }) {
  const applications = useDemoRecords("hr-operations:Leave:Applications", leaveViews.Applications.rows);
  const session = getDemoSession();
  const canViewAll = canViewAllLeaveDepartments(session?.role);
  const ownDepartment = session?.department || "Executive";
  const [department, setDepartment] = useState("All");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => leavePlannerRows(plans, applications.records), [plans, applications.records]);
  const departments = useMemo(() => Array.from(new Set(rows.map(row => row.department).filter(Boolean))).sort(), [rows]);
  const visibleDepartment = canViewAll ? department : ownDepartment;
  const filtered = useMemo(() => rows.filter(row => {
    const departmentMatch = visibleDepartment === "All" || row.department === visibleDepartment;
    const statusMatch = status === "All" || row.status === status;
    const searchMatch = !query || [row.employee, row.employeeCode, row.department, row.leaveType, row.status].some(value => value.toLowerCase().includes(query.toLowerCase()));
    return departmentMatch && statusMatch && searchMatch;
  }).sort((a, b) => a.department.localeCompare(b.department) || dateSortValue(a.from).localeCompare(dateSortValue(b.from)) || a.employee.localeCompare(b.employee)), [rows, visibleDepartment, status, query]);
  const grouped = useMemo(() => groupBy(filtered, row => row.department || "Unassigned"), [filtered]);
  const statuses = useMemo(() => Array.from(new Set(rows.map(row => row.status).filter(Boolean))).sort(), [rows]);
  const overlapCount = filtered.filter(row => leavePlannerOverlaps(row, filtered).length > 0).length;
  const exportPlanner = () => {
    exportToExcel(filtered.map(row => ({
      "Employee Code": row.employeeCode,
      Employee: row.employee,
      Department: row.department,
      "Leave type": row.leaveType,
      From: row.from,
      To: row.to,
      Days: row.days,
      Status: row.status,
      Source: row.source
    })), "medtech-annual-leave-planner", "Annual Planner");
    appendAuditLog({ action: "EXPORT", module: "Human Resources - Leave", record: "Annual Planner", details: `${filtered.length} planner visibility rows exported` });
  };

  return <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
    <div className="border-b bg-slate-50/70 p-4 dark:bg-slate-900/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div><h3 className="text-base font-bold">Department leave visibility</h3><p className="mt-1 text-xs text-[var(--muted)]">Planning view only. Apply Leave remains the approval process.</p></div>
        <div className="grid gap-2 sm:grid-cols-3 lg:ml-auto lg:w-[420px]">
          <PlannerMetric label="Rows" value={filtered.length} />
          <PlannerMetric label="Departments" value={visibleDepartment === "All" ? departments.length : 1} />
          <PlannerMetric label="Overlaps" value={overlapCount} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search annual leave planner" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search employee, code, department..." className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-medtech-red" /></div>
        <select aria-label="Filter annual leave by department" value={visibleDepartment} disabled={!canViewAll} onChange={event => setDepartment(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs disabled:opacity-70">{canViewAll && <option value="All">All departments</option>}{(canViewAll ? departments : [ownDepartment]).map(name => <option key={name}>{name}</option>)}</select>
        <select aria-label="Filter annual leave by status" value={status} onChange={event => setStatus(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"><option value="All">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select>
        <Button variant="secondary" onClick={exportPlanner}><Download className="h-4 w-4" />Excel</Button>
      </div>
    </div>
    <div className="max-h-[620px] overflow-auto">
      {filtered.length ? Array.from(grouped.entries()).map(([name, items]) => <section key={name} className="border-b last:border-b-0">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-slate-50/95 px-4 py-2 backdrop-blur dark:bg-slate-900/95"><UsersRound className="h-4 w-4 text-medtech-red" /><div className="font-semibold">{name}</div><div className="ml-auto text-[11px] text-[var(--muted)]">{items.length} leave plan{items.length === 1 ? "" : "s"}</div></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead><tr className="border-b bg-white text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-950/30">{["Employee", "Department", "Leave dates", "Days", "Leave type", "Status", "Overlap", "Source"].map(label => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead>
            <tbody className="divide-y">{items.map(row => {
              const overlaps = leavePlannerOverlaps(row, rows);
              return <tr key={row.id} className={cn("hover:bg-slate-50/80 dark:hover:bg-slate-900/40", overlaps.length && "bg-amber-50/45 dark:bg-amber-950/10")}>
                <td className="px-4 py-3"><div className="font-semibold">{row.employee}</div><div className="mt-0.5 text-[10px] text-slate-400">{row.employeeCode}</div></td>
                <td className="px-4 py-3 text-[var(--muted)]">{row.department}</td>
                <td className="px-4 py-3"><div className="font-medium">{row.from}</div><div className="mt-0.5 text-[10px] text-slate-400">to {row.to}</div></td>
                <td className="px-4 py-3">{row.days}</td>
                <td className="px-4 py-3">{row.leaveType || "-"}</td>
                <td className="px-4 py-3"><StatusBadge>{row.status}</StatusBadge></td>
                <td className="px-4 py-3">{overlaps.length ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/20">{overlaps.map(item => item.employee).join(", ")}</span> : <span className="text-slate-400">None</span>}</td>
                <td className="px-4 py-3">{row.plan ? <button onClick={() => onOpenPlan(row.plan)} className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold text-medtech-navy hover:bg-[var(--navy-tint)]">Planner</button> : <span className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold text-slate-500">Apply Leave</span>}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>) : <EmptyState title="No leave plans found" description="Adjust filters or create a planner row for your department." />}
    </div>
  </section>;
}

function PlannerMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border bg-[var(--panel)] p-3"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-lg font-bold">{value}</div></div>;
}

function leavePlannerRows(plans: DemoRecord[], applications: DemoRecord[]): LeavePlannerRow[] {
  return [
    ...plans.map(row => {
      const employee = findEmployee(row["Employee Code"], row.Employee);
      return {
        id: `plan-${row.__id}`,
        plan: row,
        source: "Planner" as const,
        planNo: row.Plan || "",
        employeeCode: row["Employee Code"] || employee?.["Employee No"] || "",
        employee: row.Employee || employee?.["Full Name"] || "",
        department: row.Department || employee?.Department || "Unassigned",
        leaveType: row["Leave type"] || "Annual leave",
        from: row.From || "",
        to: row.To || row.From || "",
        days: row.Days || String(calculateInclusiveDays(row.From, row.To || row.From) || 1),
        status: leavePlannerStatus(row.Status)
      };
    }),
    ...applications.map(row => {
      const employee = findEmployee(row["Employee Code"], row.Employee);
      return {
        id: `application-${row.__id}`,
        source: "Application" as const,
        planNo: row.Request || "",
        employeeCode: row["Employee Code"] || employee?.["Employee No"] || "",
        employee: row.Employee || employee?.["Full Name"] || "",
        department: row.Department || employee?.Department || "Unassigned",
        leaveType: row["Leave type"] || "Annual leave",
        from: row.From || "",
        to: row.To || row.From || "",
        days: row.Days || String(calculateInclusiveDays(row.From, row.To || row.From) || 1),
        status: leavePlannerStatus(row.Status, true)
      };
    })
  ];
}

function leavePlannerStatus(status?: string, fromApplication = false) {
  if (status === "Approved" || status === "Rejected" || status === "Planned") return status;
  return fromApplication ? "Applied" : "Planned";
}

function leavePlannerOverlaps(row: LeavePlannerRow, rows: LeavePlannerRow[]) {
  return rows.filter(item => item.id !== row.id && item.department === row.department && leaveDateRangesOverlap(row, item));
}

function leaveDateRangesOverlap(left: LeavePlannerRow, right: LeavePlannerRow) {
  const leftFrom = dateFromValue(left.from);
  const leftTo = dateFromValue(left.to);
  const rightFrom = dateFromValue(right.from);
  const rightTo = dateFromValue(right.to);
  if (!leftFrom || !leftTo || !rightFrom || !rightTo) return false;
  return leftFrom <= rightTo && rightFrom <= leftTo;
}

function canViewAllLeaveDepartments(role?: string) {
  const normalized = String(role || "").toLowerCase();
  return normalized.includes("admin") || normalized.includes("hr");
}

function LeaveApplicationPreview({ values }: { values: Record<string, string> }) {
  const warning = leaveBalanceWarning(values);
  return <div className={cn("sm:col-span-2 rounded-xl border p-4", warning ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100" : "bg-slate-50 dark:bg-slate-900/40")}>
    <div className="grid gap-3 sm:grid-cols-3">
      <PreviewStat label="Available balance" value={values["Available balance"] || "0 days"} />
      <PreviewStat label="Selected days" value={`${numberValue(values.Days)} days`} />
      <PreviewStat label="Remaining balance" value={values["Remaining balance"] || "0 days"} />
    </div>
    {warning && <div className="mt-3 text-xs font-semibold">{warning}</div>}
  </div>;
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div><div className="mt-1 text-base font-bold">{value}</div></div>;
}

function deriveLeaveApplicationValues(values: Record<string, string>) {
  const employee = findEmployee(values["Employee Code"], values.Employee);
  const from = normalizeLeaveDate(values.From);
  const to = normalizeLeaveDate(values.To || values.From);
  const days = values.From && values.To ? calculateInclusiveDays(from, to) || 1 : numberValue(values.Days) || 1;
  const available = availableLeaveBalance(values, employee);
  const remaining = leaveBalanceRequired(values["Leave type"]) ? available - days : available;
  return {
    ...values,
    "Employee Code": values["Employee Code"] || employee?.["Employee No"] || "",
    Employee: values.Employee || employee?.["Full Name"] || "",
    Department: values.Department || employee?.Department || "",
    Designation: values.Designation || employee?.["Job Title"] || "",
    "Date of Employment": values["Date of Employment"] || employee?.["Date Joined"] || "",
    Contact: values.Contact || employee?.["Mobile No"] || "",
    Email: values.Email || employee?.["Email Address"] || "",
    Days: String(days),
    "Available balance": `${available} days`,
    "Remaining balance": `${remaining} days`,
    Balance: `${remaining} days`
  };
}

function leaveBalanceWarning(values: Record<string, string>) {
  if (!leaveBalanceRequired(values["Leave type"])) return "";
  const selected = numberValue(values.Days);
  const available = numberValue(values["Available balance"]);
  return selected > available ? `Selected leave days exceed available balance by ${selected - available} day(s).` : "";
}

function leaveBalanceRequired(leaveType?: string) {
  return !String(leaveType || "").toLowerCase().includes("unpaid");
}

function availableLeaveBalance(values: Record<string, string>, employee?: Record<string, string>) {
  const existing = numberValue(values["Available balance"]);
  if (existing) return existing;
  const employeeBalance = employee ? currentLeaveBalanceFor(employee) : 0;
  if (employeeBalance) return employeeBalance;
  return leavePolicyEntitlement(values["Leave type"]);
}

function leavePolicyEntitlement(leaveType?: string) {
  const normalized = String(leaveType || "Annual leave").toLowerCase();
  const policy = leaveViews["Leave Policies"].rows.find(row => row["Leave type"].toLowerCase() === normalized);
  return numberValue(policy?.Entitlement);
}

function fieldTypesFor(area: string, active: string): Record<string, RecordFieldType> {
  if (area === "Leave" && active === "Annual Planner") return { From: "date", To: "date" };
  if (area === "Leave" && active === "Applications") return { From: "date", To: "date" };
  if (area === "Leave" && active === "Approvals") return { "Approved from": "date", "Approved to": "date", "Decision date": "date" };
  if (area === "Leave" && active === "Leave Handover") return { "Accepted at": "date" };
  if (area === "Leave" && active === "Clearance") return { "Completed at": "date" };
  if (area === "Leave" && active === "Rejoin") return { "Original return date": "date", "Actual rejoin date": "date" };
  return {};
}

function suggestionsFor(area: string, active: string): Record<string, RecordFieldSuggestion[]> {
  if (area === "Payroll") {
    return {
      Employee: hrEmployees.map(employee => ({
        value: employee["Full Name"],
        label: `${employee["Employee No"]} - ${employee.Department} - ${employee["Job Title"]}`
      }))
    };
  }
  if (area !== "Leave" || !["Annual Planner", "Applications", "Leave Handover"].includes(active)) return {};
  const employeeSuggestions = hrEmployees.map(employee => ({
    value: employee["Full Name"],
    label: `${employee["Employee No"]} - ${employee.Department} - ${employee["Job Title"]}`,
    fill: {
      "Employee Code": employee["Employee No"],
      Employee: employee["Full Name"],
      Department: employee.Department,
      Designation: employee["Job Title"],
      "Date of Employment": employee["Date Joined"],
      Contact: employee["Mobile No"] ?? "",
      Email: employee["Email Address"] ?? "",
      "Handover to": employee["Line Manager"] ?? ""
    }
  }));
  const employeeCodeSuggestions = hrEmployees.map(employee => ({
    value: employee["Employee No"],
    label: `${employee["Full Name"]} - ${employee.Department}`,
    fill: {
      "Employee Code": employee["Employee No"],
      Employee: employee["Full Name"],
      Department: employee.Department,
      Designation: employee["Job Title"],
      "Date of Employment": employee["Date Joined"],
      Contact: employee["Mobile No"] ?? "",
      Email: employee["Email Address"] ?? "",
      "Handover to": employee["Line Manager"] ?? ""
    }
  }));
  const handoverEmployeeSuggestions = hrEmployees.map(employee => ({
    value: employee["Full Name"],
    label: `${employee["Employee No"]} - ${employee.Department}`,
    department: employee.Department,
    fill: { "Handover to code": employee["Employee No"], "Handover to": employee["Full Name"] }
  }));
  const handoverCodeSuggestions = hrEmployees.map(employee => ({
    value: employee["Employee No"],
    label: `${employee["Full Name"]} - ${employee.Department}`,
    department: employee.Department,
    fill: { "Handover to code": employee["Employee No"], "Handover to": employee["Full Name"] }
  }));
  if (active === "Leave Handover") {
    return {
      Employee: employeeSuggestions,
      "Employee Code": employeeCodeSuggestions,
      "Handover to": handoverEmployeeSuggestions,
      "Handover to code": handoverCodeSuggestions
    };
  }
  if (active === "Annual Planner") {
    return {
      Employee: employeeSuggestions,
      "Employee Code": employeeCodeSuggestions
    };
  }
  return {
    Employee: employeeSuggestions,
    "Employee Code": employeeCodeSuggestions,
    "Handover to": handoverEmployeeSuggestions,
    "Handover to code": handoverCodeSuggestions
  };
}

function validateOperationRecord(area: string, active: string, values: Record<string, string>) {
  if (area !== "Leave") return "";
  if (active === "Annual Planner") {
    if (!values.Employee && !values["Employee Code"]) return "Select an employee name or employee code.";
    if (!values.From || !values.To) return "Select planned leave from and to dates.";
    const from = dateFromValue(values.From);
    const to = dateFromValue(values.To);
    if (!from || !to) return "Enter valid planned leave dates.";
    if (to < from) return "Planned leave to date cannot be before from date.";
  }
  if (active === "Applications") {
    if (!values.Employee && !values["Employee Code"]) return "Select an employee name or employee code.";
    if (!values.From || !values.To) return "Select leave from and to dates.";
    const from = dateFromValue(values.From);
    const to = dateFromValue(values.To);
    if (!from || !to) return "Enter valid leave dates.";
    if (to < from) return "Leave to date cannot be before from date.";
    const derived = deriveLeaveApplicationValues(values);
    const warning = leaveBalanceWarning(derived);
    if (warning) return warning;
  }
  if (active === "Approvals" && !values.Request) return "Approval must be linked to a leave request.";
  if (active === "Leave Handover" && !values.Request) return "Leave handover must be linked to a leave request.";
  if (active === "Clearance" && !values.Request) return "Clearance must be linked to a leave request.";
  if (active === "Rejoin" && !values.Request) return "Rejoin must be linked to a leave request.";
  return "";
}

function normalizeLeavePlan(values: Record<string, string>): Record<string, string> {
  const employee = findEmployee(values["Employee Code"], values.Employee);
  const from = normalizeLeaveDate(values.From);
  const to = normalizeLeaveDate(values.To || values.From);
  const days = calculateInclusiveDays(from, to) || numberValue(values.Days) || 1;
  return {
    ...values,
    Plan: !values.Plan?.trim() || values.Plan === "Auto generated" ? nextLeavePlanNo() : values.Plan.trim(),
    "Employee Code": values["Employee Code"] || employee?.["Employee No"] || "",
    Employee: values.Employee || employee?.["Full Name"] || "",
    Department: values.Department || employee?.Department || "",
    "Leave type": values["Leave type"] || "Annual leave",
    From: formatDisplayDate(from),
    To: formatDisplayDate(to),
    Days: String(days),
    Status: leavePlannerStatus(values.Status)
  };
}

function transformLeaveSave(values: Record<string, string>) {
  if ("Leave type" in values && "From" in values && "To" in values) {
    const application = normalizeLeaveApplication(values);
    syncApprovalFromApplication(application);
    syncLeaveDependentsFromApplication(application);
    return application;
  }
  if ("Decision" in values && "Approved from" in values && "Approved to" in values) {
    const approval = normalizeLeaveApproval(values);
    syncApplicationFromApproval(approval);
    return approval;
  }
  if (!("Original return date" in values) || !("Actual rejoin date" in values)) return values;
  const delayDays = calculateRejoinDelayDays(values["Original return date"], values["Actual rejoin date"]);
  const verifiedAt = values.Status === "verified" ? values["Verified at"] || formatDemoDateTime(new Date()) : values["Verified at"];
  const verifiedBy = values.Status === "verified" ? values["HR verified by"] || getDemoSession()?.name || PRESENTATION_USER_NAME : values["HR verified by"];
  return { ...values, "Delay days": String(delayDays), "HR verified by": verifiedBy, "Verified at": verifiedAt };
}

function normalizeLeaveApplication(values: Record<string, string>) {
  const employee = findEmployee(values["Employee Code"], values.Employee);
  const from = normalizeLeaveDate(values.From);
  const to = normalizeLeaveDate(values.To || values.From);
  const days = calculateInclusiveDays(from, to) || numberValue(values.Days) || 1;
  const derived = deriveLeaveApplicationValues({ ...values, From: formatDisplayDate(from), To: formatDisplayDate(to), Days: String(days) });
  return {
    ...values,
    Request: !values.Request?.trim() || values.Request === "Auto generated" ? nextLeaveRequestNo() : values.Request.trim(),
    "Employee Code": values["Employee Code"] || employee?.["Employee No"] || "",
    Employee: values.Employee || employee?.["Full Name"] || "",
    Department: values.Department || employee?.Department || "",
    Designation: values.Designation || employee?.["Job Title"] || "",
    "Date of Employment": values["Date of Employment"] || employee?.["Date Joined"] || "",
    From: formatDisplayDate(from),
    To: formatDisplayDate(to),
    Days: String(days),
    "Available balance": derived["Available balance"],
    "Remaining balance": derived["Remaining balance"],
    Balance: derived.Balance,
    Purpose: values.Purpose || "",
    Destination: values.Destination || "",
    "Travel from": values["Travel from"] || "",
    "Travel to": values["Travel to"] || "",
    Contact: values.Contact || employee?.["Mobile No"] || "",
    Email: values.Email || employee?.["Email Address"] || "",
    "Handover to code": values["Handover to code"] || "",
    "Handover to": values["Handover to"] || "",
    "Handover notes / tasks": values["Handover notes / tasks"] || values.Purpose || "",
    "Clearance checklist": values["Clearance checklist"] || "Manager handover review pending",
    "Clearance status": values["Clearance status"] || "pending",
    Status: values.Status || "Draft"
  };
}

function normalizeLeaveApproval(values: Record<string, string>) {
  const from = normalizeLeaveDate(values["Approved from"]);
  const to = normalizeLeaveDate(values["Approved to"] || values["Approved from"]);
  const days = calculateInclusiveDays(from, to) || numberValue(values.Days) || 1;
  return {
    ...values,
    "Approved from": formatDisplayDate(from),
    "Approved to": formatDisplayDate(to),
    Days: String(days),
    Approver: values.Approver || getDemoSession()?.name || PRESENTATION_USER_NAME,
    "Decision date": values.Status === "Approved" || values.Status === "Rejected" ? values["Decision date"] || formatDisplayDate(todayIso()) : values["Decision date"],
    "Approval notes": values["Approval notes"] || "",
    Status: values.Status || "Pending approval"
  };
}

function syncApprovalFromApplication(application: Record<string, string>) {
  if (!shouldSyncApproval(application.Status)) return;
  const moduleKey = "hr-operations:Leave:Approvals";
  const records = readDemoRecordsSnapshot(moduleKey, leaveViews.Approvals.rows);
  const approval = {
    Decision: records.find(row => row.Request === application.Request)?.Decision || decisionNoFor(application.Request),
    Request: application.Request,
    "Employee Code": application["Employee Code"],
    Employee: application.Employee,
    "Approved from": application.From,
    "Approved to": application.To,
    Days: application.Days,
    Approver: "HR Manager",
    "Decision date": application.Status === "Approved" || application.Status === "Rejected" ? formatDisplayDate(todayIso()) : "",
    "Approval notes": application.Status === "Rejected" ? "Rejected by approver." : application.Status === "Approved" ? "Approved as per leave balance." : "",
    Status: approvalStatusFromApplication(application.Status)
  };
  const existing = records.find(row => row.Request === application.Request);
  const next = existing
    ? records.map(row => row.Request === application.Request ? { ...row, ...approval } : row)
    : [createDemoRecord(approval), ...records];
  writeDemoRecordsSnapshot(moduleKey, next);
}

function syncApplicationFromApproval(approval: Record<string, string>) {
  if (approval.Status !== "Approved" && approval.Status !== "Rejected") return;
  const moduleKey = "hr-operations:Leave:Applications";
  const records = readDemoRecordsSnapshot(moduleKey, leaveViews.Applications.rows);
  let syncedApplication: Record<string, string> | null = null;
  const next = records.map(row => row.Request === approval.Request ? {
    ...row,
    Status: approval.Status,
    From: approval["Approved from"] || row.From,
    To: approval["Approved to"] || row.To,
    Days: approval.Days || row.Days
  } : row);
  syncedApplication = next.find(row => row.Request === approval.Request) ?? null;
  writeDemoRecordsSnapshot(moduleKey, next);
  if (syncedApplication) syncLeaveDependentsFromApplication(syncedApplication);
}

function removeLinkedLeaveRecords(requestNumbers: string[]) {
  if (!requestNumbers.length) return;
  const removeSet = new Set(requestNumbers);
  (["Approvals", "Leave Handover", "Clearance", "Rejoin"] as const).forEach(tab => {
    const moduleKey = `hr-operations:Leave:${tab}`;
    const records = readDemoRecordsSnapshot(moduleKey, leaveViews[tab].rows);
    writeDemoRecordsSnapshot(moduleKey, records.filter(row => !removeSet.has(row.Request)));
  });
}

function syncLeaveDependentsFromApplication(application: Record<string, string>) {
  const request = application.Request;
  if (!request) return;
  if (["Draft", "Cancelled", "Rejected"].includes(application.Status || "")) {
    removeLinkedLeaveDependents([request]);
    return;
  }

  if (shouldSyncApproval(application.Status) && application["Handover to"]) {
    const handoverEmployee = findEmployee("", application["Handover to"]);
    upsertLeaveRecord("Leave Handover", request, {
      Request: request,
      "Employee Code": application["Employee Code"],
      Employee: application.Employee,
      "Leave dates": `${application.From} - ${application.To}`,
      "Handover to code": handoverEmployee?.["Employee No"] || application["Handover to code"] || "",
      "Handover to": application["Handover to"],
      "Tasks / notes": application["Handover notes / tasks"] || (application.Purpose ? `Cover during leave: ${application.Purpose}` : "Review duties before departure."),
      Attachment: "",
      Status: application.Status === "Approved" ? "Accepted" : "Pending acceptance",
      "Accepted at": application.Status === "Approved" ? formatDemoDateTime(new Date()) : ""
    });
  }

  if (application.Status === "Approved") {
    upsertLeaveRecord("Clearance", request, {
      Request: request,
      "Employee Code": application["Employee Code"],
      Employee: application.Employee,
      Department: application.Department,
      "Leave dates": `${application.From} - ${application.To}`,
      "Clearance items": application["Clearance checklist"] || "Leave approved; handover and contact details reviewed",
      "Responsible person": "HR Manager",
      Status: application["Clearance status"] || "pending",
      Comments: "",
      "Completed at": ""
    });
    upsertLeaveRecord("Rejoin", request, {
      Request: request,
      "Employee Code": application["Employee Code"],
      Employee: application.Employee,
      "Original return date": formatDisplayDate(nextDayIso(application.To)),
      "Actual rejoin date": "",
      "Delay days": "0",
      "Reason for delay": "",
      "Medical / supporting attachment": "",
      Status: "pending_rejoin",
      "HR verified by": "",
      "Verified at": ""
    });
  }
}

function removeLinkedLeaveDependents(requestNumbers: string[]) {
  if (!requestNumbers.length) return;
  const removeSet = new Set(requestNumbers);
  (["Leave Handover", "Clearance", "Rejoin"] as const).forEach(tab => {
    const moduleKey = `hr-operations:Leave:${tab}`;
    const records = readDemoRecordsSnapshot(moduleKey, leaveViews[tab].rows);
    writeDemoRecordsSnapshot(moduleKey, records.filter(row => !removeSet.has(row.Request)));
  });
}

function upsertLeaveRecord(tab: "Leave Handover" | "Clearance" | "Rejoin", request: string, values: Record<string, string>) {
  const moduleKey = `hr-operations:Leave:${tab}`;
  const records = readDemoRecordsSnapshot(moduleKey, leaveViews[tab].rows);
  const existing = records.find(row => row.Request === request);
  const next = existing
    ? records.map(row => row.Request === request ? { ...row, ...values } : row)
    : [createDemoRecord(values), ...records];
  writeDemoRecordsSnapshot(moduleKey, next);
}

function shouldSyncApproval(status?: string) {
  return ["Submitted", "Pending approval", "Manager review", "HR review", "Approved", "Rejected"].includes(status || "");
}

function approvalStatusFromApplication(status?: string) {
  if (status === "Approved" || status === "Rejected") return status;
  return "Pending approval";
}

function findEmployee(employeeCode?: string, employeeName?: string) {
  const code = employeeCode?.trim().toLowerCase();
  const name = employeeName?.trim().toLowerCase();
  return hrEmployees.find(employee => employee["Employee No"].toLowerCase() === code || employee["Full Name"].toLowerCase() === name);
}

function nextLeaveRequestNo() {
  return `LV-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, "0")}`;
}

function nextLeavePlanNo() {
  return `LVP-${new Date().getFullYear()}-${String(Date.now() % 10000).padStart(4, "0")}`;
}

function decisionNoFor(requestNo: string) {
  const year = requestNo.match(/\d{4}/)?.[0] || String(new Date().getFullYear());
  const sequence = requestNo.match(/(\d+)$/)?.[1] || String(Date.now() % 10000);
  return `LVA-${year}-${sequence.padStart(4, "0").slice(-4)}`;
}

function calculateRejoinDelayDays(originalReturnDate?: string, actualRejoinDate?: string) {
  const original = dateFromValue(originalReturnDate);
  const actual = dateFromValue(actualRejoinDate);
  if (!original || !actual) return 0;
  const day = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((actual.getTime() - original.getTime()) / day));
}

function dateInRange(value: string | undefined, from: string, to: string) {
  if (!from && !to) return true;
  const comparable = dateSortValue(value);
  if (!comparable) return false;
  return (!from || comparable >= from) && (!to || comparable <= to);
}

function dateSortValue(value?: string) {
  const date = dateFromValue(value);
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dateFromValue(value?: string) {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function normalizeLeaveDate(value?: string) {
  return dateSortValue(value) || todayIso();
}

function calculateInclusiveDays(from: string, to: string) {
  const start = dateFromValue(from);
  const end = dateFromValue(to);
  if (!start || !end) return 0;
  const day = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / day) + 1);
}

function formatDisplayDate(value: string) {
  const date = dateFromValue(value);
  if (!date) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextDayIso(value?: string) {
  const date = dateFromValue(value) ?? new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isDateColumn(column: string) {
  const key = column.toLowerCase();
  return key.includes("date") || key.includes("verified at");
}

function formatDemoDateTime(date: Date) {
  return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function groupBy<T>(items: T[], keyFor: (item: T) => string) {
  return items.reduce((groups, item) => {
    const key = keyFor(item);
    const group = groups.get(key);
    if (group) group.push(item); else groups.set(key, [item]);
    return groups;
  }, new Map<string, T[]>());
}

export function PayrollWorkspace() {
  const [active, setActive] = useState<string>("Monthly Payroll");
  const tabs = ["Monthly Payroll", "Loans", "Reports", "Pay Process", ...payrollModules];
  return <div className="space-y-4">
    <section className="rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex gap-1 overflow-x-auto px-3">{tabs.map(tab => <button key={tab} data-testid={`payroll-subtab-${tab.toLowerCase().replaceAll(" ", "-")}`} onClick={() => setActive(tab)} className={cn("relative whitespace-nowrap px-3 py-3 text-xs font-semibold", active === tab ? "text-medtech-navy" : "text-[var(--muted)]")}>{tab}{active === tab && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-medtech-red" />}</button>)}</div>
    </section>
    {active === "Monthly Payroll" ? <MonthlyPayroll /> : active === "Loans" ? <EmployeeLoansModule /> : active === "Reports" ? <PayrollReportsModule /> : active === "Pay Process" ? <PayProcess /> : active === "Leave Settlement" ? <LeaveSettlementModule /> : <OperationsWorkspace key={active} area="Payroll" views={{ [active]: payrollViews[active] }} template={() => active === "Gratuity" ? "gratuity_statement" : active === "Final Settlement" ? "final_settlement" : "payslip"} transformSave={values => {
      const result = calculatePayrollItem({ quantity: numberValue(values.Quantity), rateAmount: numberValue(values.Rate), fixedAmount: numberValue(values["Fixed amount"]), effect: (values["Payroll effect"] || "Neutral") as PayrollEffect });
      return { ...values, Record: values.Record === "Auto generated" || !values.Record?.trim() ? nextPayrollItemNo(active) : values.Record, "Calculated amount": qar(result.calculatedAmount), "Net effect": qar(result.netEffect) };
    }} />}
  </div>;
}

type MonthlyPayrollRow = MonthlyPayrollLineInput & {
  department: string;
  designation: string;
  remarks: string;
  status: string;
};

const companies = ["MedTech Corporation Trading W.L.L."];
const allDepartments = "All departments";
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const demoPayrollMonth = "6";
const demoPayrollYear = "2026";
const defaultPayrollSettings: MonthlyPayrollSettings = { salaryCalculationMethod: "calendar_days", configuredWorkingDays: 26 };
const defaultWpsSettings = { format: "qatar_wps", columns: defaultWpsColumns };
const leaveSettlementSeed = [
  { Record: "LVS-2026-0001", Company: companies[0], Employee: "Aisha Rahman", Department: "Finance", "Employee Code": "MT-0024", "Basic Salary": "QAR 12,800.00", "Gross Salary": "QAR 17,500.00", "Leave type": "Annual leave", "Leave balance days": "5", "Salary calculation basis": "basic_salary", "Salary rate per day": "QAR 426.67", "Settlement amount": "QAR 2,133.35", "Payroll period": "June 2026", "Payroll month": "6", "Payroll year": "2026", "Payroll effect": "Earning", "Net effect": "QAR 2,133.35", Remarks: "Approved carry-forward encashment", Status: "Approved" },
  { Record: "LVS-2026-0002", Company: companies[0], Employee: "Fahad Al-Kuwari", Department: "Sales", "Employee Code": "MT-0018", "Basic Salary": "QAR 14,500.00", "Gross Salary": "QAR 20,000.00", "Leave type": "Annual leave", "Leave balance days": "3", "Salary calculation basis": "basic_salary", "Salary rate per day": "QAR 483.33", "Settlement amount": "QAR 1,449.99", "Payroll period": "June 2026", "Payroll month": "6", "Payroll year": "2026", "Payroll effect": "Earning", "Net effect": "QAR 1,449.99", Remarks: "Approved payroll demo settlement", Status: "Approved" }
];
const employeeLoanSeed: LoanRecord[] = [{
  Loan: "LOAN-2026-0028",
  Company: companies[0],
  Employee: "Omar Nasser",
  "Employee Code": "MT-0072",
  Department: "Warehouse",
  "Loan type": "Employee loan",
  "Loan amount": "QAR 24,000.00",
  "Installment amount": "QAR 2,000.00",
  "Number of installments": "12",
  "Start month": "6",
  "Start year": "2026",
  Remarks: "Approved employee loan",
  Status: "active",
  Schedule: JSON.stringify(buildLoanSchedule(24000, 2000, 6, 2026))
}, {
  Loan: "LOAN-2026-0029",
  Company: companies[0],
  Employee: "Fahad Al-Kuwari",
  "Employee Code": "MT-0018",
  Department: "Sales",
  "Loan type": "Employee loan",
  "Loan amount": "QAR 12,000.00",
  "Installment amount": "QAR 1,000.00",
  "Number of installments": "12",
  "Start month": "6",
  "Start year": "2026",
  Remarks: "Approved payroll demo loan",
  Status: "active",
  Schedule: JSON.stringify(buildLoanSchedule(12000, 1000, 6, 2026))
}];
const monthlyPayrollSeed = buildMonthlyPayrollSeed();

function MonthlyPayroll() {
  const [company, setCompany] = useState(companies[0]);
  const [month, setMonth] = useState(demoPayrollMonth);
  const [year, setYear] = useState(demoPayrollYear);
  const [department, setDepartment] = useState(allDepartments);
  const [rows, setRows] = useState<MonthlyPayrollRow[]>([]);
  const [runId, setRunId] = useState("");
  const [status, setStatus] = useState<"New" | "Draft" | "Validated" | "Finalized" | "Cancelled">("New");
  const [messages, setMessages] = useState<string[]>([]);
  const [wpsErrors, setWpsErrors] = useState<WpsValidationError[]>([]);
  const [sifErrors, setSifErrors] = useState<SifValidationError[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [adminReason, setAdminReason] = useState("");
  const [sifDepartment, setSifDepartment] = useState(allDepartments);
  const [toast, setToast] = useState("");
  const runs = useDemoRecords("hr-payroll:Monthly Payroll", monthlyPayrollSeed);
  const loanStore = useDemoRecords("hr-payroll:Loans", employeeLoanSeed);
  const audit = useAuditLog();
  const loans = loanStore.records as Array<DemoRecord & LoanRecord>;
  const departments = useMemo(() => [allDepartments, ...Array.from(new Set(hrEmployees.map(employee => employee.Department).filter(Boolean))).sort()], []);
  const calendarDays = useMemo(() => new Date(Number(year), Number(month), 0).getDate(), [month, year]);
  const locked = status === "Finalized";
  const canFinalize = isPayrollFinalizer();
  const lineResults = useMemo(() => rows.map(row => calculateMonthlyPayrollLine(row, defaultPayrollSettings, calendarDays)), [rows, calendarDays]);
  const totals = useMemo(() => lineResults.reduce((sum, result) => ({
    salary: sum.salary + result.salaryPayable,
    earnings: sum.earnings + result.totalEarnings,
    deductions: sum.deductions + result.totalDeductions,
    net: sum.net + result.netPay
  }), { salary: 0, earnings: 0, deductions: 0, net: 0 }), [lineResults]);
  const detail = useMemo(() => payrollRunDetail(rows, lineResults), [rows, lineResults]);
  const sifDepartments = useMemo(() => [allDepartments, ...Array.from(new Set(rows.map(row => row.department || "Unassigned"))).sort()], [rows]);
  const currentRun = runs.records.find(run => run.__id === runId);
  const runKey = monthlyRunKey(company, month, year, department);
  const runAudit = useMemo(() => audit.entries.filter(entry => entry.Record === runKey), [audit.entries, runKey]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const updateLoans = (nextLoans: Array<DemoRecord & LoanRecord>) => nextLoans.forEach(loan => loanStore.update(loan.__id, loan));
  const repairRunLines = useCallback((run: DemoRecord, nextRows: MonthlyPayrollRow[]) => {
    if (!nextRows.length || parseMonthlyLines(run.Lines).length) return;
    const runCalendarDays = new Date(Number(run.Year), Number(run.Month), 0).getDate();
    const nextResults = nextRows.map(row => calculateMonthlyPayrollLine(row, defaultPayrollSettings, runCalendarDays));
    runs.update(run.__id, monthlyRunRecord(run.Run || monthlyRunKey(run.Company || company, run.Month || month, run.Year || year, run.Department || department), run.Company || company, run.Month || month, run.Year || year, run.Department || department, nextRows, nextResults, run.Status || "Draft", run));
  }, [company, department, month, runs, year]);
  const openRun = useCallback((run: DemoRecord) => {
    const nextRows = monthlyRowsForRun(run, loans);
    setCompany(run.Company || companies[0]);
    setMonth(run.Month || demoPayrollMonth);
    setYear(run.Year || demoPayrollYear);
    setDepartment(run.Department || allDepartments);
    setRows(nextRows);
    setRunId(run.__id);
    setStatus((run.Status as typeof status) || "Draft");
    repairRunLines(run, nextRows);
    setMessages([]);
    setWpsErrors([]);
    setSifErrors([]);
    setShowAudit(false);
    setAdminReason("");
    setSifDepartment(allDepartments);
  }, [loans, repairRunLines]);
  useEffect(() => {
    const match = runs.records.find(run => run.Company === company && run.Month === month && run.Year === year && run.Department === department && run.Status !== "Cancelled");
    if (!match || (match.__id === runId && rows.length)) return;
    openRun(match);
  }, [company, month, year, department, runId, rows.length, runs.records, openRun]);
  const loadEmployees = () => {
    const period = `${monthNames[Number(month) - 1]} ${year}`;
    const loaded = hrEmployees
      .filter(employee => isPayrollEmployee(employee) && payrollScopeMatches(employee, company, department))
      .sort((a, b) => a.Department.localeCompare(b.Department) || a["Full Name"].localeCompare(b["Full Name"]))
      .map(employee => employeeToMonthlyPayrollRow(employee, period, calendarDays, loans, Number(month), Number(year)));
    setRows(loaded);
    setMessages(loaded.length ? [] : ["No payroll-eligible employees found for the selected company and department."]);
    setWpsErrors([]);
    setSifErrors([]);
    setStatus("New");
    setRunId("");
    setShowAudit(false);
    setSifDepartment(allDepartments);
    notify(`${loaded.length} employee${loaded.length === 1 ? "" : "s"} loaded`);
  };
  const createDraft = () => {
    const duplicate = runs.records.find(run => run.Company === company && run.Month === month && run.Year === year && run.Department === department && run.Status !== "Cancelled");
    if (duplicate) {
      setRunId(duplicate.__id);
      setStatus((duplicate.Status as typeof status) || "Draft");
      const duplicateRows = monthlyRowsForRun(duplicate, loans);
      setRows(duplicateRows);
      repairRunLines(duplicate, duplicateRows);
      setMessages([`Existing ${duplicate.Status.toLowerCase()} payroll found for this company, department and period.`]);
      setWpsErrors([]);
      setSifErrors([]);
      setShowAudit(false);
      return;
    }
    if (!rows.length) { setMessages(["Load employees before creating a draft payroll."]); return; }
    const run = runs.create(monthlyRunRecord(runKey, company, month, year, department, rows, lineResults, "Draft"));
    setRunId(run.__id);
    setStatus("Draft");
    setMessages([]);
    setWpsErrors([]);
    setSifErrors([]);
    appendAuditLog({ action: "CREATE DRAFT PAYROLL", module: "Human Resources - Payroll", record: runKey, details: `${rows.length} employee lines created` });
    notify("Draft payroll created");
  };
  const saveDraft = () => {
    if (!runId || status === "New") { setMessages(["Create a draft before saving."]); return; }
    if (locked) { setMessages(["Finalized payroll is locked."]); return; }
    runs.update(runId, monthlyRunRecord(runKey, company, month, year, department, rows, lineResults, "Draft", currentRun));
    setStatus("Draft");
    setSifErrors([]);
    appendAuditLog({ action: "SAVE DRAFT PAYROLL", module: "Human Resources - Payroll", record: runKey, details: `${rows.length} employee lines saved` });
    notify("Draft payroll saved");
  };
  const validate = () => {
    const errors = validateMonthlyPayroll(rows, lineResults);
    setMessages(errors.length ? errors : ["Payroll validation passed."]);
    if (!errors.length && runId) {
      runs.update(runId, monthlyRunRecord(runKey, company, month, year, department, rows, lineResults, "Validated", currentRun));
      setStatus("Validated");
      setSifErrors([]);
      appendAuditLog({ action: "VALIDATE PAYROLL", module: "Human Resources - Payroll", record: runKey, details: "Payroll validation passed" });
    }
  };
  const finalize = () => {
    const session = getDemoSession();
    const finalRows = applyLoanDeductions(rows, loans, Number(month), Number(year));
    const finalResults = finalRows.map(row => calculateMonthlyPayrollLine(row, defaultPayrollSettings, calendarDays));
    const finalTotals = finalResults.reduce((sum, result) => ({ gross: sum.gross + result.salaryPayable, earnings: sum.earnings + result.totalEarnings, deductions: sum.deductions + result.totalDeductions, net: sum.net + result.netPay }), { gross: 0, earnings: 0, deductions: 0, net: 0 });
    const errors = validateMonthlyPayroll(finalRows, finalResults);
    const permission = permissionError(session, "Payroll", "finalize/post/lock");
    const segregation = segregationWarning({ action: "finalize/post/lock", moduleName: "Payroll", record: currentRun, session });
    if (permission) errors.unshift(permission);
    if (segregation) errors.unshift(segregation);
    if (!canFinalize) errors.unshift("Only Super Admin, HR Manager, or Payroll Manager can finalize payroll.");
    if (!runId) errors.unshift("Create a draft before finalizing.");
    if (!hasApprovedApproval("Human Resources - Payroll", runKey, "Payroll finalization")) errors.unshift("Payroll finalization approval is required.");
    if (errors.length) { setMessages(errors); return; }
    runs.update(runId, monthlyRunRecord(runKey, company, month, year, department, finalRows, finalResults, "Finalized", currentRun));
    updateLoans(markPayrollInstallmentsDeducted(loans, finalRows.map(row => row.employeeCode), Number(month), Number(year), runKey));
    const journalLines = writePayrollAccountingDrafts(runKey, finalRows, finalResults);
    setRows(finalRows);
    setStatus("Finalized");
    setSifErrors([]);
    setMessages([`Payroll finalized and locked. ${journalLines.length} cost center draft journal line${journalLines.length === 1 ? "" : "s"} created.`]);
    appendAuditLog({ action: "FINALIZE PAYROLL", module: "Human Resources - Payroll", record: runKey, details: `Net payroll ${qar(finalTotals.net)}; ${journalLines.length} cost center draft journal lines` });
    notify("Payroll finalized");
  };
  const submitPayrollApproval = () => {
    const permission = permissionError(getDemoSession(), "Approvals", "create");
    if (permission) { setMessages([permission]); return; }
    if (!runId || status !== "Validated") { setMessages(["Validate payroll before submitting approval."]); return; }
    const result = submitApprovalRequest({ sourceModule: "Human Resources - Payroll", sourceRecord: runKey, requestType: "Payroll finalization", requestedBy: getDemoSession()?.name || PRESENTATION_USER_NAME, amount: totals.net, businessUnit: department });
    setMessages([result.message]);
    notify(result.message);
  };
  const cancel = () => {
    if (!runId || status === "Finalized") { setMessages([status === "Finalized" ? "Use admin cancellation with a reason for finalized payroll." : "Create a draft before cancelling."]); return; }
    runs.update(runId, monthlyRunRecord(runKey, company, month, year, department, rows, lineResults, "Cancelled", currentRun));
    updateLoans(releasePayrollInstallments(loans, runKey));
    setStatus("Cancelled");
    appendAuditLog({ action: "CANCEL PAYROLL", module: "Human Resources - Payroll", record: runKey, details: "Draft payroll cancelled" });
    notify("Draft cancelled");
  };
  const backToDraft = () => {
    if (!runId || status !== "Validated") return;
    runs.update(runId, monthlyRunRecord(runKey, company, month, year, department, rows, lineResults, "Draft", currentRun));
    setStatus("Draft");
    appendAuditLog({ action: "BACK TO DRAFT", module: "Human Resources - Payroll", record: runKey, details: "Validated payroll returned to draft" });
    notify("Payroll returned to draft");
  };
  const adminRollbackFinalized = (nextStatus: "Draft" | "Cancelled") => {
    if (!runId || status !== "Finalized") return;
    if (!isAdminUser()) { setMessages(["Only Super Admin can roll back or cancel finalized payroll."]); return; }
    if (!adminReason.trim()) { setMessages(["Admin reason is required for finalized payroll rollback or cancellation."]); return; }
    updateLoans(releasePayrollInstallments(loans, runKey));
    runs.update(runId, { ...monthlyRunRecord(runKey, company, month, year, department, rows, lineResults, nextStatus, currentRun), "Rollback reason": adminReason });
    setStatus(nextStatus);
    setAdminReason("");
    appendAuditLog({ action: nextStatus === "Draft" ? "ROLLBACK FINALIZED PAYROLL" : "CANCEL FINALIZED PAYROLL", module: "Human Resources - Payroll", record: runKey, details: adminReason });
    notify(nextStatus === "Draft" ? "Finalized payroll rolled back" : "Finalized payroll cancelled");
  };
  const updateRow = (employeeCode: string, values: Partial<MonthlyPayrollRow>) => {
    if (locked) return;
    setRows(current => current.map(row => row.employeeCode === employeeCode ? { ...row, ...values } : row));
  };
  const downloadWps = async () => {
    if (status !== "Finalized") { setMessages(["WPS can only be downloaded after payroll is finalized."]); return; }
    const generatedAt = new Date().toISOString();
    const generatedBy = getDemoSession()?.name || PRESENTATION_USER_NAME;
    const employeeMasters = hrEmployees.map(employeeToWpsMaster);
    const wpsLines = rows.map((row, index) => ({ employeeCode: row.employeeCode, employeeName: row.employeeName, paidDays: row.paidDays, netSalary: lineResults[index].netPay, salaryAmount: lineResults[index].salaryPayable, remarks: row.remarks }));
    const errors = validateWpsExport(wpsLines, employeeMasters);
    setWpsErrors(errors);
    if (errors.length) { setMessages(["WPS validation failed. Fix the listed employee payment fields before export."]); return; }
    const context = { company, department, month: monthNames[Number(month) - 1], year, payrollRunId: runKey, generatedBy, generatedAt, wpsFormat: defaultWpsSettings.format };
    const wpsRows = buildWpsRows(wpsLines, employeeMasters, context, defaultWpsSettings.columns);
    const summaryRows = buildWpsSummaryRows(wpsLines, context, defaultWpsSettings.columns);
    const notesRows = [{ Note: "Validation passed", Detail: "All WPS required fields were present at export time." }, { Note: "Generated by", Detail: generatedBy }, { Note: "Generated at", Detail: generatedAt }, { Note: "Payroll run", Detail: runKey }];
    await exportWorkbookToExcel([
      { name: "WPS Export", rows: wpsRows },
      { name: "Payroll Summary", rows: summaryRows },
      { name: "Validation Notes", rows: notesRows }
    ], wpsFileName(company, department, month, year));
    appendAuditLog({ action: "GENERATE WPS", module: "Human Resources - Payroll", record: runKey, details: JSON.stringify({ generated_by: generatedBy, generated_at: generatedAt, payroll_run_id: runKey }) });
    notify("WPS sheet downloaded");
  };
  const downloadPayrollSheet = () => {
    if (status !== "Finalized") { setMessages(["Payroll sheet can only be downloaded after payroll is finalized."]); return; }
    exportToExcel(payrollSheetRows(rows, lineResults), `${runKey}-payroll-sheet`, "Payroll");
    appendAuditLog({ action: "DOWNLOAD PAYROLL SHEET", module: "Human Resources - Payroll", record: runKey, details: `${rows.length} payroll lines exported` });
    notify("Payroll sheet downloaded");
  };
  const downloadSifFile = (targetRows: MonthlyPayrollRow[], scope: string, offsetMinutes = 0) => {
    const targetResults = targetRows.map(row => calculateMonthlyPayrollLine(row, defaultPayrollSettings, calendarDays));
    const context = sifRunContext(month, year, offsetMinutes);
    const masters = hrEmployees.map(employeeToSifMaster);
    const lines = payrollRowsToSifLines(targetRows, targetResults);
    const errors = validateSifExport(lines, masters, context);
    if (errors.length) return errors;
    downloadBlob(new Blob([buildSifCsv(lines, masters, context)], { type: "text/csv;charset=utf-8" }), sifFileName(context));
    appendAuditLog({ action: "GENERATE SIF", module: "Human Resources - Payroll", record: runKey, details: `${scope}: ${targetRows.length} employee salary lines` });
    return [];
  };
  const downloadDepartmentSifs = () => {
    if (status !== "Finalized") { setMessages(["SIF can only be downloaded after payroll is finalized."]); return; }
    const groups = Array.from(groupBy(rows, row => row.department || "Unassigned").entries()).sort(([a], [b]) => a.localeCompare(b));
    const selectedGroups = sifDepartment === allDepartments ? groups : groups.filter(([dept]) => dept === sifDepartment);
    if (!selectedGroups.length) { setMessages([`No finalized payroll rows found for ${sifDepartment}.`]); return; }
    for (const [index, [dept, deptRows]] of selectedGroups.entries()) {
      const errors = downloadSifFile(deptRows, `Department ${dept}`, index);
      if (errors.length) { setSifErrors(errors); setMessages(["Department SIF validation failed. Fix the listed employee payment fields before export."]); return; }
    }
    setSifErrors([]);
    notify(`${selectedGroups.length} department SIF file${selectedGroups.length === 1 ? "" : "s"} downloaded`);
  };
  const downloadCompanySif = () => {
    if (status !== "Finalized") { setMessages(["SIF can only be downloaded after payroll is finalized."]); return; }
    const companyRows = companyPayrollRows(runs.records, runId, rows, company, month, year, loans);
    const missing = missingCompanyPayrollEmployees(companyRows, company);
    if (missing.length) { setMessages([`Company SIF needs all payroll-eligible employees. Missing: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "..." : ""}`]); return; }
    const errors = downloadSifFile(companyRows, "Company", 0);
    if (errors.length) { setSifErrors(errors); setMessages(["Company SIF validation failed. Fix the listed employee payment fields before export."]); return; }
    setSifErrors([]);
    notify("Company SIF file downloaded");
  };

  return <div className="space-y-4">
    <section className="rounded-2xl border bg-[var(--panel)] p-4 shadow-soft">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr_0.8fr_1fr_auto]">
        <SelectField label="Company" value={company} onChange={setCompany} options={companies} />
        <SelectField label="Month" value={month} onChange={setMonth} options={monthNames.map((name, index) => ({ value: String(index + 1), label: name }))} />
        <SelectField label="Year" value={year} onChange={setYear} options={["2025", "2026", "2027"]} />
        <SelectField label="Department" value={department} onChange={setDepartment} options={departments} />
        <div className="flex items-end"><Button className="w-full" onClick={loadEmployees}><UsersRound className="h-4 w-4" />Load Employees</Button></div>
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-5">
      <PayrollMetric label="Status" value={status} />
      <PayrollMetric label="Employees" value={String(rows.length)} />
      <PayrollMetric label="Total earnings" value={qar(totals.earnings)} tone="positive" />
      <PayrollMetric label="Total deductions" value={qar(totals.deductions)} tone="negative" />
      <PayrollMetric label="Net payroll" value={qar(totals.net)} tone="positive" />
    </section>

    {messages.length > 0 && <section role="alert" className={cn("rounded-xl border px-4 py-3 text-xs font-medium", messages.some(message => message.includes("passed") || message.includes("finalized")) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>{messages.map(message => <div key={message}>{message}</div>)}</section>}

    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div><h2 className="font-bold">Payroll Run Detail</h2><p className="mt-1 text-xs text-[var(--muted)]">{runKey} · {defaultPayrollSettings.salaryCalculationMethod === "calendar_days" ? `${calendarDays} calendar days` : `${defaultPayrollSettings.configuredWorkingDays} working days`}</p></div>
        <div className="ml-auto flex flex-wrap gap-2">
          {status === "New" && <Button variant="secondary" onClick={createDraft} disabled={!rows.length}>Create Draft Payroll</Button>}
          {status === "Draft" && <>
            <Button variant="secondary" onClick={() => setMessages(["Draft is editable. Update the grid and save."])}>Edit</Button>
            <Button variant="secondary" onClick={saveDraft}>Save</Button>
            <Button onClick={validate}>Validate</Button>
            <Button variant="danger" onClick={cancel}>Cancel</Button>
          </>}
          {status === "Validated" && <>
            <Button variant="secondary" onClick={submitPayrollApproval}>Submit Approval</Button>
            <Button onClick={finalize}>Finalize</Button>
            <Button variant="secondary" onClick={backToDraft}>Back to Draft</Button>
          </>}
          {status === "Finalized" && <>
            <Button variant="secondary" onClick={downloadPayrollSheet}><Download className="h-4 w-4" />Download Payroll Sheet</Button>
            <Button variant="secondary" onClick={downloadWps}><Download className="h-4 w-4" />Download WPS Sheet</Button>
            <label className="min-w-[180px]"><span className="sr-only">SIF export scope</span><select aria-label="SIF export scope" value={sifDepartment} onChange={event => setSifDepartment(event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-xs font-semibold text-medtech-navy outline-none focus:border-medtech-red focus:ring-2 focus:ring-[var(--focus-ring)]">{sifDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}</select></label>
            <Button variant="secondary" onClick={downloadDepartmentSifs}><Download className="h-4 w-4" />Download Dept SIFs</Button>
            <Button onClick={downloadCompanySif}><Download className="h-4 w-4" />Download Company SIF</Button>
            <Button variant="secondary" onClick={() => setShowAudit(value => !value)}>View Audit Log</Button>
          </>}
        </div>
      </div>
      <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-4">
        <PreviewRow label="Company" value={company} />
        <PreviewRow label="Department" value={department} />
        <PreviewRow label="Month" value={monthNames[Number(month) - 1]} />
        <PreviewRow label="Year" value={year} />
        <PreviewRow label="Status" value={status} />
        <PreviewRow label="Created by" value={currentRun?.["Created by"] || getDemoSession()?.name || PRESENTATION_USER_NAME} />
        <PreviewRow label="Finalized by" value={currentRun?.["Finalized by"] || "-"} />
        <PreviewRow label="Finalized date" value={currentRun?.["Finalized date"] || "-"} />
      </div>
      <div className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-8">
        <PayrollMetric label="Number of employees" value={String(rows.length)} />
        <PayrollMetric label="Total gross salary" value={qar(detail.grossSalary)} />
        <PayrollMetric label="Total overtime" value={qar(detail.overtimeAmount)} tone="positive" />
        <PayrollMetric label="Total linked earnings" value={qar(detail.linkedEarnings)} tone="positive" />
        <PayrollMetric label="Total salary advances" value={qar(detail.salaryAdvance)} tone="negative" />
        <PayrollMetric label="Total loan deductions" value={qar(detail.loanDeductions)} tone="negative" />
        <PayrollMetric label="Total other deductions" value={qar(detail.otherDeductions)} tone="negative" />
        <PayrollMetric label="Total leave settlement" value={qar(detail.leaveSettlement)} tone="positive" />
        <PayrollMetric label="Total EOS settlement" value={qar(detail.eosSettlement)} tone="positive" />
        <PayrollMetric label="Total net salary" value={qar(detail.netPay)} tone="positive" />
      </div>
      {status === "Finalized" && isAdminUser() && <div className="grid gap-3 border-b bg-amber-50/60 p-4 dark:bg-amber-950/20 md:grid-cols-[1fr_auto_auto]">
        <label><span className="mb-1 block text-xs font-semibold">Admin rollback / cancellation reason</span><input value={adminReason} onChange={event => setAdminReason(event.target.value)} placeholder="Required before changing finalized payroll" className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm" /></label>
        <div className="flex items-end"><Button variant="secondary" onClick={() => adminRollbackFinalized("Draft")}>Rollback to Draft</Button></div>
        <div className="flex items-end"><Button variant="danger" onClick={() => adminRollbackFinalized("Cancelled")}>Cancel Finalized</Button></div>
      </div>}
      {showAudit && <div className="border-b p-4">
        <h3 className="mb-3 text-sm font-bold">Audit Log</h3>
        {runAudit.length ? <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40">{["Time", "User", "Action", "Details"].map(column => <th key={column} className="px-3 py-2 text-[10px] uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead><tbody>{runAudit.map(row => <tr key={row.__id} className="border-b last:border-b-0"><td className="px-3 py-2">{row.Time}</td><td className="px-3 py-2">{row.User}</td><td className="px-3 py-2 font-semibold">{row.Action}</td><td className="px-3 py-2">{row.Details}</td></tr>)}</tbody></table></div> : <EmptyState title="No audit entries" description="Payroll actions for this run will appear here." />}
      </div>}
      {wpsErrors.length > 0 && <div className="border-b bg-rose-50/70 p-4 dark:bg-rose-950/20">
        <div className="mb-2 text-xs font-bold text-rose-700">WPS export blocked</div>
        <div className="overflow-x-auto rounded-xl border border-rose-200 bg-white dark:border-rose-900 dark:bg-slate-950/30"><table className="w-full min-w-[520px] text-left text-xs"><thead><tr className="border-b text-[10px] uppercase tracking-wide text-rose-500"><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Missing / invalid field</th></tr></thead><tbody>{wpsErrors.map((error, index) => <tr key={`${error.employee}-${error.missingField}-${index}`} className="border-b last:border-b-0"><td className="px-3 py-2 font-semibold">{error.employee}</td><td className="px-3 py-2">{error.missingField}</td></tr>)}</tbody></table></div>
      </div>}
      {sifErrors.length > 0 && <div className="border-b bg-rose-50/70 p-4 dark:bg-rose-950/20">
        <div className="mb-2 text-xs font-bold text-rose-700">SIF export blocked</div>
        <div className="overflow-x-auto rounded-xl border border-rose-200 bg-white dark:border-rose-900 dark:bg-slate-950/30"><table className="w-full min-w-[520px] text-left text-xs"><thead><tr className="border-b text-[10px] uppercase tracking-wide text-rose-500"><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Missing / invalid field</th></tr></thead><tbody>{sifErrors.map((error, index) => <tr key={`${error.employee}-${error.missingField}-${index}`} className="border-b last:border-b-0"><td className="px-3 py-2 font-semibold">{error.employee}</td><td className="px-3 py-2">{error.missingField}</td></tr>)}</tbody></table></div>
      </div>}
      {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[2060px] text-left text-xs">
        <thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40">{["Employee Code", "Employee Name", "Department", "Basic Salary", "Gross Salary", "Working Days", "Paid Days", "Overtime", "Salary Advance", "Salary Adjustment", "Paid Vacation", "Insurance Refund", "Air Ticket", "Loan Deduction", "Leave Settlement", "EOS Settlement", "Other Deductions", "Net Pay", "Remarks"].map(label => <th key={label} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</th>)}</tr></thead>
        <tbody className="divide-y">{rows.map((row, index) => {
          const result = lineResults[index];
          return <tr key={row.employeeCode} className={cn("hover:bg-slate-50/70 dark:hover:bg-slate-900/40", locked && "bg-slate-50/40 dark:bg-slate-900/20")}>
            <td className="px-3 py-3 font-semibold">{row.employeeCode}</td>
            <td className="px-3 py-3">{row.employeeName}</td>
            <td className="px-3 py-3 text-[var(--muted)]">{row.department}</td>
            <td className="px-3 py-3">{qar(row.basicSalary)}</td>
            <td className="px-3 py-3 font-semibold">{qar(row.grossSalary)}</td>
            <td className="px-3 py-3"><ReadOnlyGridNumber label={`Working days for ${row.employeeName}`} value={row.workingDays} /></td>
            <td className="px-3 py-3"><ReadOnlyGridNumber label={`Paid days for ${row.employeeName}`} value={row.paidDays} /></td>
            <td className="px-3 py-3 font-semibold text-medtech-navy">{qar(row.overtimeAmount)}</td>
            <td className="px-3 py-3 text-rose-600">{qar(row.salaryAdvanceAmount)}</td>
            <td className={cn("px-3 py-3 font-semibold", row.salaryAdjustmentAmount < 0 ? "text-rose-600" : "text-medtech-navy")}>{qar(row.salaryAdjustmentAmount)}</td>
            <td className="px-3 py-3 text-medtech-navy">{qar(row.paidVacationSalaryAmount)}</td>
            <td className="px-3 py-3 text-medtech-navy">{qar(row.insuranceRefundAmount)}</td>
            <td className="px-3 py-3 text-medtech-navy">{qar(row.airTicketEncashmentAmount)}</td>
            <td className="px-3 py-3 text-rose-600">{qar(row.loanDeduction)}</td>
            <td className="px-3 py-3">{qar(row.leaveSettlementAmount)}</td>
            <td className="px-3 py-3">{qar(row.eosSettlementAmount)}</td>
            <td className="px-3 py-3"><GridNumber value={row.otherDeductions} locked={locked} onChange={value => updateRow(row.employeeCode, { otherDeductions: value })} /></td>
            <td className={cn("px-3 py-3 font-bold", result.netPay < 0 ? "text-rose-600" : "text-medtech-navy")}>{qar(result.netPay)}</td>
            <td className="px-3 py-3"><input aria-label={`Remarks for ${row.employeeName}`} disabled={locked} value={row.remarks} onChange={event => updateRow(row.employeeCode, { remarks: event.target.value })} className="h-9 w-44 rounded-lg border bg-[var(--panel)] px-2 text-xs disabled:bg-slate-100 dark:disabled:bg-slate-900" /></td>
          </tr>;
        })}</tbody>
      </table></div> : <EmptyState title="No employees loaded" description="Select company, month, year and department, then load employees." />}
      <div className="flex justify-between border-t px-4 py-3 text-[11px] text-slate-400"><span>{rows.length} employee lines</span><span>{locked ? "Finalized payroll is locked" : "Draft lines are editable until finalized"}</span></div>
    </section>

    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="border-b p-4"><h3 className="font-bold">Payroll Runs</h3></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40">{["Run", "Company", "Department", "Month", "Year", "Employees", "Net", "Status", "Action"].map(column => <th key={column} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead><tbody className="divide-y">{runs.records.map(run => <tr key={run.__id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40"><td className="px-4 py-3 font-semibold">{run.Run}</td><td className="px-4 py-3">{run.Company}</td><td className="px-4 py-3">{run.Department}</td><td className="px-4 py-3">{monthNames[Number(run.Month) - 1] || run.Month}</td><td className="px-4 py-3">{run.Year}</td><td className="px-4 py-3">{run.Employees}</td><td className="px-4 py-3 font-semibold text-medtech-navy">{run.Net}</td><td className="px-4 py-3"><StatusBadge>{run.Status}</StatusBadge></td><td className="px-4 py-3"><button onClick={() => openRun(run)} className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold text-medtech-navy hover:bg-[var(--navy-tint)]">Open</button></td></tr>)}</tbody></table></div>
    </section>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs text-white"><CheckCircle2 className="h-4 w-4 text-red-300" />{toast}</div>}
  </div>;
}

function EmployeeLoansModule() {
  const store = useDemoRecords("hr-payroll:Loans", employeeLoanSeed);
  const loans = store.records as Array<DemoRecord & LoanRecord>;
  const [selectedEmployee, setSelectedEmployee] = useState(hrEmployees[0]["Full Name"]);
  const [loanType, setLoanType] = useState("Employee loan");
  const [loanAmount, setLoanAmount] = useState(12000);
  const [installmentAmount, setInstallmentAmount] = useState(1000);
  const [startMonth, setStartMonth] = useState(String(new Date().getMonth() + 1));
  const [startYear, setStartYear] = useState(String(new Date().getFullYear()));
  const [remarks, setRemarks] = useState("");
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const employee = hrEmployees.find(row => row["Full Name"] === selectedEmployee) || hrEmployees[0];
  const selectedLoan = loans.find(loan => loan.__id === selectedLoanId) || loans[0];
  const selectedSchedule = selectedLoan ? parseLoanSchedule(selectedLoan.Schedule) : [];
  const installmentCount = loanInstallmentCount(loanAmount, installmentAmount);
  const notify = (value: string) => { setToast(value); window.setTimeout(() => setToast(""), 2600); };
  const updateLoan = (loan: DemoRecord & LoanRecord) => store.update(loan.__id, loan);
  const approve = () => {
    if (!loanType.trim()) { setMessage("Loan type is required."); return; }
    if (!installmentCount) { setMessage("Loan amount and installment amount must be greater than zero."); return; }
    const record: LoanRecord = {
      Loan: nextLoanNo(),
      Company: employeeCompany(employee),
      Employee: employee["Full Name"],
      "Employee Code": employee["Employee No"] || employee["Employee Code"],
      Department: employee.Department,
      "Loan type": loanType,
      "Loan amount": qar(loanAmount),
      "Installment amount": qar(installmentAmount),
      "Number of installments": String(installmentCount),
      "Start month": startMonth,
      "Start year": startYear,
      Remarks: remarks,
      Status: "active",
      Schedule: JSON.stringify(buildLoanSchedule(loanAmount, installmentAmount, Number(startMonth), Number(startYear)))
    };
    const created = store.create(record);
    setSelectedLoanId(created.__id);
    setMessage("");
    appendAuditLog({ action: "APPROVE LOAN", module: "Human Resources - Payroll", record: record.Loan, details: `${record.Employee} ${record["Loan amount"]}` });
    notify("Loan approved and schedule generated");
  };
  const postpone = (installmentId: string) => {
    if (!selectedLoan) return;
    updateLoan(postponeInstallment(selectedLoan, installmentId));
    appendAuditLog({ action: "POSTPONE LOAN INSTALLMENT", module: "Human Resources - Payroll", record: selectedLoan.Loan, details: installmentId });
    notify("Installment postponed");
  };
  const cancelSelectedLoan = () => {
    if (!selectedLoan) return;
    updateLoan(cancelLoan(selectedLoan));
    appendAuditLog({ action: "CANCEL LOAN", module: "Human Resources - Payroll", record: selectedLoan.Loan, details: selectedLoan.Remarks || "Cancelled by HR" });
    notify("Loan cancelled");
  };
  const completeIfZero = () => {
    if (!selectedLoan) return;
    if (loanBalance(selectedLoan) > 0) { setMessage("Loan still has outstanding balance."); return; }
    updateLoan({ ...selectedLoan, Status: "completed" });
    setMessage("");
    notify("Loan marked completed");
  };
  const refreshCompleted = () => refreshCompletedLoans(loans).forEach(updateLoan);

  return <div className="space-y-4">
    <section className="grid gap-4 xl:grid-cols-[0.85fr_1.35fr]">
      <div className="rounded-2xl border bg-[var(--panel)] p-5 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-bold">Loan Creation</h2><p className="mt-1 text-xs text-[var(--muted)]">Approved loans generate monthly installments for payroll deduction.</p></div><StatusBadge>active</StatusBadge></div>
        {message && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{message}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Company" value={employeeCompany(employee)} />
          <SelectField label="Employee" value={selectedEmployee} onChange={setSelectedEmployee} options={hrEmployees.map(row => row["Full Name"])} />
          <ReadOnlyField label="Employee code" value={employee["Employee No"] || employee["Employee Code"]} />
          <ReadOnlyField label="Department" value={employee.Department} />
          <label><span className="mb-1 block text-xs font-semibold">Loan type / What loan</span><input value={loanType} onChange={event => setLoanType(event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm" /></label>
          <NumberField label="Loan amount" value={loanAmount} onChange={setLoanAmount} />
          <NumberField label="Installment amount" value={installmentAmount} onChange={setInstallmentAmount} />
          <ReadOnlyField label="Number of installments" value={String(installmentCount || "-")} />
          <SelectField label="Start month" value={startMonth} onChange={setStartMonth} options={monthNames.map((name, index) => ({ value: String(index + 1), label: name }))} />
          <SelectField label="Start year" value={startYear} onChange={setStartYear} options={["2025", "2026", "2027", "2028"]} />
          <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold">Remarks</span><input value={remarks} onChange={event => setRemarks(event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm" /></label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><Button onClick={approve}><CheckCircle2 className="h-4 w-4" />Approve Loan</Button><Button variant="secondary" onClick={refreshCompleted}>Mark Completed if Balance is Zero</Button></div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div><h2 className="font-bold">Loan Details</h2><p className="mt-1 text-xs text-[var(--muted)]">Schedule, balance and installment actions.</p></div>
          {selectedLoan && <div className="ml-auto w-full sm:w-80"><SelectField label="Open loan" value={selectedLoan.__id} onChange={setSelectedLoanId} options={loans.map(loan => ({ value: loan.__id, label: `${loan.Loan} - ${loan.Employee}` }))} /></div>}
        </div>
        {selectedLoan ? <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <PayrollMetric label="Status" value={selectedLoan.Status} />
            <PayrollMetric label="Loan amount" value={selectedLoan["Loan amount"]} />
            <PayrollMetric label="Installment" value={selectedLoan["Installment amount"]} />
            <PayrollMetric label="Balance" value={qar(loanBalance(selectedLoan))} tone={loanBalance(selectedLoan) > 0 ? "negative" : "positive"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><Button variant="danger" onClick={cancelSelectedLoan} disabled={selectedLoan.Status === "cancelled"}>Cancel Loan</Button><Button variant="secondary" onClick={completeIfZero}>Mark Completed if Balance is Zero</Button></div>
          <div className="mt-4 overflow-x-auto rounded-xl border"><table className="w-full min-w-[920px] text-left text-xs"><thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40">{["No.", "Due month", "Due year", "Amount", "Status", "Payroll run", "History", "Action"].map(column => <th key={column} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead><tbody className="divide-y">{selectedSchedule.map(item => <tr key={item.id}><td className="px-3 py-3 font-semibold">{item.installmentNo}</td><td className="px-3 py-3">{monthNames[item.dueMonth - 1]}</td><td className="px-3 py-3">{item.dueYear}</td><td className="px-3 py-3">{qar(item.amount)}</td><td className="px-3 py-3"><StatusBadge>{item.status}</StatusBadge></td><td className="px-3 py-3">{item.payrollRun || "-"}</td><td className="px-3 py-3">{item.status === "postponed" && item.newDueMonth ? `Moved to ${monthNames[item.newDueMonth - 1]} ${item.newDueYear}` : item.postponedFromId ? `From ${item.postponedFromId}` : "-"}</td><td className="px-3 py-3">{item.status === "pending" ? <button onClick={() => postpone(item.id)} className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold text-medtech-navy hover:bg-[var(--navy-tint)]">Postpone</button> : <span className="text-slate-400">Locked</span>}</td></tr>)}</tbody></table></div>
        </div> : <EmptyState title="No loans recorded" description="Approve a loan to generate its schedule." />}
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="border-b p-4"><h3 className="font-bold">Employee Loan History</h3></div>
      {loans.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-xs"><thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40">{["Loan", "Employee", "Employee Code", "Department", "Loan type", "Loan amount", "Installment", "Balance", "Start", "Status"].map(column => <th key={column} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead><tbody className="divide-y">{loans.map(loan => <tr key={loan.__id} onClick={() => setSelectedLoanId(loan.__id)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40"><td className="px-4 py-3 font-semibold">{loan.Loan}</td><td className="px-4 py-3">{loan.Employee}</td><td className="px-4 py-3">{loan["Employee Code"]}</td><td className="px-4 py-3">{loan.Department}</td><td className="px-4 py-3">{loan["Loan type"]}</td><td className="px-4 py-3">{loan["Loan amount"]}</td><td className="px-4 py-3">{loan["Installment amount"]}</td><td className="px-4 py-3 font-semibold">{qar(loanBalance(loan))}</td><td className="px-4 py-3">{monthNames[Number(loan["Start month"]) - 1]} {loan["Start year"]}</td><td className="px-4 py-3"><StatusBadge>{loan.Status}</StatusBadge></td></tr>)}</tbody></table></div> : <EmptyState title="No employee loan history" description="Loan history appears after HR approves a loan." />}
    </section>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs text-white"><CheckCircle2 className="h-4 w-4 text-red-300" />{toast}</div>}
  </div>;
}

type PayrollReportName = "Monthly Payroll Summary" | "Employee Payroll History" | "Loan Deduction Report" | "Leave Settlement Report" | "End of Service Report";

const payrollReportNames: PayrollReportName[] = ["Monthly Payroll Summary", "Employee Payroll History", "Loan Deduction Report", "Leave Settlement Report", "End of Service Report"];

function PayrollReportsModule() {
  const [activeReport, setActiveReport] = useState<PayrollReportName>("Monthly Payroll Summary");
  const [query, setQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState({
    company: "All",
    department: "All",
    month: "All",
    year: "All",
    employee: "All",
    status: "All",
    from: "",
    to: ""
  });
  const [toast, setToast] = useState("");
  const runs = useDemoRecords("hr-payroll:Monthly Payroll", monthlyPayrollSeed);
  const loans = useDemoRecords("hr-payroll:Loans", employeeLoanSeed).records as Array<DemoRecord & LoanRecord>;
  const leaveSettlements = useDemoRecords("hr-operations:Payroll:Leave Settlement", leaveSettlementSeed).records;
  const finalSettlements = useDemoRecords("hr-operations:Payroll:Final Settlement", payrollViews["Final Settlement"].rows).records;
  const allRows = useMemo(() => payrollReportRows(activeReport, { runs: runs.records, loans, leaveSettlements, finalSettlements }), [activeReport, runs.records, loans, leaveSettlements, finalSettlements]);
  const columns = useMemo(() => Object.keys(allRows[0] ?? {}), [allRows]);
  const filteredRows = useMemo(() => filterPayrollReportRows(allRows, activeReport, filters, query, sortColumn, direction), [allRows, activeReport, filters, query, sortColumn, direction]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const setFilter = (key: keyof typeof filters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const toggleSort = (column: string) => {
    if (sortColumn === column) setDirection(value => value === "asc" ? "desc" : "asc");
    else { setSortColumn(column); setDirection("asc"); }
  };
  const exportRows = async () => {
    await exportToExcel(filteredRows, `payroll-${activeReport.toLowerCase().replaceAll(" ", "-")}`, activeReport);
    appendAuditLog({ action: "EXPORT PAYROLL REPORT", module: "Human Resources - Payroll", record: activeReport, details: `${filteredRows.length} rows exported` });
    notify("Excel export generated");
  };
  const downloadPdf = async () => {
    try {
      const { generateBrandedPdf } = await import("@/lib/pdf/generator");
      const result = await generateBrandedPdf({
        template: "report",
        documentNumber: `RPT-${activeReport.slice(0, 3).toUpperCase()}-${Date.now() % 10000}`,
        date: new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date()),
        partyLabel: "Payroll report",
        partyName: activeReport,
        subject: `${filteredRows.length} filtered row(s)`,
        metadata: reportPdfMetadata(filteredRows, columns),
        terms: ["Generated from the controlled MedTech payroll workspace.", "Filters, search and sort are applied before export."],
        preparedBy: getDemoSession()?.name || PRESENTATION_USER_NAME,
        approvedBy: "Payroll Manager"
      }, "blob");
      if (!(result instanceof Blob)) throw new Error("PDF generator did not return a file");
      const url = URL.createObjectURL(result);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${activeReport.toLowerCase().replaceAll(" ", "-")}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      appendAuditLog({ action: "PDF PAYROLL REPORT", module: "Human Resources - Payroll", record: activeReport, details: `${filteredRows.length} rows exported to PDF` });
      notify("PDF generated");
    } catch {
      notify("Unable to generate PDF");
    }
  };

  return <div className="space-y-4">
    <section className="rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex gap-1 overflow-x-auto px-3">{payrollReportNames.map(report => <button key={report} onClick={() => { setActiveReport(report); setQuery(""); setSortColumn(""); }} className={cn("relative whitespace-nowrap px-3 py-3 text-xs font-semibold", activeReport === report ? "text-medtech-navy" : "text-[var(--muted)]")}>{report}{activeReport === report && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-medtech-red" />}</button>)}</div>
    </section>
    <section className="rounded-2xl border bg-[var(--panel)] p-4 shadow-soft">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {["Monthly Payroll Summary", "Loan Deduction Report", "Leave Settlement Report", "End of Service Report"].includes(activeReport) && <SelectField label="Company" value={filters.company} onChange={value => setFilter("company", value)} options={["All", ...companies]} />}
        {activeReport === "Monthly Payroll Summary" && <SelectField label="Department" value={filters.department} onChange={value => setFilter("department", value)} options={["All", ...distinct(allRows, "Department")]} />}
        {["Employee Payroll History", "Loan Deduction Report", "Leave Settlement Report", "End of Service Report"].includes(activeReport) && <SelectField label="Employee" value={filters.employee} onChange={value => setFilter("employee", value)} options={["All", ...distinct(allRows, "Employee")]} />}
        {["Loan Deduction Report", "Leave Settlement Report", "End of Service Report"].includes(activeReport) && <SelectField label="Status" value={filters.status} onChange={value => setFilter("status", value)} options={["All", ...distinct(allRows, "Status")]} />}
        {["Monthly Payroll Summary", "Loan Deduction Report", "Leave Settlement Report"].includes(activeReport) && <SelectField label="Month" value={filters.month} onChange={value => setFilter("month", value)} options={["All", ...monthNames.map((name, index) => ({ value: String(index + 1), label: name }))]} />}
        {["Monthly Payroll Summary", "Loan Deduction Report", "Leave Settlement Report"].includes(activeReport) && <SelectField label="Year" value={filters.year} onChange={value => setFilter("year", value)} options={["All", ...distinct(allRows, "Year")]} />}
        {["Employee Payroll History", "End of Service Report"].includes(activeReport) && <DateField label="From" value={filters.from} onChange={value => setFilter("from", value)} />}
        {["Employee Payroll History", "End of Service Report"].includes(activeReport) && <DateField label="To" value={filters.to} onChange={value => setFilter("to", value)} />}
      </div>
    </section>
    <ReportTable report={activeReport} rows={filteredRows} columns={columns} query={query} setQuery={setQuery} sortColumn={sortColumn} direction={direction} toggleSort={toggleSort} exportRows={exportRows} downloadPdf={downloadPdf} />
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs text-white"><CheckCircle2 className="h-4 w-4 text-red-300" />{toast}</div>}
  </div>;
}

function LeaveSettlementModule() {
  const store = useDemoRecords("hr-operations:Payroll:Leave Settlement", leaveSettlementSeed);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<Record<string, string>>(() => newLeaveSettlementForm(hrEmployees[0]));
  const selectedEmployee = useMemo(() => findEmployee(form["Employee Code"], form.Employee) || hrEmployees[0], [form]);
  const month = Number(form["Payroll month"]) || new Date().getMonth() + 1;
  const year = Number(form["Payroll year"]) || new Date().getFullYear();
  const calendarDays = new Date(year, month, 0).getDate();
  const salaryBasis = form["Salary calculation basis"] === "gross_salary" ? "gross_salary" : "basic_salary";
  const baseSalary = salaryBasis === "gross_salary" ? numberValue(form["Gross Salary"]) : numberValue(form["Basic Salary"]);
  const currentLeaveBalance = currentLeaveBalanceFor(selectedEmployee);
  const leaveBalanceDays = numberValue(form["Leave balance days"]);
  const settlement = calculateLeaveSettlement(baseSalary, leaveBalanceDays, defaultPayrollSettings, calendarDays);
  const locked = form.Status === "Approved" || form.Status === "Posted to payroll";
  const notify = (value: string) => { setToast(value); window.setTimeout(() => setToast(""), 2600); };
  const setField = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const selectEmployee = (name: string) => {
    const employee = hrEmployees.find(row => row["Full Name"] === name) || hrEmployees[0];
    setForm(current => ({ ...newLeaveSettlementForm(employee), Record: current.Record, "Leave type": current["Leave type"], "Payroll month": current["Payroll month"], "Payroll year": current["Payroll year"], Status: current.Status, Remarks: current.Remarks }));
  };
  const savePayload = (status = form.Status): Record<string, string> => ({
    ...form,
    Record: form.Record === "Auto generated" ? nextLeaveSettlementNo() : form.Record,
    "Salary calculation basis": salaryBasis,
    "Salary rate per day": qar(settlement.salaryRatePerDay),
    "Settlement amount": qar(settlement.settlementAmount),
    "Payroll period": `${monthNames[month - 1]} ${year}`,
    "Payroll effect": "Earning",
    "Net effect": qar(settlement.settlementAmount),
    Status: status
  });
  const validateDraft = () => {
    if (leaveBalanceDays <= 0) return "Leave balance days must be greater than zero.";
    if (baseSalary <= 0) return "Salary is missing for this employee.";
    if (leaveBalanceDays !== currentLeaveBalance && !form.Remarks.trim()) return "Remarks are required when overriding leave balance.";
    return "";
  };
  const saveDraft = () => {
    if (locked) { setMessage("Posted settlement is locked. Cancel it as admin before editing."); return; }
    const error = validateDraft();
    if (error) { setMessage(error); return; }
    const payload = savePayload("Draft");
    if (selectedId) store.update(selectedId, payload); else setSelectedId(store.create(payload).__id);
    setForm(payload);
    setMessage("");
    notify("Leave settlement draft saved");
  };
  const approve = () => {
    if (locked) { setMessage("Posted settlement is locked."); return; }
    const error = validateDraft();
    if (error) { setMessage(error); return; }
    const payload = savePayload("Approved");
    if (selectedId) store.update(selectedId, payload); else setSelectedId(store.create(payload).__id);
    setForm(payload);
    appendAuditLog({ action: "APPROVE LEAVE SETTLEMENT", module: "Human Resources - Payroll", record: payload.Record, details: `${payload["Employee"]} approved for ${payload["Settlement amount"]}` });
    setMessage("");
    notify("Settlement approved");
  };
  const post = () => {
    if (form.Status !== "Approved") { setMessage("Approve the settlement before posting to payroll."); return; }
    const duplicate = store.records.find(row => row.__id !== selectedId && row.Employee === form.Employee && row["Leave type"] === form["Leave type"] && row["Payroll month"] === form["Payroll month"] && row["Payroll year"] === form["Payroll year"] && row.Status === "Posted to payroll");
    if (duplicate) { setMessage("This employee already has a posted leave settlement for the selected leave type and payroll period."); return; }
    const payload = savePayload("Posted to payroll");
    if (selectedId) store.update(selectedId, payload); else setSelectedId(store.create(payload).__id);
    setForm(payload);
    appendAuditLog({ action: "POST LEAVE SETTLEMENT", module: "Human Resources - Payroll", record: payload.Record, details: `${payload["Employee"]} posted to ${payload["Payroll period"]}` });
    setMessage("");
    notify("Settlement posted to payroll");
  };
  const cancel = () => {
    if (form.Status === "Posted to payroll" && !isAdminUser()) { setMessage("Only admin can cancel a posted settlement."); return; }
    if (form.Status === "Posted to payroll" && !form.Remarks.trim()) { setMessage("Cancellation reason is required in remarks."); return; }
    const payload = savePayload("Cancelled");
    if (selectedId) store.update(selectedId, payload); else setSelectedId(store.create(payload).__id);
    setForm(payload);
    appendAuditLog({ action: "CANCEL LEAVE SETTLEMENT", module: "Human Resources - Payroll", record: payload.Record, details: form.Remarks || "Cancelled" });
    notify("Settlement cancelled");
  };
  const openHistory = (record: DemoRecord) => {
    setSelectedId(record.__id);
    setForm(Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith("__"))));
    setMessage("");
  };

  return <div className="space-y-4">
    <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="rounded-2xl border bg-[var(--panel)] p-5 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-bold">Leave Settlement</h2><p className="mt-1 text-xs text-[var(--muted)]">Calculate, approve and post leave encashment into monthly payroll.</p></div><StatusBadge>{form.Status}</StatusBadge></div>
        {message && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{message}</div>}
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField label="Company" value={form.Company} onChange={value => setField("Company", value)} options={companies} disabled={locked} />
          <SelectField label="Employee" value={form.Employee} onChange={selectEmployee} options={hrEmployees.map(employee => employee["Full Name"])} disabled={locked} />
          <label><span className="mb-1 block text-xs font-semibold">Status</span><input disabled value={form.Status} className="h-10 w-full rounded-xl border bg-slate-100 px-3 text-sm dark:bg-slate-900" /></label>
          <ReadOnlyField label="Department" value={form.Department} />
          <ReadOnlyField label="Employee code" value={form["Employee Code"]} />
          <ReadOnlyField label="Basic salary" value={form["Basic Salary"]} />
          <ReadOnlyField label="Gross salary" value={form["Gross Salary"]} />
          <SelectField label="Leave type" value={form["Leave type"]} onChange={value => setField("Leave type", value)} options={["Annual leave", "Emergency leave", "Compassionate leave"]} disabled={locked} />
          <SelectField label="Salary calculation basis" value={salaryBasis} onChange={value => setField("Salary calculation basis", value)} options={[{ value: "basic_salary", label: "Basic salary" }, { value: "gross_salary", label: "Gross salary" }]} disabled={locked} />
          <label><span className="mb-1 block text-xs font-semibold">Leave balance days</span><input disabled={locked} type="number" min="0" step="0.5" value={form["Leave balance days"]} onChange={event => setField("Leave balance days", event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm disabled:bg-slate-100 dark:disabled:bg-slate-900" /></label>
          <ReadOnlyField label="Salary rate per day" value={qar(settlement.salaryRatePerDay)} />
          <ReadOnlyField label="Settlement amount" value={qar(settlement.settlementAmount)} />
          <SelectField label="Payroll month" value={form["Payroll month"]} onChange={value => setField("Payroll month", value)} options={monthNames.map((name, index) => ({ value: String(index + 1), label: name }))} disabled={locked} />
          <SelectField label="Payroll year" value={form["Payroll year"]} onChange={value => setField("Payroll year", value)} options={["2025", "2026", "2027"]} disabled={locked} />
          <label className="md:col-span-3"><span className="mb-1 block text-xs font-semibold">Remarks</span><input disabled={locked && !isAdminUser()} value={form.Remarks} onChange={event => setField("Remarks", event.target.value)} placeholder={leaveBalanceDays !== currentLeaveBalance ? "Required for manual leave balance override" : "Optional notes or cancellation reason"} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm disabled:bg-slate-100 dark:disabled:bg-slate-900" /></label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><Button variant="secondary" onClick={saveDraft} disabled={locked}>Save Draft</Button><Button onClick={approve} disabled={locked}>Approve Settlement</Button><Button variant="secondary" onClick={post} disabled={form.Status !== "Approved"}>Post to Payroll</Button><Button variant="danger" onClick={cancel}>Cancel</Button></div>
      </div>
      <div className="rounded-2xl border bg-[var(--panel)] p-5 shadow-soft">
        <h3 className="font-bold">Settlement Preview</h3>
        <div className="mt-4 space-y-3 text-sm">
          <PreviewRow label="Current leave balance" value={`${currentLeaveBalance} days`} />
          <PreviewRow label="Selected balance" value={`${leaveBalanceDays} days`} />
          <PreviewRow label="Payroll period" value={`${monthNames[month - 1]} ${year}`} />
          <PreviewRow label="Daily rate basis" value={defaultPayrollSettings.salaryCalculationMethod === "calendar_days" ? `${calendarDays} calendar days` : `${defaultPayrollSettings.configuredWorkingDays} working days`} />
          <PreviewRow label="Salary rate" value={qar(settlement.salaryRatePerDay)} />
          <div className="rounded-xl bg-[var(--navy-tint)] p-4 text-medtech-navy dark:bg-[var(--elevated)] dark:text-red-100"><div className="text-xs">Settlement amount</div><div className="mt-1 text-2xl font-bold">{qar(settlement.settlementAmount)}</div></div>
        </div>
      </div>
    </section>
    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="border-b p-4"><h3 className="font-bold">Settlement History</h3></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40">{["Record","Employee","Leave type","Leave balance days","Salary calculation basis","Settlement amount","Payroll period","Status","Action"].map(column => <th key={column} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead><tbody className="divide-y">{store.records.map(row => <tr key={row.__id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40"><td className="px-4 py-3 font-semibold">{row.Record}</td><td className="px-4 py-3">{row.Employee}</td><td className="px-4 py-3">{row["Leave type"]}</td><td className="px-4 py-3">{row["Leave balance days"]}</td><td className="px-4 py-3">{row["Salary calculation basis"]}</td><td className="px-4 py-3 font-semibold text-medtech-navy">{row["Settlement amount"]}</td><td className="px-4 py-3">{row["Payroll period"]}</td><td className="px-4 py-3"><StatusBadge>{row.Status}</StatusBadge></td><td className="px-4 py-3"><button onClick={() => openHistory(row)} className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold text-medtech-navy hover:bg-[var(--navy-tint)]">Open</button></td></tr>)}</tbody></table></div>
    </section>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs text-white"><CheckCircle2 className="h-4 w-4 text-red-300" />{toast}</div>}
  </div>;
}

function PayProcess() {
  const [employee, setEmployee] = useState(hrEmployees[0]["Full Name"]);
  const [period, setPeriod] = useState("June 2026");
  const [manualEarning, setManualEarning] = useState(0);
  const [manualDeduction, setManualDeduction] = useState(0);
  const [manualAbsenceDays, setManualAbsenceDays] = useState(0);
  const [toast, setToast] = useState("");
  const selectedEmployee = hrEmployees.find(row => row["Full Name"] === employee) || hrEmployees[0];
  const linked = useMemo(() => linkedPayrollInputs(employee, period), [employee, period]);
  const base = linked.salaryBase || numberValue(selectedEmployee["Basic Salary"]);
  const periodDays = daysInPayrollPeriod(period);
  const absences = useMemo(() => linkedAbsences(employee, period, base, periodDays), [employee, period, base, periodDays]);
  const summary = calculateNetPay({
    baseSalary: base,
    items: [...linked.items, { effect: "Earning", amount: manualEarning }, { effect: "Deduction", amount: manualDeduction }],
    deductedAbsenceDays: absences.days + manualAbsenceDays,
    periodDays
  });
  const periodSlug = period.toUpperCase().replace(/\s+/g, "-");
  const linkedRows = [...linked.rows, ...absences.rows];
  const seed = [{ "Payroll run": "PAY-JUNE-2026-MT0018", Employee: "Fahad Al-Kuwari", Period: "June 2026", "Base salary": "QAR 14,500.00", Earnings: "QAR 1,500.00", Deductions: "QAR 4,483.33", "Net pay": "QAR 11,516.67", Inputs: "3 linked", Status: "Processed" }];
  const store = useDemoRecords("hr-pay-process", seed);
  const save = () => {
    const employeeCode = selectedEmployee["Employee No"];
    const run = { "Payroll run": `PAY-${periodSlug}-${employeeCode.replace("MT-", "")}`, Employee: employee, Period: period, "Base salary": qar(summary.baseSalary), Earnings: qar(summary.earnings), Deductions: qar(summary.deductions + summary.absenceDeduction), "Net pay": qar(summary.netPay), Inputs: `${linkedRows.length} linked`, Status: "Processed" };
    const existing = store.records.find(row => row["Payroll run"] === run["Payroll run"]);
    if (existing) store.update(existing.__id, run); else store.create(run);
    appendAuditLog({ action: "PROCESS PAYROLL", module: "Human Resources - Payroll", record: run["Payroll run"], details: `${linkedRows.length} linked input(s); net pay ${run["Net pay"]} calculated for ${employee}` });
    setToast("Pay process saved with linked payroll inputs");
    window.setTimeout(() => setToast(""), 2600);
  };
  const pdf = async () => {
    const { generateBrandedPdf } = await import("@/lib/pdf/generator");
    const employeeCode = selectedEmployee["Employee No"];
    const result = await generateBrandedPdf({ template: "payslip", documentNumber: `PSL-${periodSlug}-${employeeCode}`, date: "20 June 2026", partyLabel: "Employee", partyName: employee, subject: `${period} payroll`, metadata: [["Employee ID", employeeCode], ["Department", selectedEmployee.Department], ["Salary source", linked.salarySource || "Employee master"], ["Base salary", qar(summary.baseSalary)], ["Linked earnings", qar(summary.earnings - manualEarning)], ["Manual earnings", qar(manualEarning)], ["Linked/manual deductions", qar(summary.deductions)], ["Absence deduction", qar(summary.absenceDeduction)], ["Net pay", qar(summary.netPay)], ...linkedRows.map(row => [`${row.Source} - ${row.Record}`, `${row.Effect}: ${row.Amount}`] as [string, string])], terms: ["Private and confidential payroll document."], preparedBy: getDemoSession()?.name || PRESENTATION_USER_NAME, approvedBy: "Finance Manager" }, "blob");
    if (!(result instanceof Blob)) return;
    const url = URL.createObjectURL(result);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${employeeCode}-${period.toLowerCase().replaceAll(" ", "-")}-payslip.pdf`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <>
    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.45fr]">
      <div className="rounded-2xl border bg-[var(--panel)] p-5 shadow-soft">
        <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-medtech-red" /><h2 className="font-bold">Pay process</h2></div>
        <p className="mt-1 text-xs text-[var(--muted)]">Pulls approved payroll modules and deducted absences into one final pay run.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold">Employee</span><select value={employee} onChange={event => setEmployee(event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm">{hrEmployees.map(row => <option key={row["Employee No"]}>{row["Full Name"]}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold">Payroll period</span><select value={period} onChange={event => setPeriod(event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm">{payrollPeriods().map(value => <option key={value}>{value}</option>)}</select></label>
          <NumberField label="Manual earnings" value={manualEarning} onChange={setManualEarning} />
          <NumberField label="Manual deductions" value={manualDeduction} onChange={setManualDeduction} />
          <NumberField label="Manual absence days" value={manualAbsenceDays} onChange={setManualAbsenceDays} step={0.5} />
          <div className="rounded-xl border bg-slate-50 p-3 dark:bg-slate-900/40"><div className="text-[10px] text-slate-400">Daily rate - {periodDays}-day month</div><div className="mt-1 font-bold">{qar(summary.dailyRate)}</div></div>
        </div>
        <div className="mt-4 rounded-xl border bg-[var(--navy-tint)] p-3 text-xs text-medtech-navy dark:bg-[var(--elevated)] dark:text-red-100">Salary source: <b>{linked.salarySource || "Employee master"}</b></div>
        <div className="mt-5 flex flex-wrap gap-2"><Button onClick={save}><Banknote className="h-4 w-4" />Save pay process</Button><Button variant="secondary" onClick={pdf}><FileText className="h-4 w-4" />Generate payslip</Button></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[["Base salary", summary.baseSalary, "neutral"], ["Linked earnings", summary.earnings - manualEarning, "positive"], ["Manual earnings", manualEarning, "positive"], ["Deductions", summary.deductions, "negative"], ["Absence deduction", summary.absenceDeduction, "negative"], ["Calculated net pay", summary.netPay, "positive"]].map(([label, value, tone]) => <div key={String(label)} className={cn("rounded-2xl border bg-[var(--panel)] p-5 shadow-soft", label === "Calculated net pay" && "sm:col-span-2 xl:col-span-2")}><div className="text-xs text-[var(--muted)]">{String(label)}</div><div className={cn("mt-2 text-xl font-bold", tone === "positive" && "text-medtech-navy", tone === "negative" && "text-rose-600")}>{qar(Number(value))}</div></div>)}</div>
    </section>
    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="border-b p-4"><h3 className="font-bold">Linked payroll inputs</h3><p className="mt-1 text-xs text-[var(--muted)]">Approved module entries and deducted absence records included in this run.</p></div>
      {linkedRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40">{["Source", "Record", "Date", "Effect", "Amount", "Status"].map(key => <th key={key} className="px-4 py-3 text-[10px] uppercase tracking-wide text-slate-400">{key}</th>)}</tr></thead><tbody>{linkedRows.map(row => <tr key={`${row.Source}-${row.Record}`} className="border-b"><td className="px-4 py-3 font-semibold">{row.Source}</td><td className="px-4 py-3">{row.Record}</td><td className="px-4 py-3">{row.Date}</td><td className="px-4 py-3">{row.Effect}</td><td className="px-4 py-3">{row.Amount}</td><td className="px-4 py-3"><StatusBadge>{row.Status}</StatusBadge></td></tr>)}</tbody></table></div> : <EmptyState title="No linked payroll inputs" description="Approved overtime, advances, loans, vacation salary and deducted absence records for this employee and period will appear here." />}
    </section>
    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="border-b p-4"><h3 className="font-bold">Past payroll runs</h3></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40">{Object.keys(seed[0]).map(key => <th key={key} className="px-4 py-3 text-[10px] uppercase tracking-wide text-slate-400">{key}</th>)}</tr></thead><tbody>{store.records.map(row => <tr key={row.__id} className="border-b">{Object.keys(seed[0]).map(key => <td key={key} className="px-4 py-3">{key === "Status" ? <StatusBadge>{row[key]}</StatusBadge> : row[key]}</td>)}</tr>)}</tbody></table></div>
    </section>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs text-white"><CheckCircle2 className="h-4 w-4 text-red-300" />{toast}</div>}
  </>;
}

type LinkedPayrollRow = { Source: string; Record: string; Date: string; Effect: string; Amount: string; Status: string };

function linkedPayrollInputs(employee: string, period: string) {
  const rows: LinkedPayrollRow[] = [];
  const items: Array<{ effect: PayrollEffect; amount: number }> = [];
  let salaryBase = 0;
  let salarySource = "";
  payrollModules.forEach(module => {
    const records = readDemoRecordsSnapshot(`hr-operations:Payroll:${module}`, payrollViews[module].rows);
    records
      .filter(row => row.Employee === employee && periodMatches(row["Payroll period"], period) && payrollStatusCounts(row.Status))
      .forEach(row => {
        const effect = (row["Payroll effect"] || "Neutral") as PayrollEffect;
        const net = numberValue(row["Net effect"]);
        const calculated = numberValue(row["Calculated amount"]) || numberValue(row["Fixed amount"]) || numberValue(row.Rate);
        if (module === "Salary Records" && calculated > 0) {
          if (!salaryBase) {
            salaryBase = calculated;
            salarySource = `${row.Record} (${row["Document date"]})`;
          }
          rows.push({ Source: module, Record: row.Record, Date: row["Document date"], Effect: "Base salary", Amount: qar(calculated), Status: row.Status });
          return;
        }
        if (effect === "Earning" && net > 0) items.push({ effect, amount: net });
        if (effect === "Deduction" && net < 0) items.push({ effect, amount: Math.abs(net) });
        if (net || calculated) rows.push({ Source: module, Record: row.Record, Date: row["Document date"], Effect: effect, Amount: qar(net || calculated), Status: row.Status });
      });
  });
  return { items, rows, salaryBase, salarySource };
}

function linkedAbsences(employee: string, period: string, baseSalary: number, periodDays: number) {
  const dailyRate = baseSalary / periodDays;
  let days = 0;
  const rows = readDemoRecordsSnapshot("hr-operations:Attendance:Absence Monitoring", attendanceViews["Absence Monitoring"].rows)
    .filter(row => row.Employee === employee && row.Status === "Deducted" && periodMatches(row.Date, period))
    .map(row => {
      const impact = numberValue(row["Payroll impact"]);
      const rowDays = numberValue(row.Days) || (dailyRate ? impact / dailyRate : 0);
      days += rowDays;
      return { Source: "Absence Monitoring", Record: row.Absence, Date: row.Date, Effect: "Deduction", Amount: qar(impact || rowDays * dailyRate), Status: row.Status };
    });
  return { days, rows };
}

function payrollPeriods() {
  const periods = payrollModules.flatMap(module => readDemoRecordsSnapshot(`hr-operations:Payroll:${module}`, payrollViews[module].rows).map(row => row["Payroll period"]));
  const absencePeriods = readDemoRecordsSnapshot("hr-operations:Attendance:Absence Monitoring", attendanceViews["Absence Monitoring"].rows).map(row => periodFromDate(row.Date));
  return Array.from(new Set(["June 2026", "May 2026", ...periods, ...absencePeriods].filter(Boolean)));
}

function nextPayrollItemNo(module: string) {
  return `PCI-${new Date().getFullYear()}-${module.slice(0, 3).toUpperCase()}-${String(Date.now() % 10000).padStart(4, "0")}`;
}

function payrollStatusCounts(status?: string) {
  return status === "Approved" || status === "Processed";
}

function periodMatches(value: string | undefined, period: string) {
  return value === period || periodFromDate(value) === period;
}

function periodFromDate(value?: string) {
  if (!value?.trim()) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en", { month: "long", year: "numeric" });
}

function daysInPayrollPeriod(period: string) {
  const match = period.match(/^([A-Za-z]+)\s+(\d{4})$/);
  const month = match ? monthNumber(match[1]) : 0;
  const year = match ? Number(match[2]) : 0;
  return month && year ? new Date(year, month, 0).getDate() : 30;
}

function monthNumber(name: string) {
  return ["january","february","march","april","may","june","july","august","september","october","november","december"].indexOf(name.toLowerCase()) + 1;
}

function employeeSalaryMap() {
  const map = new Map<string, number>();
  hrEmployees.forEach(employee => {
    map.set(employee["Full Name"].trim().toLowerCase(), numberValue(employee["Basic Salary"]));
    map.set(employee["Employee No"].trim().toLowerCase(), numberValue(employee["Basic Salary"]));
  });
  return map;
}

function upsertSnapshot(moduleKey: string, seedRows: Array<Record<string, string>>, key: string, rows: Array<Record<string, string>>) {
  const current = readDemoRecordsSnapshot(moduleKey, seedRows);
  const byKey = new Map(current.map(row => [row[key], row]));
  const nextRows = rows.map((row, index) => byKey.has(row[key]) ? { ...byKey.get(row[key])!, ...row } : createDemoRecord(row, index));
  const rowKeys = new Set(rows.map(row => row[key]));
  writeDemoRecordsSnapshot(moduleKey, [...nextRows, ...current.filter(row => !rowKeys.has(row[key]))]);
}

function writePayrollAccountingDrafts(runKey: string, rows: MonthlyPayrollRow[], results: ReturnType<typeof calculateMonthlyPayrollLine>[]) {
  const lines = rows.map((row, rowIndex) => ({
    "Journal No": nextPayrollJournalLineNo(rowIndex, 0),
    "Payroll Run": runKey,
    "Employee Code": row.employeeCode,
    "Employee Name": row.employeeName,
    "Cost Center": payrollCostCenter(row),
    "Allocation %": "100",
    Amount: qar(results[rowIndex]?.netPay || row.grossSalary),
    "Finance Journal Draft": "Draft",
    Status: "Generated"
  }));
  const totalsByCostCenter = lines.reduce((map, line) => map.set(line["Cost Center"], (map.get(line["Cost Center"]) || 0) + numberValue(line.Amount)), new Map<string, number>());
  const financeDrafts = new Map(Array.from(totalsByCostCenter.entries()).map(([costCenter, amount]) => {
    const journal = writeFinanceJournalDraft({ sourceModule: "Payroll", sourceRecord: `${runKey}-${costCenter}`, amount: qar(amount), debit: `Salary expense - ${costCenter}`, credit: "Payroll payable", costCenter, notes: "Payroll cost center split draft only - no real GL posting" });
    return [costCenter, journal["Journal No"]];
  }));
  const enriched = lines.map(line => ({ ...line, "Finance Journal Draft": financeDrafts.get(line["Cost Center"]) || "Draft" }));
  const moduleKey = "hr-enterprise:Payroll Accounting Draft Journal";
  const current = readDemoRecordsSnapshot(moduleKey, hrViews["Payroll Accounting Draft Journal"].rows);
  writeDemoRecordsSnapshot(moduleKey, [...enriched.map(createDemoRecord), ...current.filter(row => row["Payroll Run"] !== runKey)]);
  appendAuditLog({ action: "PAYROLL ACCOUNTING DRAFT", module: "Human Resources - Payroll", record: runKey, details: `${enriched.length} employee payroll draft lines generated locally` });
  return enriched;
}

function payrollCostCenter(row: MonthlyPayrollRow) {
  const employee = hrEmployees.find(item => item["Employee No"] === row.employeeCode || item["Full Name"] === row.employeeName);
  return employee?.["Cost Centre"] || row.department || "Payroll";
}

function nextPayrollJournalLineNo(rowIndex: number, splitIndex: number) {
  return `PAY-JRN-${new Date().getFullYear()}-${String(Date.now() % 10000).padStart(4, "0")}-${rowIndex + 1}${splitIndex + 1}`;
}

function employeeToMonthlyPayrollRow(employee: Record<string, string>, period: string, calendarDays: number, loans: Array<Pick<LoanRecord, "Employee Code" | "Status" | "Schedule">> = [], month = 0, year = 0): MonthlyPayrollRow {
  const basicSalary = numberValue(employee["Basic Salary"]) || numberValue(employee.Basic);
  const grossSalary = numberValue(employee["Total Salary"]) || numberValue(employee.Total) || basicSalary + employeeAllowances(employee);
  const allowances = Math.max(0, grossSalary - basicSalary) || employeeAllowances(employee);
  const unpaidDays = monthlyDeductedAbsenceDays(employee["Full Name"], period);
  return {
    employeeCode: employee["Employee No"] || employee["Employee Code"],
    employeeName: employee["Full Name"],
    designation: employee["Job Title"] || employee.Designation,
    department: employee.Department,
    basicSalary,
    allowances,
    grossSalary,
    workingDays: calendarDays,
    paidDays: Math.max(0, calendarDays - unpaidDays),
    unpaidDays,
    leaveDays: 0,
    loanDeduction: month && year ? pendingLoanDeductionForEmployee(loans, employee["Employee No"] || employee["Employee Code"], month, year) : moduleMonthlyAmount("Employee Loan", employee["Full Name"], period),
    otherDeductions: 0,
    overtimeHours: moduleMonthlyQuantity("Overtime", employee["Full Name"], period),
    overtimeAmount: moduleMonthlyAmount("Overtime", employee["Full Name"], period),
    salaryAdvanceAmount: moduleMonthlyAmount("Salary Advance", employee["Full Name"], period),
    salaryAdjustmentAmount: moduleSignedMonthlyAmount("Salary Adjustment", employee["Full Name"], period),
    paidVacationSalaryAmount: moduleMonthlyAmount("Paid Vacation Salary", employee["Full Name"], period),
    insuranceRefundAmount: moduleMonthlyAmount("Insurance Claims / Refund", employee["Full Name"], period),
    airTicketEncashmentAmount: moduleMonthlyAmount("Air Ticket Encashment", employee["Full Name"], period),
    leaveSettlementAmount: moduleMonthlyAmount("Leave Settlement", employee["Full Name"], period),
    eosSettlementAmount: moduleMonthlyAmount("Final Settlement", employee["Full Name"], period),
    hasBankDetails: Boolean(employee.IBAN || employee["IBAN No."] || employee["Account No"]),
    remarks: "",
    status: "Draft"
  };
}

function buildMonthlyPayrollSeed() {
  const month = demoPayrollMonth;
  const year = demoPayrollYear;
  const calendarDays = new Date(Number(year), Number(month), 0).getDate();
  const period = `${monthNames[Number(month) - 1]} ${year}`;
  const rows = hrEmployees
    .filter(employee => isPayrollEmployee(employee) && employeeCompany(employee) === companies[0])
    .sort((a, b) => a.Department.localeCompare(b.Department) || a["Full Name"].localeCompare(b["Full Name"]))
    .map(employee => ({ ...employeeToMonthlyPayrollRow(employee, period, calendarDays, employeeLoanSeed, Number(month), Number(year)), status: "Finalized" }));
  const results = rows.map(row => calculateMonthlyPayrollLine(row, defaultPayrollSettings, calendarDays));
  return [{ ...monthlyRunRecord(monthlyRunKey(companies[0], month, year, allDepartments), companies[0], month, year, allDepartments, rows, results, "Finalized"), "Created by": "Payroll Manager", "Finalized by": "Payroll Manager", "Finalized date": "20 Jun 2026, 10:30" }];
}

function employeeAllowances(employee: Record<string, string>) {
  return ["Housing Allowance", "Transport Allowance", "HRA", "Food Allowance", "Mobile Allowance", "Special Allowance", "Other Allowance"].reduce((sum, key) => sum + numberValue(employee[key]), 0);
}

function moduleMonthlyAmount(module: string, employee: string, period: string) {
  return readDemoRecordsSnapshot(`hr-operations:Payroll:${module}`, payrollViews[module].rows)
    .filter(row => row.Employee === employee && periodMatches(row["Payroll period"], period) && postedPayrollStatus(module, row.Status))
    .reduce((sum, row) => sum + Math.abs(numberValue(row["Net effect"]) || numberValue(row["Calculated amount"]) || numberValue(row["Fixed amount"])), 0);
}

function monthlyDeductedAbsenceDays(employee: string, period: string) {
  return readDemoRecordsSnapshot("hr-operations:Attendance:Absence Monitoring", attendanceViews["Absence Monitoring"].rows)
    .filter(row => row.Employee === employee && row.Status === "Deducted" && periodMatches(row.Date, period))
    .reduce((sum, row) => sum + (numberValue(row.Days) || numberValue(row.Hours) / 8), 0);
}

function moduleSignedMonthlyAmount(module: string, employee: string, period: string) {
  return readDemoRecordsSnapshot(`hr-operations:Payroll:${module}`, payrollViews[module].rows)
    .filter(row => row.Employee === employee && periodMatches(row["Payroll period"], period) && postedPayrollStatus(module, row.Status))
    .reduce((sum, row) => sum + payrollNetEffect(row), 0);
}

function payrollNetEffect(row: Record<string, string>) {
  const explicit = numberValue(row["Net effect"]);
  if (explicit) return explicit;
  const amount = Math.abs(numberValue(row["Calculated amount"]) || numberValue(row["Fixed amount"]));
  if (row["Payroll effect"] === "Deduction") return -amount;
  if (row["Payroll effect"] === "Earning") return amount;
  return 0;
}

function pendingLoanDeductionForEmployee(loans: Array<Pick<LoanRecord, "Employee Code" | "Status" | "Schedule">>, employeeCode: string, month: number, year: number) {
  return pendingLoanDeduction(loans, employeeCode, month, year);
}

function postedPayrollStatus(module: string, status?: string) {
  if (["Leave Settlement", "Final Settlement"].includes(module)) return status === "Posted to payroll" || status === "Processed";
  return status === "Approved" || status === "Processed" || status === "Posted to payroll";
}

function employeeCompany(employee: Record<string, string>) {
  return employee.Company || employee["Working Company Name"] || companies[0];
}

function isPayrollEmployee(employee: Record<string, string>) {
  return ["active", "on leave"].includes(String(employee.Status || "").toLowerCase());
}

function payrollScopeMatches(employee: Record<string, string>, company: string, department: string) {
  return employeeCompany(employee) === company && (department === allDepartments || employee.Department === department);
}

function employeeToWpsMaster(employee: Record<string, string>) {
  return {
    employeeCode: employee["Employee No"] || employee["Employee Code"],
    employeeName: employee["Full Name"],
    bankName: employee["Bank Name"] || employee["Bank Code"],
    accountNumber: employee["Account No."] || employee["Account No"],
    iban: employee.IBAN || employee["IBAN No."],
    qidOrEmployeeId: employee["ID/Passport No"] || employee["RP/ID Number"] || employee["Passport No."] || employee["Employee No"] || employee["Employee Code"]
  };
}

function employeeToSifMaster(employee: Record<string, string>): SifEmployeeMaster {
  return {
    employeeCode: employee["Employee No"] || employee["Employee Code"],
    employeeName: employee["Full Name"],
    bankShortName: bankShortName(employee["Bank Code"] || employee["Bank Name"]),
    accountNumber: employee["Account No."] || employee["Account No"],
    iban: cleanBankValue(employee.IBAN || employee["IBAN No."]),
    qidOrEmployeeId: employee["ID/Passport No"] || employee["RP/ID Number"] || "",
    visaId: employee["Visa ID"] || employee["Passport No."] || ""
  };
}

function payrollRowsToSifLines(rows: MonthlyPayrollRow[], results: ReturnType<typeof calculateMonthlyPayrollLine>[]): SifPayrollLine[] {
  const employees = new Map(hrEmployees.map(employee => [employee["Employee No"] || employee["Employee Code"], employee]));
  return rows.map((row, index) => {
    const employee = employees.get(row.employeeCode) ?? ({} as Record<string, string>);
    return {
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      department: row.department,
      paidDays: row.paidDays,
      workingDays: row.workingDays,
      netSalary: results[index]?.netPay || 0,
      basicSalary: row.basicSalary,
      extraHours: row.overtimeHours || 0,
      extraIncome: row.overtimeAmount + Math.max(0, row.salaryAdjustmentAmount) + row.paidVacationSalaryAmount + row.insuranceRefundAmount + row.airTicketEncashmentAmount + row.leaveSettlementAmount + row.eosSettlementAmount,
      deductions: row.loanDeduction + row.salaryAdvanceAmount + row.otherDeductions + Math.max(0, -row.salaryAdjustmentAmount),
      remarks: row.remarks || (row.loanDeduction || row.salaryAdvanceAmount || row.otherDeductions ? "Salary advance or loan deduction" : ""),
      housingAllowance: numberValue(employee["Housing Allowance"] || employee.HRA),
      foodAllowance: numberValue(employee["Food Allowance"]),
      transportAllowance: numberValue(employee["Transport Allowance"]),
      overtimeAllowance: row.overtimeAmount || numberValue(employee["Overtime Amount"])
    };
  });
}

function moduleMonthlyQuantity(module: string, employee: string, period: string) {
  return readDemoRecordsSnapshot(`hr-operations:Payroll:${module}`, payrollViews[module].rows)
    .filter(row => row.Employee === employee && periodMatches(row["Payroll period"], period) && postedPayrollStatus(module, row.Status))
    .reduce((sum, row) => sum + Math.abs(numberValue(row.Quantity)), 0);
}

function sifRunContext(month: string, year: string, offsetMinutes = 0): SifRunContext {
  const date = new Date(Date.now() + offsetMinutes * 60_000);
  return {
    ...defaultSifSettings,
    salaryMonth: String(Number(month)),
    salaryYear: year,
    fileCreationDate: `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`,
    fileCreationTime: `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`
  };
}

function companyPayrollRows(runs: DemoRecord[], currentRunId: string, currentRows: MonthlyPayrollRow[], company: string, month: string, year: string, loans: Array<Pick<LoanRecord, "Employee Code" | "Status" | "Schedule">> = employeeLoanSeed) {
  const byEmployee = new Map<string, MonthlyPayrollRow>();
  runs
    .filter(run => run.__id !== currentRunId && run.Company === company && run.Month === month && run.Year === year && run.Status === "Finalized")
    .flatMap(run => monthlyRowsForRun(run, loans))
    .forEach(row => byEmployee.set(row.employeeCode, row));
  currentRows.forEach(row => byEmployee.set(row.employeeCode, row));
  return Array.from(byEmployee.values()).sort((a, b) => a.department.localeCompare(b.department) || a.employeeName.localeCompare(b.employeeName));
}

function missingCompanyPayrollEmployees(rows: MonthlyPayrollRow[], company: string) {
  const paid = new Set(rows.map(row => row.employeeCode));
  return hrEmployees
    .filter(employee => isPayrollEmployee(employee) && employeeCompany(employee) === company && !paid.has(employee["Employee No"] || employee["Employee Code"]))
    .map(employee => `${employee["Employee No"]} ${employee["Full Name"]}`);
}

function bankShortName(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  const aliases: Record<string, string> = {
    "commercial bank": "CBQ",
    "qnb": "QNB",
    "qatar national bank": "QNB",
    "qib": "QIB",
    "qatar islamic bank": "QIB",
    "doha bank": "DHB",
    "dukhan bank": "DKB"
  };
  return aliases[normalized] || normalized.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 8);
}

function cleanBankValue(value?: string) {
  const cleaned = String(value || "").replace(/\s+/g, "");
  return cleaned.includes("*") ? "" : cleaned;
}

function monthlyRunKey(company: string, month: string, year: string, department: string) {
  const companyCode = company.includes("MedTech") ? "MEDTECH" : company.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  return `MPR-${companyCode}-${year}-${String(month).padStart(2, "0")}-${department.replace(/\s+/g, "-")}`;
}

function wpsFileName(company: string, department: string, month: string, year: string) {
  return `WPS_${safeFilePart(company)}_${safeFilePart(department)}_${String(month).padStart(2, "0")}_${year}`;
}

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "all";
}

function monthlyRunRecord(run: string, company: string, month: string, year: string, department: string, rows: MonthlyPayrollRow[], results: ReturnType<typeof calculateMonthlyPayrollLine>[], status: string, previous?: DemoRecord) {
  const totals = results.reduce((sum, result) => ({ gross: sum.gross + result.salaryPayable, earnings: sum.earnings + result.totalEarnings, deductions: sum.deductions + result.totalDeductions, net: sum.net + result.netPay }), { gross: 0, earnings: 0, deductions: 0, net: 0 });
  const user = getDemoSession()?.name || PRESENTATION_USER_NAME;
  const finalized = status === "Finalized";
  return {
    Run: run,
    Company: company,
    Month: month,
    Year: year,
    Department: department,
    Employees: String(rows.length),
    Gross: qar(totals.gross),
    Earnings: qar(totals.earnings),
    Deductions: qar(totals.deductions),
    Net: qar(totals.net),
    Status: status,
    "Created by": previous?.["Created by"] || user,
    "Finalized by": finalized ? previous?.["Finalized by"] || user : previous?.["Finalized by"] || "",
    "Finalized date": finalized ? previous?.["Finalized date"] || formatDemoDateTime(new Date()) : previous?.["Finalized date"] || "",
    Lines: JSON.stringify(rows)
  };
}

function parseMonthlyLines(value?: string): MonthlyPayrollRow[] {
  try { return value ? JSON.parse(value) as MonthlyPayrollRow[] : []; } catch { return []; }
}

function monthlyRowsForRun(run: DemoRecord, loans: Array<Pick<LoanRecord, "Employee Code" | "Status" | "Schedule">> = employeeLoanSeed) {
  const parsed = parseMonthlyLines(run.Lines);
  if (parsed.length) return parsed;
  const month = Number(run.Month);
  const year = Number(run.Year);
  const calendarDays = month && year ? new Date(year, month, 0).getDate() : 30;
  const period = `${monthNames[month - 1] || monthNames[Number(demoPayrollMonth) - 1]} ${run.Year || demoPayrollYear}`;
  return hrEmployees
    .filter(employee => isPayrollEmployee(employee) && payrollScopeMatches(employee, run.Company || companies[0], run.Department || allDepartments))
    .sort((a, b) => a.Department.localeCompare(b.Department) || a["Full Name"].localeCompare(b["Full Name"]))
    .map(employee => ({ ...employeeToMonthlyPayrollRow(employee, period, calendarDays, loans, month, year), status: run.Status || "Draft" }));
}

function payrollRunDetail(rows: MonthlyPayrollRow[], results: ReturnType<typeof calculateMonthlyPayrollLine>[]) {
  return rows.reduce((sum, row, index) => ({
    grossSalary: sum.grossSalary + row.grossSalary,
    overtimeAmount: sum.overtimeAmount + (row.overtimeAmount || 0),
    salaryAdvance: sum.salaryAdvance + (row.salaryAdvanceAmount || 0),
    salaryAdjustment: sum.salaryAdjustment + (row.salaryAdjustmentAmount || 0),
    paidVacation: sum.paidVacation + (row.paidVacationSalaryAmount || 0),
    insuranceRefund: sum.insuranceRefund + (row.insuranceRefundAmount || 0),
    airTicketEncashment: sum.airTicketEncashment + (row.airTicketEncashmentAmount || 0),
    linkedEarnings: sum.linkedEarnings + (results[index]?.totalEarnings || 0),
    loanDeductions: sum.loanDeductions + row.loanDeduction,
    otherDeductions: sum.otherDeductions + row.otherDeductions,
    leaveSettlement: sum.leaveSettlement + row.leaveSettlementAmount,
    eosSettlement: sum.eosSettlement + row.eosSettlementAmount,
    netPay: sum.netPay + (results[index]?.netPay || 0)
  }), { grossSalary: 0, overtimeAmount: 0, salaryAdvance: 0, salaryAdjustment: 0, paidVacation: 0, insuranceRefund: 0, airTicketEncashment: 0, linkedEarnings: 0, loanDeductions: 0, otherDeductions: 0, leaveSettlement: 0, eosSettlement: 0, netPay: 0 });
}

function payrollSheetRows(rows: MonthlyPayrollRow[], results: ReturnType<typeof calculateMonthlyPayrollLine>[]) {
  return rows.map((row, index) => ({
    "Employee Code": row.employeeCode,
    "Employee Name": row.employeeName,
    Department: row.department,
    "Basic Salary": row.basicSalary,
    "Gross Salary": row.grossSalary,
    "Working Days": row.workingDays,
    "Paid Days": row.paidDays,
    Overtime: row.overtimeAmount,
    "Salary Advance": row.salaryAdvanceAmount,
    "Salary Adjustment": row.salaryAdjustmentAmount,
    "Paid Vacation Salary": row.paidVacationSalaryAmount,
    "Insurance Refund": row.insuranceRefundAmount,
    "Air Ticket Encashment": row.airTicketEncashmentAmount,
    "Loan Deduction": row.loanDeduction,
    "Leave Settlement": row.leaveSettlementAmount,
    "EOS Settlement": row.eosSettlementAmount,
    "Other Deductions": row.otherDeductions,
    "Net Pay": results[index]?.netPay || 0,
    Remarks: row.remarks
  }));
}

function ReportTable({ report, rows, columns, query, setQuery, sortColumn, direction, toggleSort, exportRows, downloadPdf }: {
  report: string;
  rows: Record<string, string>[];
  columns: string[];
  query: string;
  setQuery: (value: string) => void;
  sortColumn: string;
  direction: "asc" | "desc";
  toggleSort: (column: string) => void;
  exportRows: () => void;
  downloadPdf: () => void;
}) {
  return <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
    <div className="flex flex-wrap items-center gap-2 border-b p-3">
      <div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label={`Search ${report}`} value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${report.toLowerCase()}...`} className="h-9 w-full rounded-lg border bg-transparent pl-9 pr-3 text-sm outline-none focus:border-medtech-red" /></div>
      {sortColumn && <span className="text-[10px] text-slate-400">Sorted by <b>{sortColumn}</b> ({direction})</span>}
      <div className="ml-auto flex gap-2"><Button variant="secondary" onClick={downloadPdf}><FileText className="h-4 w-4" />PDF</Button><Button variant="secondary" onClick={exportRows}><Download className="h-4 w-4" />Excel</Button></div>
    </div>
    {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40">{columns.map(column => <th key={column} className="px-4 py-3"><button onClick={() => toggleSort(column)} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-medtech-red">{column}{sortColumn === column ? direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}</button></th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={`${report}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">{columns.map((column, columnIndex) => <td key={column} className={cn("px-4 py-3", columnIndex === 0 ? "font-semibold" : "text-[var(--muted)]")}>{column === "Status" ? <StatusBadge>{row[column]}</StatusBadge> : row[column]}</td>)}</tr>)}</tbody></table></div> : <EmptyState title="No report rows" description="Adjust search or filters." />}
    <div className="border-t px-4 py-3 text-[11px] text-slate-400">{rows.length} row{rows.length === 1 ? "" : "s"}</div>
  </section>;
}

function payrollReportRows(report: PayrollReportName, sources: { runs: DemoRecord[]; loans: Array<DemoRecord & LoanRecord>; leaveSettlements: DemoRecord[]; finalSettlements: DemoRecord[] }) {
  if (report === "Monthly Payroll Summary") return sources.runs.map(run => {
    const rows = monthlyRowsForRun(run, sources.loans);
    const results = rows.map(row => calculateMonthlyPayrollLine(row, defaultPayrollSettings, Number(run.Month) && Number(run.Year) ? new Date(Number(run.Year), Number(run.Month), 0).getDate() : 30));
    const detail = payrollRunDetail(rows, results);
    return {
      Run: run.Run || "",
      Company: run.Company || "",
      Department: run.Department || "",
      Month: monthNames[Number(run.Month) - 1] || run.Month || "",
      "Month No": run.Month || "",
      Year: run.Year || "",
      Employees: run.Employees || String(rows.length),
      "Gross Salary": qar(detail.grossSalary || numberValue(run.Gross)),
      "Total Earnings": qar(detail.linkedEarnings),
      Overtime: qar(detail.overtimeAmount),
      "Salary Advances": qar(detail.salaryAdvance),
      "Loan Deductions": qar(detail.loanDeductions),
      "Other Deductions": qar(detail.otherDeductions),
      "Leave Settlement": qar(detail.leaveSettlement),
      "EOS Settlement": qar(detail.eosSettlement),
      "Net Salary": qar(detail.netPay || numberValue(run.Net)),
      Status: run.Status || ""
    };
  });
  if (report === "Employee Payroll History") return sources.runs.flatMap(run => monthlyRowsForRun(run, sources.loans).map((row, index) => {
    const calendarDays = Number(run.Month) && Number(run.Year) ? new Date(Number(run.Year), Number(run.Month), 0).getDate() : 30;
    const result = calculateMonthlyPayrollLine(row, defaultPayrollSettings, calendarDays);
    return {
      "Payroll Run": run.Run || "",
      Date: payrollPeriodIso(run.Month, run.Year),
      Period: `${monthNames[Number(run.Month) - 1] || run.Month} ${run.Year}`,
      "Employee Code": row.employeeCode,
      Employee: row.employeeName,
      Department: row.department,
      "Basic Salary": qar(row.basicSalary),
      "Gross Salary": qar(row.grossSalary),
      Overtime: qar(row.overtimeAmount),
      "Salary Advance": qar(row.salaryAdvanceAmount),
      "Salary Adjustment": qar(row.salaryAdjustmentAmount),
      "Paid Vacation Salary": qar(row.paidVacationSalaryAmount),
      "Insurance Refund": qar(row.insuranceRefundAmount),
      "Air Ticket Encashment": qar(row.airTicketEncashmentAmount),
      "Loan Deduction": qar(row.loanDeduction),
      "Other Deductions": qar(row.otherDeductions),
      "Net Pay": qar(result.netPay),
      Status: run.Status || "",
      Sequence: String(index + 1)
    };
  }));
  if (report === "Loan Deduction Report") return sources.loans.flatMap(loan => parseLoanSchedule(loan.Schedule).map(item => ({
    Loan: loan.Loan,
    Company: loan.Company,
    Employee: loan.Employee,
    "Employee Code": loan["Employee Code"],
    Department: loan.Department,
    "Loan Type": loan["Loan type"],
    Month: monthNames[item.dueMonth - 1],
    "Month No": String(item.dueMonth),
    Year: String(item.dueYear),
    Amount: qar(item.amount),
    Status: item.status,
    "Payroll Run": item.payrollRun || "",
    History: item.status === "postponed" && item.newDueMonth ? `Moved to ${monthNames[item.newDueMonth - 1]} ${item.newDueYear}` : ""
  })));
  if (report === "Leave Settlement Report") return sources.leaveSettlements.map(row => ({
    Record: row.Record || "",
    Company: row.Company || companies[0],
    Employee: row.Employee || "",
    "Employee Code": row["Employee Code"] || "",
    Department: row.Department || "",
    Month: monthNames[Number(row["Payroll month"]) - 1] || row["Payroll month"] || "",
    "Month No": row["Payroll month"] || "",
    Year: row["Payroll year"] || "",
    "Leave Type": row["Leave type"] || "",
    "Settlement Amount": row["Settlement amount"] || "",
    Status: row.Status || ""
  }));
  return sources.finalSettlements.map(row => ({
    Record: row.Record || "",
    Company: row.Company || companies[0],
    Employee: row.Employee || "",
    "Employee Code": row["Employee Code"] || "",
    Department: row.Department || employeeMeta(row.Employee).department,
    Date: normalizedDate(row["Document date"]) || normalizedDate(row["Payroll period"]) || "",
    "Payroll Period": row["Payroll period"] || "",
    "Settlement Amount": row["Calculated amount"] || row["Fixed amount"] || row["Net effect"] || "",
    Status: row.Status || ""
  }));
}

function filterPayrollReportRows(rows: Record<string, string>[], report: PayrollReportName, filters: Record<string, string>, query: string, sortColumn: string, direction: "asc" | "desc") {
  const search = query.trim().toLowerCase();
  return rows.filter(row => {
    const companyOk = filters.company === "All" || row.Company === filters.company;
    const departmentOk = filters.department === "All" || row.Department === filters.department;
    const employeeOk = filters.employee === "All" || row.Employee === filters.employee;
    const statusOk = filters.status === "All" || row.Status === filters.status;
    const monthOk = filters.month === "All" || row["Month No"] === filters.month;
    const yearOk = filters.year === "All" || row.Year === filters.year;
    const dateOk = !["Employee Payroll History", "End of Service Report"].includes(report) || reportDateInRange(row.Date, filters.from, filters.to);
    const searchOk = !search || Object.values(row).some(value => String(value).toLowerCase().includes(search));
    return companyOk && departmentOk && employeeOk && statusOk && monthOk && yearOk && dateOk && searchOk;
  }).sort((a, b) => {
    if (!sortColumn) return 0;
    const comparison = String(a[sortColumn] ?? "").localeCompare(String(b[sortColumn] ?? ""), undefined, { numeric: true, sensitivity: "base" });
    return direction === "asc" ? comparison : -comparison;
  });
}

function reportPdfMetadata(rows: Record<string, string>[], columns: string[]) {
  const visible = rows.slice(0, 25);
  return visible.flatMap((row, index) => columns.slice(0, 8).map(column => [`${index + 1}. ${column}`, row[column] || "-"] as [string, string]));
}

function distinct(rows: Record<string, string>[], column: string) {
  return Array.from(new Set(rows.map(row => row[column]).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function payrollPeriodIso(month?: string, year?: string) {
  return year && month ? `${year}-${String(month).padStart(2, "0")}-01` : "";
}

function normalizedDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function reportDateInRange(value: string | undefined, from: string, to: string) {
  if (!value) return true;
  return (!from || value >= from) && (!to || value <= to);
}

function newLeaveSettlementForm(employee: Record<string, string>) {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const basic = numberValue(employee["Basic Salary"]) || numberValue(employee.Basic);
  const gross = numberValue(employee["Total Salary"]) || numberValue(employee.Total) || basic + employeeAllowances(employee);
  return {
    Record: "Auto generated",
    Company: employeeCompany(employee),
    Employee: employee["Full Name"],
    Department: employee.Department,
    "Employee Code": employee["Employee No"] || employee["Employee Code"],
    "Basic Salary": qar(basic),
    "Gross Salary": qar(gross),
    "Leave type": "Annual leave",
    "Leave balance days": String(currentLeaveBalanceFor(employee)),
    "Salary calculation basis": "basic_salary",
    "Salary rate per day": "QAR 0.00",
    "Settlement amount": "QAR 0.00",
    "Payroll month": String(month),
    "Payroll year": String(year),
    "Payroll period": `${monthNames[month - 1]} ${year}`,
    "Payroll effect": "Earning",
    "Net effect": "QAR 0.00",
    Remarks: "",
    Status: "Draft"
  };
}

function currentLeaveBalanceFor(employee: Record<string, string>) {
  return numberValue(employee["Annual Leave Balance"]) || numberValue(employee["Annual Leave Balance (As on Date)"]) || 0;
}

function nextLeaveSettlementNo() {
  return `LVS-${new Date().getFullYear()}-${String(Date.now() % 10000).padStart(4, "0")}`;
}

function nextLoanNo() {
  return `LOAN-${new Date().getFullYear()}-${String(Date.now() % 10000).padStart(4, "0")}`;
}

function isPayrollFinalizer() {
  const role = getDemoSession()?.role || "Super Admin";
  return ["Super Admin", "HR Manager", "Payroll Manager"].includes(role);
}

function isAdminUser() {
  return (getDemoSession()?.role || "Super Admin") === "Super Admin";
}

function SelectField({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: Array<string | { value: string; label: string }>; onChange: (value: string) => void; disabled?: boolean }) {
  return <label><span className="mb-1 block text-xs font-semibold">{label}</span><select disabled={disabled} value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm disabled:bg-slate-100 dark:disabled:bg-slate-900">{options.map(option => typeof option === "string" ? <option key={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-1 block text-xs font-semibold">{label}</span><input type="date" value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm" /></label>;
}

function PayrollMetric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return <div className="rounded-2xl border bg-[var(--panel)] p-4 shadow-soft"><div className="text-xs text-[var(--muted)]">{label}</div><div className={cn("mt-2 text-lg font-bold", tone === "positive" && "text-medtech-navy", tone === "negative" && "text-rose-600")}>{value}</div></div>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <label><span className="mb-1 block text-xs font-semibold">{label}</span><input disabled value={value} className="h-10 w-full rounded-xl border bg-slate-100 px-3 text-sm dark:bg-slate-900" /></label>;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 border-b pb-2 text-xs"><span className="text-[var(--muted)]">{label}</span><b className="text-right">{value}</b></div>;
}

function GridNumber({ value, locked, onChange }: { value: number; locked: boolean; onChange: (value: number) => void }) {
  return <input type="number" min="0" step="0.5" disabled={locked} value={value} onChange={event => onChange(Number(event.target.value))} className="h-9 w-20 rounded-lg border bg-[var(--panel)] px-2 text-xs disabled:bg-slate-100 dark:disabled:bg-slate-900" />;
}

function ReadOnlyGridNumber({ label, value }: { label: string; value: number }) {
  return <div aria-label={label} className="grid h-9 w-20 place-items-center rounded-lg border bg-slate-100 px-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{value}</div>;
}

function NumberField({ label, value, onChange, step = 100 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) { return <label><span className="mb-1 block text-xs font-semibold">{label}</span><input aria-label={label} type="number" min="0" step={step} value={value} onChange={event => onChange(Number(event.target.value))} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm" /></label>; }
function numberValue(value?: string) { return Number(String(value || "0").replace(/[^0-9.-]/g, "")) || 0; }
function qar(value: number) { return `QAR ${value.toLocaleString("en-QA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }


