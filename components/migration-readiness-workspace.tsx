"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileDown, Upload, RotateCcw, Save } from "lucide-react";
import { Button, StatusBadge } from "@/components/ui";
import { useAuditLog } from "@/lib/audit-store";
import { exportToExcel, exportWorkbookToExcel, parseExcelRows } from "@/lib/export/excel";
import {
  getImportTarget,
  historyEntry,
  importStorageKey,
  importTargets,
  inferImportTarget,
  reconciliationColumns,
  reconciliationStatuses,
  seedReconciliationRows,
  seedUatRows,
  uatColumns,
  uatStatuses,
  validateImportRows,
  type ImportErrorRow,
  type ImportHistoryEntry,
  type ImportTarget,
  type ImportTargetKey,
  type ReconciliationRow,
  type UatRow
} from "@/lib/migration-readiness";

type View = "import" | "reconciliation" | "uat";
type Review = { file: string; sheet: string; target: ImportTarget; total: number; valid: Record<string, string>[]; errors: ImportErrorRow[]; duplicateCount: number };

const HISTORY_KEY = "medtech-demo:readiness-import-history:v1";
const RECON_KEY = "medtech-demo:readiness-reconciliation:v1";
const UAT_KEY = "medtech-demo:readiness-uat:v1";

export function MigrationReadinessWorkspace({ view }: { view: View }) {
  if (view === "reconciliation") return <ReconciliationWorkspace />;
  if (view === "uat") return <UatWorkspace />;
  return <DataImportWorkspace />;
}

function DataImportWorkspace() {
  const audit = useAuditLog();
  const fileRef = useRef<HTMLInputElement>(null);
  const [targetKey, setTargetKey] = useState<ImportTargetKey | "auto">("auto");
  const [review, setReview] = useState<Review | null>(null);
  const historySeed = useMemo<ImportHistoryEntry[]>(() => [], []);
  const [history, setHistory] = useLocalRows<ImportHistoryEntry>(HISTORY_KEY, historySeed);
  const [message, setMessage] = useState("");

  const currentTarget = useMemo(() => targetKey === "auto" ? null : getImportTarget(targetKey), [targetKey]);
  const showMessage = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 2600); };

  const upload = async (file?: File) => {
    if (!file) return;
    let parsed: Awaited<ReturnType<typeof parseExcelRows>>;
    try { parsed = await parseExcelRows(file); } catch (error) { showMessage(error instanceof Error ? error.message : "Import failed"); return; }
    if (!parsed.hasWorksheet) { showMessage("Workbook has no worksheet"); return; }
    const target = currentTarget ?? inferImportTarget(parsed.headers, parsed.sheetName, file.name);
    const stored = readLocal<Record<string, string>[]>(importStorageKey(target.key), []);
    const result = validateImportRows(target, parsed.rows, stored.map(row => row[target.keyColumn] ?? ""));
    setReview({ file: file.name, sheet: parsed.sheetName, target, total: parsed.total, ...result });
    audit.add({ action: "VALIDATE IMPORT", module: "Administration", record: target.label, details: `${result.valid.length} valid and ${result.errors.length} error rows checked locally from ${file.name}` });
    if (fileRef.current) fileRef.current.value = "";
  };

  const importValid = () => {
    if (!review || !review.valid.length) return;
    const key = importStorageKey(review.target.key);
    writeLocal(key, [...review.valid, ...readLocal<Record<string, string>[]>(key, [])]);
    const entry = historyEntry({ target: review.target.label, file: review.file, total: review.total, valid: review.valid.length, errors: review.errors.length, imported: review.valid.length });
    setHistory(current => [entry, ...current].slice(0, 50));
    updateReconciliationFromImport(review);
    audit.add({ action: "IMPORT", module: "Administration", record: review.target.label, details: `${review.valid.length} valid local rows imported from ${review.file}; Employee Master was not changed` });
    showMessage(`${review.valid.length} valid rows imported locally`);
  };

  const exportErrors = async () => {
    if (!review?.errors.length) return;
    await exportToExcel(review.errors.map(error => ({ Row: error.row, Target: error.target, Error: error.message, ...error.data })), `${slug(review.target.label)}-errors`, "Errors");
    audit.add({ action: "EXPORT", module: "Administration", record: "Import error report", details: `${review.errors.length} local validation errors exported` });
  };

  const exportTemplate = async () => {
    const target = currentTarget ?? importTargets[0];
    await exportToExcel([Object.fromEntries(target.columns.map(column => [column, ""]))], `${slug(target.label)}-template`, target.label);
    audit.add({ action: "EXPORT", module: "Administration", record: `${target.label} template`, details: "Local import template exported" });
  };

  return <ReadinessShell title="Data Import Center" subtitle="Local Excel upload, validation, error export, import history and audit logging.">
    <input ref={fileRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={event => upload(event.target.files?.[0])} />
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3.5">
      <select value={targetKey} onChange={event => setTargetKey(event.target.value as ImportTargetKey | "auto")} className="h-9 min-w-[260px] rounded-lg border bg-[var(--panel)] px-3 text-sm outline-none">
        <option value="auto">Auto detect target</option>
        {importTargets.map(target => <option key={target.key} value={target.key}>{target.label}</option>)}
      </select>
      <Button onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload Excel</Button>
      <Button variant="secondary" onClick={exportTemplate}><FileDown className="h-4 w-4" /> Template</Button>
      <span className="text-xs text-[var(--muted)]">Employee imports here accept extension data only.</span>
    </div>

    {review && <div className="grid gap-4 border-b p-5 lg:grid-cols-4">
      <Metric label="Detected Target" value={review.target.label} />
      <Metric label="Valid Rows" value={String(review.valid.length)} />
      <Metric label="Error Rows" value={String(review.errors.length)} />
      <Metric label="Duplicates" value={String(review.duplicateCount)} />
      <div className="lg:col-span-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <span>{review.file} / {review.sheet || "Sheet 1"}</span>
        <Button disabled={!review.valid.length} onClick={importValid}><Save className="h-4 w-4" /> Import valid rows</Button>
        <Button variant="secondary" disabled={!review.errors.length} onClick={exportErrors}><Download className="h-4 w-4" /> Export error report</Button>
      </div>
    </div>}

    {review && <div className="grid gap-4 p-5 xl:grid-cols-2">
      <PreviewTable title="Valid Rows" rows={review.valid} columns={review.target.columns} />
      <PreviewTable title="Error Rows" rows={review.errors.map(error => ({ Row: String(error.row), Error: error.message, ...error.data }))} columns={["Row", "Error", ...review.target.columns]} />
    </div>}

    <div className="border-t p-5">
      <div className="mb-3 text-sm font-semibold">Import History</div>
      <PreviewTable rows={history} columns={["Time", "Target", "File", "Total Rows", "Valid Rows", "Error Rows", "Imported Rows"]} />
    </div>
    {message && <Toast>{message}</Toast>}
  </ReadinessShell>;
}

function ReconciliationWorkspace() {
  const audit = useAuditLog();
  const seedRows = useMemo(() => seedReconciliationRows(), []);
  const [rows, setRows] = useLocalRows<ReconciliationRow>(RECON_KEY, seedRows);
  const update = (id: string, column: keyof ReconciliationRow, value: string) => setRows(current => current.map(row => row.__id === id ? { ...row, [column]: value } : row));
  const exportRows = async () => {
    await exportToExcel(stripIds(rows), "migration-reconciliation", "Reconciliation");
    audit.add({ action: "EXPORT", module: "Administration", record: "Migration reconciliation", details: `${rows.length} local readiness rows exported` });
  };
  return <ReadinessShell title="Migration Reconciliation" subtitle="Local migration control by dataset, count, duplicate, owner and acceptance status.">
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3.5">
      <Button variant="secondary" onClick={exportRows}><FileDown className="h-4 w-4" /> Export Excel</Button>
      <Button variant="secondary" onClick={() => setRows(seedReconciliationRows())}><RotateCcw className="h-4 w-4" /> Reset</Button>
    </div>
  <EditableTable rows={rows} columns={reconciliationColumns as unknown as string[]} statusColumn="Reconciliation Status" statuses={reconciliationStatuses} onChange={update as ChangeHandler} />
  </ReadinessShell>;
}

function UatWorkspace() {
  const audit = useAuditLog();
  const seedRows = useMemo(() => seedUatRows(), []);
  const [rows, setRows] = useLocalRows<UatRow>(UAT_KEY, seedRows);
  const update = (id: string, column: keyof UatRow, value: string) => setRows(current => current.map(row => row.__id === id ? { ...row, [column]: value } : row));
  const exportRows = async () => {
    await exportWorkbookToExcel([{ name: "UAT Tracker", rows: stripIds(rows) }], "uat-acceptance-tracker");
    audit.add({ action: "EXPORT", module: "Administration", record: "UAT acceptance tracker", details: `${rows.length} local UAT rows exported` });
  };
  return <ReadinessShell title="UAT / Acceptance Tracker" subtitle="Acceptance checklist and end-to-end test cases for go-live readiness.">
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3.5">
      <Button variant="secondary" onClick={exportRows}><FileDown className="h-4 w-4" /> Export Excel</Button>
      <Button variant="secondary" onClick={() => setRows(seedUatRows())}><RotateCcw className="h-4 w-4" /> Reset</Button>
    </div>
    <EditableTable rows={rows} columns={uatColumns as unknown as string[]} statusColumn="Status" statuses={uatStatuses} onChange={update as ChangeHandler} />
  </ReadinessShell>;
}

function ReadinessShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="bg-[var(--panel)]">
    <div className="border-b px-5 py-4">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>
    </div>
    {children}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/40">
    <div className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{label}</div>
    <div className="mt-2 text-lg font-bold">{value}</div>
  </div>;
}

function PreviewTable({ title, rows, columns }: { title?: string; rows: unknown[]; columns: string[] }) {
  return <div className="min-w-0">
    {title && <div className="mb-2 text-sm font-semibold">{title}</div>}
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead><tr className="border-b bg-slate-50 dark:bg-slate-900/40">{columns.map(column => <th key={column} className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{column}</th>)}</tr></thead>
        <tbody className="divide-y">{rows.slice(0, 8).map((row, index) => <tr key={String(getValue(row, "__id") || index)}>{columns.map(column => <td key={column} className="max-w-[240px] truncate px-3 py-2 text-xs text-[var(--muted)]">{String(getValue(row, column))}</td>)}</tr>)}
        {!rows.length && <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-xs text-slate-400">No rows</td></tr>}</tbody>
      </table>
    </div>
  </div>;
}

type ChangeHandler = (id: string, column: string, value: string) => void;

function EditableTable<T extends { __id: string }>({ rows, columns, statusColumn, statuses, onChange }: { rows: T[]; columns: string[]; statusColumn: string; statuses: string[]; onChange: ChangeHandler }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[1200px] border-collapse text-left">
      <thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">{columns.map(column => <th key={column} className="px-3 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{column}</th>)}</tr></thead>
      <tbody className="divide-y">{rows.map(row => <tr key={row.__id}>{columns.map(column => <td key={column} className="px-3 py-2 align-top text-xs">
        {column === statusColumn ? <select value={String(getValue(row, column))} onChange={event => onChange(row.__id, column, event.target.value)} className="h-8 rounded-lg border bg-[var(--panel)] px-2 text-xs outline-none">{statuses.map(status => <option key={status}>{status}</option>)}</select> :
          column === "Reconciliation Status" || column === "Status" ? <StatusBadge>{String(getValue(row, column))}</StatusBadge> :
          <input value={String(getValue(row, column))} onChange={event => onChange(row.__id, column, event.target.value)} className="h-8 min-w-[130px] rounded-lg border bg-[var(--panel)] px-2 text-xs outline-none focus:border-medtech-red" />}
      </td>)}</tr>)}</tbody>
    </table>
  </div>;
}

function Toast({ children }: { children: React.ReactNode }) {
  return <div role="status" className="fixed bottom-5 right-5 z-[100] rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel">{children}</div>;
}

function useLocalRows<T>(key: string, seed: T[]) {
  const [rows, setRows] = useState<T[]>(seed);
  const [ready, setReady] = useState(false);
  useEffect(() => { setRows(readLocal(key, seed)); setReady(true); }, [key, seed]);
  useEffect(() => { if (ready) writeLocal(key, rows); }, [key, ready, rows]);
  return [rows, setRows] as const;
}

function readLocal<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

function writeLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function stripIds<T extends { __id: string }>(rows: T[]) {
  return rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "__id")));
}

function getValue(row: unknown, column: string) {
  return (row as Record<string, unknown>)[column] ?? "";
}

function updateReconciliationFromImport(review: Review) {
  const rows = readLocal<ReconciliationRow[]>(RECON_KEY, seedReconciliationRows());
  writeLocal(RECON_KEY, rows.map(row => row["Dataset Name"] === review.target.label ? {
    ...row,
    "Source Count": String(review.total),
    "Imported Count": String(Number(row["Imported Count"] || 0) + review.valid.length),
    "Error Count": String(review.errors.length),
    "Duplicate Count": String(review.duplicateCount),
    "Reconciliation Status": review.errors.length ? "In Progress" : "Reconciled"
  } : row));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

