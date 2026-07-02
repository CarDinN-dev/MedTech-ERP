"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Banknote, BriefcaseBusiness, CalendarDays, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleDollarSign, Download, Ellipsis, FileDown, FileText, FolderLock,
  Landmark, Search, ShieldCheck, Upload, UserPlus, UsersRound, X
} from "lucide-react";
import { ActionMenu, Button, EmptyState, FormSection, StatusBadge } from "@/components/ui";
import { AttendanceWorkspace, LeaveWorkspace, PayrollWorkspace, RecruitmentWorkspace } from "@/components/hr/operations-workspaces";
import { RecordModal, type RecordFieldSuggestion, type RecordFieldType } from "@/components/record-modal";
import { appendAuditLog } from "@/lib/audit-store";
import { downloadBlob } from "@/lib/client-download";
import { getDemoSession, PRESENTATION_USER_NAME } from "@/lib/demo-auth";
import { useDemoRecords, type DemoRecord } from "@/lib/demo-store";
import { exportToExcel, parseExcel } from "@/lib/export/excel";
import { employeeImportColumns, employeeProfileSections, normalizeEmployeeRow } from "@/lib/hr-employee-fields";
import { hrAttendanceTrend, hrDepartmentHeadcount, hrEmployees, hrPayrollTrend, hrTabs, hrViews, type HrTab } from "@/lib/hr-data";
import { finalSettlementPayable, qar } from "@/lib/hr-extensions";
import type { PdfTemplate } from "@/lib/pdf/generator";
import { cn } from "@/lib/utils";
import { accessProvisioningSchema, employeeOnboardingSchema } from "@/lib/validation";

const kpis = [
  { label: "Total employees", value: "126", note: "+4 this month", icon: UsersRound, tone: "navy" },
  { label: "On leave today", value: "8", note: "6.3% of workforce", icon: CalendarDays, tone: "blue" },
  { label: "Pending approvals", value: "7", note: "Requires your action", icon: ShieldCheck, tone: "amber" },
  { label: "June payroll", value: "QAR 1.24M", note: "Validation in progress", icon: Banknote, tone: "violet" },
  { label: "Expiring documents", value: "6", note: "Within 30 days", icon: FolderLock, tone: "rose" }
];
const toneClasses: Record<string, string> = { navy: "bg-[var(--navy-tint)] text-medtech-navy dark:bg-[var(--elevated)]", blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50", amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50", violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/50", rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/50" };
const employeeLinkedTabs = new Set<HrTab>(["Contracts", "Probation Reviews", "Access Provisioning", "Attendance Exceptions", "Business Trips", "Employee Expenses", "Performance/Appraisals", "eLearning", "EOS / Gratuity / Final Settlement", "Payroll Accounting Draft Journal"]);
const PAGE_SIZE = 50;

export function HRWorkspace() {
  const [activeTab, setActiveTab] = useState<HrTab>("Dashboard");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [department, setDepartment] = useState("All");
  const [category, setCategory] = useState("All");
  const [employeeCode, setEmployeeCode] = useState("All");
  const [dateFilters, setDateFilters] = useState({ from: "", to: "" });
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DemoRecord | null>(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingRecord, setOnboardingRecord] = useState<DemoRecord | null>(null);
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const view = activeTab === "Dashboard" ? hrViews.Employees : hrViews[activeTab];
  const hasDedicatedWorkspace = ["Recruitment", "Attendance", "Leave", "Payroll"].includes(activeTab);
  const store = useDemoRecords(`hr-enterprise:${activeTab}`, view.rows);
  const records = useMemo(() => activeTab === "Employees" ? store.records.map(record => ({ ...record, ...normalizeEmployeeRow(record) })) : store.records, [activeTab, store.records]);
  const statusColumn = view.columns.find(column => column === "Status");
  const statuses = useMemo(() => statusColumn ? Array.from(new Set(records.map(record => record[statusColumn]).filter(Boolean))).sort() : [], [records, statusColumn]);
  const departments = useMemo(() => Array.from(new Set(records.map(record => record.Department).filter(Boolean))).sort(), [records]);
  const categories = useMemo(() => Array.from(new Set(records.map(record => record.Category).filter(Boolean))).sort(), [records]);
  const employeeCodes = useMemo(() => Array.from(new Set([...records, ...view.rows].map(record => record["Employee Code"] || record["Employee No"] || record[view.columns[0]]).filter(Boolean))).sort(), [records, view]);
  const dateFilterColumn = useMemo(() => view.columns.find(isHrDateColumn) ?? "", [view.columns]);
  const modalFieldTypes = useMemo(() => hrFieldTypesFor(activeTab), [activeTab]);
  const modalSuggestions = useMemo(() => hrSuggestionsFor(activeTab), [activeTab]);
  const deferredQuery = useDeferredValue(query);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const recordById = useMemo(() => new Map(records.map(record => [record.__id, record])), [records]);
  const searchableRecords = useMemo(() => records.map(record => ({ record, searchText: Object.values(record).join("\n").toLowerCase() })), [records]);
  const filtered = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    return searchableRecords.filter(({ record, searchText }) => {
    const searchMatch = !search || searchText.includes(search);
    const statusMatch = status === "All" || record.Status === status;
    const departmentMatch = department === "All" || record.Department === department;
    const categoryMatch = category === "All" || record.Category === category;
    const codeMatch = employeeCode === "All" || record["Employee Code"] === employeeCode || record["Employee No"] === employeeCode;
    const date = dateFilterColumn ? dateValue(record[dateFilterColumn]) : 0;
    const from = dateFilters.from ? new Date(`${dateFilters.from}T00:00:00`).getTime() : 0;
    const to = dateFilters.to ? new Date(`${dateFilters.to}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
    const dateMatch = !dateFilterColumn || ((!dateFilters.from || date >= from) && (!dateFilters.to || date <= to));
    return searchMatch && statusMatch && departmentMatch && categoryMatch && codeMatch && dateMatch;
  }).map(item => item.record).sort((a, b) => {
    if (!sortColumn) return 0;
    const comparison = (a[sortColumn] ?? "").localeCompare(b[sortColumn] ?? "", undefined, { numeric: true, sensitivity: "base" });
    return sortDirection === "asc" ? comparison : -comparison;
  });
  }, [searchableRecords, deferredQuery, status, department, category, employeeCode, dateFilterColumn, dateFilters, sortColumn, sortDirection]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRecords = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);
  const selectedRecords = useMemo(() => selectedIds.map(id => recordById.get(id)).filter((record): record is DemoRecord => Boolean(record)), [recordById, selectedIds]);

  useEffect(() => { setQuery(""); setStatus("All"); setDepartment("All"); setCategory("All"); setEmployeeCode("All"); setDateFilters({ from: "", to: "" }); setSortColumn(""); setSelectedIds([]); setSelectedRecord(null); setRecordModalOpen(false); setPage(1); }, [activeTab]);
  useEffect(() => { setPage(1); }, [deferredQuery, status, department, category, employeeCode, dateFilters, sortColumn, sortDirection]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2800); };
  const primaryName = view.columns[0];
  const recordName = (record?: DemoRecord | Record<string, string> | null) => record?.[primaryName] || "HR record";
  const toggleSort = (column: string) => { if (sortColumn === column) setSortDirection(value => value === "asc" ? "desc" : "asc"); else { setSortColumn(column); setSortDirection("asc"); } };
  const toggleSelection = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const toggleAll = () => { const ids = visibleRecords.map(record => record.__id); const idSet = new Set(ids); const all = ids.length > 0 && ids.every(id => selectedIdSet.has(id)); setSelectedIds(current => all ? current.filter(id => !idSet.has(id)) : Array.from(new Set([...current, ...ids]))); };
  const openCreate = () => { if (activeTab === "Employees") { setOnboardingRecord(null); setOnboardingOpen(true); } else { setSelectedRecord(null); setRecordModalOpen(true); } };
  const openRecord = (record: DemoRecord) => { setSelectedRecord(record); if (activeTab !== "Employees") setRecordModalOpen(true); };
  const saveRecord = (input: Record<string, string>) => {
    const validation = validateHrRecord(activeTab, input);
    if (validation) {
      notify(validation);
      return;
    }
    const values = normalizeHrRecord(activeTab, input);
    if (selectedRecord) store.update(selectedRecord.__id, values);
    else store.create(values);
    appendAuditLog({ action: selectedRecord ? "UPDATE" : "CREATE", module: "Human Resources", record: values[primaryName] || activeTab, details: `${activeTab} record ${selectedRecord ? "updated" : "created"}` });
    setRecordModalOpen(false);
    notify(selectedRecord ? "HR record updated" : "HR record created");
  };
  const removeRecord = () => { if (!selectedRecord) return; store.remove(selectedRecord.__id); appendAuditLog({ action: "ARCHIVE", module: "Human Resources", record: recordName(selectedRecord), details: `${activeTab} record archived from active use` }); setRecordModalOpen(false); setSelectedRecord(null); notify("HR record archived"); };
  const approveSelected = () => { selectedRecords.forEach(record => store.update(record.__id, { Status: "Approved" })); appendAuditLog({ action: "APPROVE", module: "Human Resources", record: `${selectedRecords.length} requests`, details: "Selected HR requests approved" }); notify(`${selectedRecords.length} request${selectedRecords.length === 1 ? "" : "s"} approved`); };
  const saveEmployee = (values: Record<string, string>) => { const employee = onboardingRecord ? (store.update(onboardingRecord.__id, values), { ...onboardingRecord, ...values }) : store.create(values); appendAuditLog({ action: onboardingRecord ? "UPDATE EMPLOYEE" : "CREATE EMPLOYEE", module: "Human Resources", record: values["Employee No"], details: onboardingRecord ? `${values["Full Name"]} profile updated` : `${values["Full Name"]} onboarded and portal account prepared` }); setOnboardingOpen(false); setOnboardingRecord(null); setSelectedRecord(employee); notify(onboardingRecord ? "Employee profile updated" : "Employee created - ID, folder and audit history generated"); };
  const importEmployees = async (file?: File) => { if (!file || activeTab !== "Employees") return; const result = await parseExcel<Record<string, string>>(file, row => { const employee = normalizeEmployeeRow(row as Record<string, unknown>); if (!employee["Full Name"]) throw new Error("Full Name is required"); if (!employee["Employee Code"]) throw new Error("Employee Code is required"); return employee; }); if (result.valid.length) store.importMany(result.valid); appendAuditLog({ action: "IMPORT", module: "Human Resources", record: file.name, details: `${result.valid.length} employees imported; ${result.errors.length} skipped` }); notify(`${result.valid.length} employees imported - ${result.errors.length} skipped`); if (importRef.current) importRef.current.value = ""; };
  const downloadTemplate = () => { exportToExcel([Object.fromEntries(employeeImportColumns.map(key => [key, ""]))], "medtech-employee-import-template", "Employees"); appendAuditLog({ action: "EXPORT TEMPLATE", module: "Human Resources", record: "Employee import template", details: `Controlled ${employeeImportColumns.length}-field employee onboarding template downloaded` }); notify("90-field employee import template downloaded"); };
  const exportCurrent = () => { exportToExcel(filtered.map(record => Object.fromEntries(view.columns.map(column => [column, record[column] ?? ""]))), `hr-${activeTab.toLowerCase().replaceAll(" ", "-")}`, activeTab); appendAuditLog({ action: "EXPORT", module: "Human Resources", record: activeTab, details: `${filtered.length} visible HR records exported to Excel` }); notify("Excel export generated"); };
  const downloadPdf = async () => {
    if (!selectedRecords.length) return;
    const { generateBrandedPdf } = await import("@/lib/pdf/generator");
    const first = selectedRecords[0]; const documentNumber = recordName(first).replace(/[^a-z0-9-]+/gi, "-");
    const metadata = selectedRecords.flatMap(record => Object.entries(record).filter(([key]) => !key.startsWith("__") && !["IBAN", "Account No", "Basic Salary", "Housing Allowance", "Transport Allowance", "Other Allowance", "Total Salary"].includes(key)).map(([key, value]) => [selectedRecords.length > 1 ? `${recordName(record)} - ${key}` : key, value] as [string, string]));
    const result = await generateBrandedPdf({ template: hrPdfTemplate(activeTab), documentNumber, date: new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date()), partyLabel: first["Full Name"] || first["Employee Name"] ? "Employee" : "Human Resources", partyName: first["Full Name"] || first["Employee Name"] || first[primaryName] || "MedTech HR", subject: `${activeTab} record`, metadata, terms: ["Generated from the controlled MedTech HR workspace.", "Verify values and approvals before external issue."], preparedBy: getDemoSession()?.name || PRESENTATION_USER_NAME, approvedBy: "HR Manager" }, "blob");
    if (!(result instanceof Blob)) return; downloadBlob(result, `${documentNumber}-${activeTab.toLowerCase().replaceAll(" ", "-")}.pdf`); appendAuditLog({ action: "PDF", module: "Human Resources", record: selectedRecords.map(recordName).join(", "), details: `${activeTab} PDF generated` }); notify("Branded HR PDF generated");
  };
  const selectedActionItems = [
    ...(activeTab === "Approvals" && selectedRecords.length > 0 ? [{ label: "Approve selected", icon: <Check className="h-3.5 w-3.5" />, onClick: approveSelected }] : []),
    ...(selectedRecords.length > 0 ? [{ label: `Download PDF (${selectedRecords.length})`, icon: <FileText className="h-3.5 w-3.5" />, onClick: downloadPdf }] : [])
  ];

  return <div className="mx-auto max-w-[1680px] p-4 md:p-7">
    <input ref={importRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={event => importEmployees(event.target.files?.[0])} />
    <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex items-center gap-3.5"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/50"><UsersRound className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold tracking-tight">People & HR</h1><p className="mt-1 text-xs text-[var(--muted)]">Workforce command center - employee lifecycle, compliance and payroll</p></div></div>
      <div className="flex flex-wrap gap-2">{activeTab === "Employees" && <><Button variant="secondary" onClick={downloadTemplate}><FileDown className="h-4 w-4" /> Download template</Button><Button variant="secondary" onClick={() => importRef.current?.click()}><Upload className="h-4 w-4" /> Import Excel</Button></>}{activeTab !== "Dashboard" && !hasDedicatedWorkspace && <Button onClick={openCreate}><UserPlus className="h-4 w-4" /> {view.primaryAction}</Button>}</div>
    </div>
    <div className="mb-5 flex gap-1 overflow-x-auto border-b">{hrTabs.map(tab => <button key={tab} data-testid={`hr-tab-${tab.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`} onClick={() => setActiveTab(tab)} className={cn("relative whitespace-nowrap px-3 py-3 text-xs font-semibold transition", activeTab === tab ? "text-medtech-navy" : "text-[var(--muted)] hover:text-[var(--text)]")}>{tab}{activeTab === tab && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-medtech-red" />}</button>)}</div>
    {activeTab === "Dashboard" ? <HRDashboard onNavigate={setActiveTab} /> : activeTab === "Recruitment" ? <RecruitmentWorkspace /> : activeTab === "Attendance" ? <AttendanceWorkspace /> : activeTab === "Leave" ? <LeaveWorkspace /> : activeTab === "Payroll" ? <PayrollWorkspace /> : <>
      <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3"><div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${activeTab.toLowerCase()}...`} className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-medtech-red" /></div>{statusColumn && <select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"><option value="All">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select>}{categories.length > 0 && ["Self service", "Settings", "Reports", "Documents"].includes(activeTab) && <select aria-label="Filter by category" value={category} onChange={event => setCategory(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"><option value="All">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select>}{departments.length > 0 && <select aria-label="Filter by department" value={department} onChange={event => setDepartment(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"><option value="All">All departments</option>{departments.map(value => <option key={value}>{value}</option>)}</select>}{employeeCodes.length > 0 && <select aria-label="Filter by employee code" value={employeeCode} onChange={event => setEmployeeCode(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"><option value="All">All employee codes</option>{employeeCodes.map(value => <option key={value}>{value}</option>)}</select>}{dateFilterColumn && <><input aria-label={`${dateFilterColumn} from`} type="date" value={dateFilters.from} onChange={event => setDateFilters(current => ({ ...current, from: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-2 text-xs outline-none" /><input aria-label={`${dateFilterColumn} to`} type="date" value={dateFilters.to} onChange={event => setDateFilters(current => ({ ...current, to: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-2 text-xs outline-none" /></>}<div className="ml-auto flex flex-wrap gap-2">{selectedActionItems.length > 0 && <ActionMenu label={`${selectedRecords.length} HR actions`} actions={selectedActionItems} />}<Button variant="secondary" onClick={exportCurrent}><Download className="h-4 w-4" /> Excel</Button></div></div>
        {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead><tr className="border-b bg-slate-50/80 dark:bg-slate-900/40"><th className="w-12 px-4 py-3"><input aria-label="Select all visible HR records" type="checkbox" checked={visibleRecords.length > 0 && visibleRecords.every(record => selectedIdSet.has(record.__id))} onChange={toggleAll} className="h-4 w-4 accent-medtech-red" /></th>{view.columns.map(column => <th key={column} className="px-4 py-3"><button aria-label={`Sort by ${column}`} onClick={() => toggleSort(column)} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{column}{sortColumn === column ? sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}</button></th>)}<th className="w-14" /></tr></thead><tbody className="divide-y">{visibleRecords.map(record => <tr key={record.__id} className={cn("transition hover:bg-slate-50 dark:hover:bg-slate-800/30", selectedIdSet.has(record.__id) && "bg-[var(--navy-tint)] dark:bg-[var(--elevated)]")}><td className="px-4 py-3"><input aria-label={`Select ${recordName(record)}`} type="checkbox" checked={selectedIdSet.has(record.__id)} onChange={() => toggleSelection(record.__id)} className="h-4 w-4 accent-medtech-red" /></td>{view.columns.map((column, index) => <td key={column} className={cn("px-4 py-3 text-xs", index === 0 ? "font-semibold" : "text-[var(--muted)]")}>{isStatusLikeColumn(column) ? <StatusBadge>{record[column]}</StatusBadge> : column === "Full Name" && activeTab === "Employees" ? <button onClick={() => openRecord(record)} className="text-left font-semibold text-[var(--text)] hover:text-medtech-red"><span className="block">{record["Full Name"]}</span><span className="text-[10px] font-normal text-slate-400">{record["Email Address"]}</span></button> : record[column]}</td>)}<td className="px-3"><button aria-label={`Open ${recordName(record)}`} onClick={() => openRecord(record)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-medtech-red"><Ellipsis className="h-4 w-4" /></button></td></tr>)}</tbody></table></div> : <EmptyState title={`No ${activeTab.toLowerCase()} found`} description="Adjust the search or filters, or create a new record." />}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[11px] text-slate-400"><span>{selectedRecords.length ? `${selectedRecords.length} selected - ` : ""}Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} filtered / {records.length}</span><div className="flex items-center gap-2">{pageCount > 1 && <><Button variant="ghost" className="h-7 px-2 text-[11px]" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</Button><span>Page {currentPage} of {pageCount}</span><Button variant="ghost" className="h-7 px-2 text-[11px]" disabled={currentPage === pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next</Button></>}<span>Changes save locally and write to the audit trail</span></div></div>
      </section>
    </>}
    {selectedRecord && activeTab === "Employees" && <EmployeeDrawer employee={selectedRecord} onClose={() => setSelectedRecord(null)} onEdit={() => { setOnboardingRecord(selectedRecord); setSelectedRecord(null); setOnboardingOpen(true); }} />}
    <RecordModal open={recordModalOpen} title={selectedRecord ? `Edit ${activeTab}` : view.primaryAction} columns={view.columns} formColumns={view.formColumns} selectOptions={view.selectOptions} defaultValues={view.defaultValues} fieldTypes={modalFieldTypes} suggestions={modalSuggestions} record={selectedRecord} approvalMode={activeTab === "Approvals"} onClose={() => setRecordModalOpen(false)} onSave={saveRecord} onDelete={selectedRecord ? removeRecord : undefined} onDecision={decision => { if (!selectedRecord) return; store.update(selectedRecord.__id, { Status: decision }); setRecordModalOpen(false); notify(`Request ${decision.toLowerCase()}`); }} />
    <EmployeeOnboarding open={onboardingOpen} employeeNumber={`MT-${String(80 + records.length).padStart(4, "0")}`} record={onboardingRecord} onClose={() => { setOnboardingOpen(false); setOnboardingRecord(null); }} onComplete={saveEmployee} />
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel"><CheckCircle2 className="h-4 w-4 text-red-300" />{toast}</div>}
  </div>;
}

function hrFieldTypesFor(tab: HrTab): Record<string, RecordFieldType> {
  if (tab === "Self service") return { Submitted: "date", "Last update": "date" };
  if (tab === "Settings") return { "Effective date": "date" };
  if (tab === "Contracts") return { "Start Date": "date", "End Date": "date", "Probation End Date": "date" };
  if (tab === "Probation Reviews") return { "Joining Date": "date", "Probation End Date": "date" };
  if (tab === "Attendance Exceptions") return { Date: "date" };
  if (tab === "Business Trips") return { From: "date", To: "date" };
  if (tab === "Employee Expenses") return { "Claim Date": "date" };
  if (tab === "eLearning") return { "Due Date": "date" };
  if (tab === "EOS / Gratuity / Final Settlement") return { "Last Working Day": "date" };
  return {};
}

function hrSuggestionsFor(tab: HrTab): Record<string, RecordFieldSuggestion[]> {
  if (tab !== "Self service" && !employeeLinkedTabs.has(tab)) return {};
  const nameField = tab === "Self service" ? "Employee" : "Employee Name";
  const employeeSuggestions = hrEmployees.map(employee => ({
    value: employee["Full Name"],
    label: `${employee["Employee No"]} - ${employee.Department} - ${employee["Job Title"]}`,
    fill: {
      "Employee Code": employee["Employee No"],
      [nameField]: employee["Full Name"],
      Department: employee.Department,
      Owner: employee["Line Manager"] || "HR Manager"
    }
  }));
  const codeSuggestions = hrEmployees.map(employee => ({
    value: employee["Employee No"],
    label: `${employee["Full Name"]} - ${employee.Department}`,
    fill: {
      "Employee Code": employee["Employee No"],
      [nameField]: employee["Full Name"],
      Department: employee.Department,
      Owner: employee["Line Manager"] || "HR Manager"
    }
  }));
  return { [nameField]: employeeSuggestions, "Employee Code": codeSuggestions };
}

function validateHrRecord(tab: HrTab, values: Record<string, string>) {
  if (employeeLinkedTabs.has(tab) && !values["Employee Code"]?.trim() && !values["Employee Name"]?.trim()) return "Select an employee code or employee name.";
  if (tab === "Access Provisioning") {
    const validation = accessProvisioningSchema.safeParse(values);
    if (!validation.success) return validation.error.issues[0]?.message || "Check the access provisioning fields.";
  }
  if (tab === "Self service") {
    if (!values.Employee?.trim() && !values["Employee Code"]?.trim()) return "Select an employee name or employee code.";
    if (!values.Service?.trim()) return "Select a self-service request type.";
    if (!values["Requested change"]?.trim()) return "Enter the requested change before saving.";
  }
  if (tab === "Settings") {
    if (!values.Setting?.trim()) return "Enter the HR setting name.";
    if (!values.Value?.trim()) return "Enter the setting value.";
    if (!values.Category?.trim()) return "Select a setting category.";
    if (!values["Effective date"]?.trim()) return "Select the effective date.";
  }
  return "";
}

function normalizeHrRecord(tab: HrTab, values: Record<string, string>): Record<string, string> {
  if (tab === "Self service") return normalizeSelfServiceRecord(values);
  if (tab === "Settings") return normalizeSettingsRecord(values);
  if (employeeLinkedTabs.has(tab)) return normalizeLinkedEmployeeRecord(tab, values);
  return values;
}

function normalizeLinkedEmployeeRecord(tab: HrTab, values: Record<string, string>): Record<string, string> {
  const employee = findHrEmployee(values["Employee Code"], values["Employee Name"]);
  const primaryColumn = hrViews[tab as Exclude<HrTab, "Dashboard">].columns[0];
  const next = {
    ...values,
    [primaryColumn]: autoNo(tab, values[primaryColumn]),
    "Employee Code": values["Employee Code"] || employee?.["Employee No"] || "",
    "Employee Name": values["Employee Name"] || employee?.["Full Name"] || "",
    Department: values.Department || employee?.Department || ""
  };
  if (tab === "EOS / Gratuity / Final Settlement") next["Final Payable"] = qar(finalSettlementPayable(next));
  return next;
}

function normalizeSelfServiceRecord(values: Record<string, string>): Record<string, string> {
  const employee = findHrEmployee(values["Employee Code"], values.Employee);
  const service = values.Service || "My profile";
  const submitted = formatHrDate(values.Submitted || todayHrIso());
  return {
    ...values,
    Request: !values.Request?.trim() || values.Request === "Auto generated" ? nextSelfServiceRequestNo() : values.Request,
    "Employee Code": values["Employee Code"] || employee?.["Employee No"] || "",
    Employee: values.Employee || employee?.["Full Name"] || "",
    Department: values.Department || employee?.Department || "",
    Service: service,
    Category: values.Category || categoryForSelfService(service),
    "Available action": values["Available action"] || actionForSelfService(service),
    Submitted: submitted,
    "Last update": formatHrDate(values["Last update"] || values.Submitted || todayHrIso()),
    Owner: values.Owner || employee?.["Line Manager"] || "HR Manager",
    Status: values.Status || "Submitted"
  };
}

function normalizeSettingsRecord(values: Record<string, string>): Record<string, string> {
  return {
    ...values,
    Category: values.Category || "Employment",
    "Effective date": formatHrDate(values["Effective date"] || todayHrIso()),
    "Updated by": values["Updated by"] || getDemoSession()?.name || PRESENTATION_USER_NAME,
    "Approval required": values["Approval required"] || "No",
    Status: values.Status || "Draft"
  };
}

function findHrEmployee(employeeCode?: string, employeeName?: string) {
  const code = employeeCode?.trim().toLowerCase();
  const name = employeeName?.trim().toLowerCase();
  return hrEmployees.find(employee => employee["Employee No"].toLowerCase() === code || employee["Full Name"].toLowerCase() === name);
}

function categoryForSelfService(service: string) {
  const key = service.toLowerCase();
  if (key.includes("leave")) return "Leave";
  if (key.includes("pay")) return "Payroll";
  if (key.includes("attendance")) return "Attendance";
  if (key.includes("document")) return "Documents";
  if (key.includes("loan")) return "Loans";
  if (key.includes("letter")) return "Letters";
  return "Profile";
}

function actionForSelfService(service: string) {
  const key = service.toLowerCase();
  if (key.includes("pay")) return "Download";
  if (key.includes("attendance")) return "Submit correction";
  if (key.includes("leave")) return "Apply leave";
  if (key.includes("document")) return "Request document";
  if (key.includes("loan")) return "Submit request";
  if (key.includes("letter")) return "Generate letter";
  return "View / update";
}

function nextSelfServiceRequestNo() {
  return `ESS-${new Date().getFullYear()}-${String(Date.now() % 10000).padStart(4, "0")}`;
}

function autoNo(tab: HrTab, value?: string) {
  if (value?.trim() && value !== "Auto generated") return value;
  const prefixes: Partial<Record<HrTab, string>> = {
    Contracts: "CON",
    "Probation Reviews": "PRB",
    "Access Provisioning": "ACC",
    "Attendance Exceptions": "AEX",
    "Business Trips": "BT",
    "Employee Expenses": "EXP",
    "Performance/Appraisals": "APR",
    eLearning: "ELN",
    "EOS / Gratuity / Final Settlement": "EOS",
    "Payroll Accounting Draft Journal": "PAY-JRN"
  };
  return `${prefixes[tab] || "HR"}-${new Date().getFullYear()}-${String(Date.now() % 10000).padStart(4, "0")}`;
}

function formatHrDate(value: string) {
  const date = parseHrDate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function parseHrDate(value?: string) {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function isHrDateColumn(column: string) {
  const key = column.toLowerCase();
  return key.includes("date") || key.includes("expiry") || ["from", "to", "submitted", "last update"].includes(key);
}

function dateValue(value = "") {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isStatusLikeColumn(column: string) {
  const key = column.toLowerCase();
  return key.includes("status") || key.includes("stage") || key.includes("access") || key.includes("approval");
}

function todayHrIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function HRDashboard({ onNavigate }: { onNavigate: (tab: HrTab) => void }) {
  return <div className="space-y-4">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{kpis.map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => onNavigate(item.label.includes("payroll") ? "Payroll" : item.label.includes("leave") ? "Leave" : item.label.includes("approval") ? "Approvals" : item.label.includes("document") ? "Documents" : "Employees")} className="rounded-2xl border bg-[var(--panel)] p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-medtech-navy/20"><div className="flex items-start justify-between"><span className={cn("rounded-xl p-2.5", toneClasses[item.tone])}><Icon className="h-5 w-5" /></span><ChevronRight className="h-4 w-4 text-slate-300" /></div><div className="mt-4 text-[11px] font-medium text-[var(--muted)]">{item.label}</div><div className="mt-1 text-xl font-bold tabular">{item.value}</div><div className="mt-2 text-[10px] text-slate-400">{item.note}</div></button>; })}</section>
    <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
      <Panel title="Headcount by department" action="Employees" onAction={() => onNavigate("Employees")}><div className="space-y-3 pt-2">{hrDepartmentHeadcount.map(([name, value]) => <div key={name} className="grid grid-cols-[90px_1fr_24px] items-center gap-2 text-[11px]"><span className="truncate text-[var(--muted)]">{name}</span><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-medtech-red" style={{ width: `${(value / 28) * 100}%` }} /></div><b>{value}</b></div>)}</div></Panel>
      <Panel title="Attendance trend" subtitle="Monthly attendance percentage"><TrendBars values={hrAttendanceTrend} min={88} suffix="%" tone="bg-medtech-red" /></Panel>
      <Panel title="Payroll cost trend" subtitle="Gross monthly payroll - QAR"><TrendBars values={hrPayrollTrend} min={1} suffix="M" tone="bg-violet-500" /></Panel>
    </section>
    <section className="grid gap-4 xl:grid-cols-[1fr_1.15fr_1.15fr]">
      <Panel title="Recruitment funnel" action="Recruitment" onAction={() => onNavigate("Recruitment")}><div className="space-y-2 pt-2">{[["Applications",84,"100%"],["Screening",38,"74%"],["Interview",16,"52%"],["Offer",6,"31%"],["Hired",4,"22%"]].map(([stage,count,width]) => <div key={String(stage)}><div className="mb-1 flex text-[11px]"><span>{stage}</span><b className="ml-auto">{count}</b></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-medtech-red" style={{ width: String(width) }} /></div></div>)}</div></Panel>
      <Panel title="Upcoming expiries" subtitle="Compliance documents - next 30 days" action="Documents" onAction={() => onNavigate("Documents")}><div className="divide-y">{[["Naveen Kumar","Qatar ID","02 Jul","12 days"],["Omar Nasser","Visa","28 Jun","8 days"],["Aisha Rahman","Visa","08 Aug","49 days"],["Fahad Al-Kuwari","Contract","31 Jul","41 days"]].map(item => <div key={item.join()} className="grid grid-cols-[1fr_80px_54px] gap-2 py-2.5 text-[11px]"><span><b className="block">{item[0]}</b><span className="text-slate-400">{item[1]}</span></span><span className="text-[var(--muted)]">{item[2]}</span><span className="text-right font-semibold text-amber-600">{item[3]}</span></div>)}</div></Panel>
      <Panel title="Recent HR activity" action="Audit trail" onAction={() => onNavigate("Approvals")}><div className="space-y-4 pt-1">{[[CheckCircle2,"Leave request approved","LV-2026-00128 - Naveen Kumar","12m"],[UserPlus,"Employee onboarding started","Service Engineer - REC-2026-0042","1h"],[FileText,"Employment contract uploaded","Aisha Rahman - Version 1.1","3h"],[Landmark,"June payroll generated","126 employees - QAR 1.24M","5h"]].map(([Icon,title,note,time]) => { const ActivityIcon = Icon as typeof CheckCircle2; return <div key={String(title)} className="flex gap-3"><span className="rounded-lg bg-[var(--navy-tint)] p-2 text-medtech-red dark:bg-[var(--elevated)]"><ActivityIcon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><b className="block truncate text-[11px]">{String(title)}</b><span className="block truncate text-[10px] text-slate-400">{String(note)}</span></span><span className="text-[10px] text-slate-400">{String(time)}</span></div>; })}</div></Panel>
    </section>
    <section className="rounded-2xl border bg-[var(--panel)] p-5 shadow-soft"><div className="mb-4 flex items-center"><div><h2 className="text-sm font-bold">Leave calendar</h2><p className="mt-0.5 text-[10px] text-slate-400">Team availability - 20-30 June 2026</p></div><Button variant="ghost" className="ml-auto" onClick={() => onNavigate("Leave")}>Open leave planner <ChevronRight className="h-4 w-4" /></Button></div><div className="grid min-w-[720px] grid-cols-11 gap-1 overflow-x-auto">{Array.from({ length: 11 }, (_, index) => { const day = 20 + index; const onLeave = [20,21,22,23,24,26,29].includes(day); return <div key={day} className={cn("rounded-xl border p-2 text-center", onLeave && "border-medtech-navy/20 bg-[var(--navy-tint)] dark:border-medtech-navy/50 dark:bg-[var(--elevated)]")}><div className="text-[10px] text-slate-400">{["Sat","Sun","Mon","Tue","Wed","Thu","Fri"][index % 7]}</div><div className="mt-1 font-bold">{day}</div><div className="mt-1 text-[10px] text-medtech-navy">{onLeave ? `${1 + index % 3} leave` : "Available"}</div></div>; })}</div></section>
  </div>;
}

function Panel({ title, subtitle, action, onAction, children }: { title: string; subtitle?: string; action?: string; onAction?: () => void; children: React.ReactNode }) { return <div className="rounded-2xl border bg-[var(--panel)] p-5 shadow-soft"><div className="mb-3 flex items-start"><div><h2 className="text-sm font-bold">{title}</h2>{subtitle && <p className="mt-1 text-[10px] text-slate-400">{subtitle}</p>}</div>{action && <button onClick={onAction} className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-medtech-red">{action}<ChevronRight className="h-3 w-3" /></button>}</div>{children}</div>; }

function TrendBars({ values, min, suffix, tone }: { values: number[]; min: number; suffix: string; tone: string }) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const max = Math.max(...values);
  return <div className="flex h-52 items-end gap-2 pt-4">{values.map((value, index) => <div key={months[index]} className="flex flex-1 flex-col items-center gap-2"><span className="text-[10px] font-semibold text-[var(--muted)]">{value}{suffix}</span><div className="flex h-32 w-full items-end rounded-lg bg-slate-100 dark:bg-slate-800"><div className={cn("w-full rounded-lg", tone)} style={{ height: `${Math.max(12, ((value - min) / Math.max(0.01, max - min)) * 100)}%` }} /></div><span className="text-[10px] text-slate-400">{months[index]}</span></div>)}</div>;
}

function EmployeeDrawer({ employee, onClose, onEdit }: { employee: DemoRecord; onClose: () => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "Core Employment Details": true });
  const toggle = (section: string) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }));

  const sectionIcons = [BriefcaseBusiness, UsersRound, FolderLock, FileText, CalendarDays, CircleDollarSign, Landmark, ShieldCheck];
  const sections: Array<{ title: string; icon: typeof BriefcaseBusiness; fields: readonly string[] }> = employeeProfileSections.map((section, index) => ({ ...section, icon: sectionIcons[index] ?? FileText }));

  const downloadEmployeePdf = async () => {
    const { generateBrandedPdf } = await import("@/lib/pdf/generator");
    const name = employee["Full Name"] || "Employee";
    const documentNumber = name.replace(/[^a-z0-9-]+/gi, "-");
    const metadata = Object.entries(employee).filter(([key]) => !key.startsWith("__")).map(([key, value]) => [key, value] as [string, string]);
    const result = await generateBrandedPdf({ template: "report" as PdfTemplate, documentNumber, date: new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date()), partyLabel: "Employee", partyName: name, subject: "Employee profile", metadata, terms: ["Generated from the controlled MedTech HR workspace.", "Verify values and approvals before external issue."], preparedBy: getDemoSession()?.name || PRESENTATION_USER_NAME, approvedBy: "HR Manager" }, "blob");
    if (!(result instanceof Blob)) return;
    downloadBlob(result, `${documentNumber}-employee-profile.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-[2px]" onMouseDown={onClose}>
      <aside role="dialog" aria-label={`Employee profile ${employee["Full Name"]}`} onMouseDown={event => event.stopPropagation()} className="ml-auto flex h-full w-full max-w-2xl flex-col bg-[var(--panel)] shadow-2xl">
        {/* -- Header with gradient background -- */}
        <div className="shrink-0 border-b bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50/30 p-6 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-medtech-red to-medtech-navy text-xl font-bold text-white shadow-lg shadow-medtech-red/20">
              {(employee["Full Name"] || "A").split(" ").slice(0, 2).map(p => p[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight">{employee["Full Name"]}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{employee["Job Title"]} - {employee.Department}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge>{employee.Status}</StatusBadge>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">{employee["Employee No"]}</span>
              </div>
            </div>
            <button aria-label="Close employee profile" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/80 hover:text-slate-600 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
          </div>

          {/* -- Quick-info metric cards -- */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-medtech-navy/10 bg-white/80 p-3 shadow-sm dark:border-medtech-navy/50 dark:bg-slate-800/60">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400"><CircleDollarSign className="h-3 w-3" />Base Salary</div>
              <div className="mt-1 text-sm font-bold text-medtech-navy dark:text-red-300">{employee["Basic Salary"] || "-"}</div>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white/80 p-3 shadow-sm dark:border-blue-900/50 dark:bg-slate-800/60">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400"><BriefcaseBusiness className="h-3 w-3" />Department</div>
              <div className="mt-1 text-sm font-bold">{employee.Department || "-"}</div>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white/80 p-3 shadow-sm dark:border-violet-900/50 dark:bg-slate-800/60">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400"><CalendarDays className="h-3 w-3" />Date Joined</div>
              <div className="mt-1 text-sm font-bold">{employee["Date Joined"] || "-"}</div>
            </div>
          </div>

          {/* -- Action buttons -- */}
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={onEdit}><FileText className="h-4 w-4" /> Edit profile</Button>
            <Button variant="secondary" onClick={downloadEmployeePdf}><Download className="h-4 w-4" /> Download PDF</Button>
          </div>
        </div>

        {/* -- Accordion sections -- */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-4 text-[11px] text-slate-400">Select a section to view full employee details. Click the row to expand or collapse.</p>
          <div className="space-y-2.5">
            {sections.map(section => {
              const Icon = section.icon;
              const isOpen = !!expanded[section.title];
              const filledCount = section.fields.filter(f => employee[f] && employee[f] !== "-").length;
              return (
                <div key={section.title} className={cn("overflow-hidden rounded-xl border transition-all", isOpen ? "border-medtech-navy/20 shadow-sm dark:border-medtech-navy/60" : "hover:border-slate-300 dark:hover:border-slate-700")}>
                  <button onClick={() => toggle(section.title)} className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors", isOpen ? "bg-[var(--navy-tint)] dark:bg-[var(--elevated)]" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40")}>
                    <span className={cn("rounded-lg p-2 transition-colors", isOpen ? "bg-[var(--red-tint)] text-medtech-navy dark:bg-[var(--elevated)] dark:text-red-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold">{section.title}</span>
                      <span className="ml-2 text-[10px] text-slate-400">{filledCount}/{section.fields.length} fields</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="divide-y border-t bg-white/60 dark:bg-slate-900/30">
                      {section.fields.map(field => (
                        <div key={field} className="grid grid-cols-[170px_1fr] gap-3 px-5 py-3 text-xs">
                          <span className="font-medium text-slate-400">{field}</span>
                          <span className="font-semibold text-[var(--text)]">{employee[field] || <span className="font-normal italic text-slate-300 dark:text-slate-600">Not provided</span>}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function EmployeeOnboarding({ open, employeeNumber, record, onClose, onComplete }: { open: boolean; employeeNumber: string; record?: DemoRecord | null; onClose: () => void; onComplete: (values: Record<string, string>) => void }) {
  const steps = ["Personal", "Employment", "Residency", "Contact", "Leave & travel", "Bank & education", "Documents", "Compensation", "Account"];
  const [step, setStep] = useState(0); const [values, setValues] = useState<Record<string,string>>({}); const [error, setError] = useState("");
  useEffect(() => { if (open) { setStep(0); setError(""); setValues(record ? Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith("__"))) : { "Employee Code": employeeNumber, "Employee No": employeeNumber, "Employee Category": "Staff", Status: "Active", Company: "MedTech Corporation Trading W.L.L.", "Working Company Name": "MedTech Corporation Trading W.L.L.", "Annual Leave Balance": "30", "Salary Pay Type": "Bank Transfer" }); } }, [open, employeeNumber, record]);
  if (!open) return null;
  const stepFields: Array<Array<[string,string]>> = [
    [["First Name","First name"],["Last Name","Last name"],["Full Name","Full name"],["Date of Birth","Date of birth"],["Gender","Gender"],["Marital Status","Marital status"],["Family Status (Yes/No)","Family status"],["No. of Dependents","Dependents"],["Nationality","Nationality"],["Blood Group","Blood group"]],
    [["Employee Code","Employee code"],["Employee Category","Employee category"],["Work Shift","Work shift"],["Company","Company"],["Department","Department"],["Designation","Designation"],["Grade/Band","Grade / band"],["Joining Date","Joining date"],["Reporting Manager Employee Code/Name","Reporting manager"],["Business Unit","Business unit"],["Working Company Name","Working company"],["Cost Centre","Cost centre"],["Hire Type","Hire type"],["Confirmation Date","Confirmation date"],["ESB Date","ESB date"]],
    [["Sponsor Name","Sponsor name"],["WPS Sponsor","WPS sponsor"],["RP/ID Number","RP / ID number"],["RP/ID Profession","RP / ID profession"],["QID Expiry Date","QID expiry date"],["Visa Type","Visa type"],["Work Permit No.","Work permit no."],["Work Permit Issue Date","Work permit issue date"],["Work Permit Expiry Date","Work permit expiry date"],["Office File No.","Office file no."],["Access Card No.","Access card no."]],
    [["Office Mobile No.","Office mobile"],["Personal Mobile No.","Personal mobile"],["E-Mail ID (Work)","Work email"],["Local Building/Villa #","Local building / villa"],["Local Street #","Local street"],["Local Zone #","Local zone"],["International Apartment","International apartment"],["International Building","International building"],["International Floor","International floor"],["International Street","International street"],["International State","International state"],["International Country","International country"],["International Zip Code","International zip code"],["Emergency Contact Name","Emergency contact name"],["Emergency Contact Relationship","Emergency contact relationship"],["Emergency Contact Mobile No.","Emergency contact mobile"]],
    [["Leave Policy","Leave policy"],["Last Rejoin Date","Last rejoin date"],["Annual Leave Balance (As on Date)","Leave balance as-on date"],["Annual Leave Balance","Annual leave balance"],["LOP Days (Loss of Pay)","LOP days"],["Travel Sector","Travel sector"],["Travel Cost","Travel cost"],["No. of Tickets - Employee (Year)","Employee tickets / year"],["Ticket Balance (%)","Ticket balance %"],["No. of Tickets - Family","Family tickets"],["Company Accommodation","Company accommodation"],["Company Transportation","Company transportation"],["Overtime Eligible","Overtime eligible"],["Company Food","Company food"],["Company Fuel Card","Company fuel card"]],
    [["Salary Pay Type","Salary pay type"],["Bank Code","Bank code / name"],["IBAN No.","IBAN"],["Account No.","Account number"],["Highest Education Qualification","Highest qualification"],["Year of Passing","Year of passing"]],
    [["Passport No.","Passport no."],["Passport Place of Issue","Passport place of issue"],["Passport Issue Date","Passport issue date"],["Passport Expiry Date","Passport expiry date"],["License Type","License type"],["Driving License No.","Driving license no."],["Driving License Expiry Date","Driving license expiry"],["Insurance Card No.","Insurance card no."],["Insurance Issue Date","Insurance issue date"],["Insurance Expiry Date","Insurance expiry date"]],
    [["Basic","Basic salary"],["HRA","Housing allowance (HRA)"],["Food Allowance","Food allowance"],["Mobile Allowance","Mobile allowance"],["Special Allowance","Special allowance"],["Overtime Amount","Overtime amount"],["Total","Total salary"]],
    [["Approval route","Approval route"],["Approval note","Approval note"],["Portal role","Portal role"],["Account email","Account email"],["Welcome message","Welcome message"]]
  ];
  const complete = () => { const normalized = normalizeEmployeeRow({ ...values, "Employee Code": values["Employee Code"] || employeeNumber, "E-Mail ID (Work)": values["E-Mail ID (Work)"] || values["Account email"], "Joining Date": values["Joining Date"] || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) }); const validation = employeeOnboardingSchema.safeParse({ ...normalized, "Account email": values["Account email"] }); if (!validation.success) { setError(validation.error.issues[0]?.message || "Check the required employee information."); setStep(0); return; } onComplete({ ...normalized, "Approval route": values["Approval route"] || "Department Manager -> HR Manager", "Approval note": values["Approval note"] || "", "Portal role": values["Portal role"] || "Employee", "Account email": values["Account email"] || normalized["Email Address"], "Welcome message": values["Welcome message"] || "Welcome to MedTech ERP" }); };
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
    <div role="dialog" aria-label="Employee onboarding" className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-2xl">
      <div className="flex items-center border-b p-5"><div><h2 className="text-lg font-bold">{record ? "Edit employee" : "Employee onboarding"}</h2><p className="mt-1 text-[11px] text-slate-400">{record ? "Update the controlled employee profile and retain its audit history." : "Create the employee record, approvals, document folder and portal account."}</p></div><button aria-label="Close onboarding" onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="border-b px-5 py-4"><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">{steps.map((name,index) => <div key={name} className="text-center"><div className={cn("mx-auto grid h-8 w-8 place-items-center rounded-full border text-xs font-bold", index < step ? "border-medtech-red bg-medtech-red text-white" : index === step ? "border-medtech-red text-medtech-navy" : "text-slate-400")}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</div><div className="mt-1 hidden text-[9px] font-medium sm:block">{name}</div></div>)}</div></div>
      {error && <div role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div>}
      <div className="max-h-[55vh] overflow-y-auto bg-[var(--elevated)]/35 p-5"><FormSection title={`${steps[step]} details`} description="Required fields show validation under the input." className="rounded-xl shadow-none">{stepFields[step].map(([field,label]) => { const required = ["Employee Code","Full Name","E-Mail ID (Work)","Department","Designation"].includes(field); return <label key={field}><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">{label}</span><input required={required} type={field.includes("E-Mail") || field === "Account email" ? "email" : "text"} value={values[field] || ""} onChange={event => { setError(""); setValues(current => ({ ...current, [field]: event.target.value })); }} placeholder={`Enter ${label.toLowerCase()}`} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm outline-none focus:border-medtech-red" /><p className="mt-1 text-[11px] text-[var(--muted)]">{required ? "Required before onboarding can be completed." : "Optional profile detail."}</p></label>; })}</FormSection></div>
      <div className="sticky bottom-0 flex items-center border-t bg-slate-50/95 p-4 backdrop-blur dark:bg-slate-900/90"><div className="text-xs text-slate-400">Step {step + 1} of {steps.length} - {steps[step]}</div><div className="ml-auto flex gap-2">{step > 0 && <Button variant="secondary" onClick={() => setStep(value => value - 1)}>Back</Button>}{step < steps.length - 1 ? <Button onClick={() => setStep(value => value + 1)}>Continue <ChevronRight className="h-4 w-4" /></Button> : <Button onClick={complete}><CheckCircle2 className="h-4 w-4" /> {record ? "Save changes" : "Complete onboarding"}</Button>}</div></div>
    </div>
  </div>;
}

function hrPdfTemplate(tab: HrTab): PdfTemplate {
  if (tab === "Payroll") return "payslip";
  if (tab === "Recruitment") return "offer_letter";
  if (tab === "Leave") return "leave_approval";
  if (tab === "EOS / Gratuity / Final Settlement") return "gratuity_statement";
  if (tab === "Documents" || tab === "Self service") return "employee_letter";
  if (tab === "Approvals") return "appointment_letter";
  return "report";
}


